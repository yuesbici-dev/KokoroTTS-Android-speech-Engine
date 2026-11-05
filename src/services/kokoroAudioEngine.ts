import { KokoroVoice, SentenceItem } from '../types/tts';
import { KOKORO_VOICES } from '../data/kokoroData';
import { AudioNormalizer, LoudnessMetrics } from './audioNormalizer';

export type EngineEventCallback = {
  onSentenceStart?: (index: number, sentence: SentenceItem) => void;
  onPlaybackEnd?: () => void;
  onStateChange?: (isPlaying: boolean, isPaused: boolean) => void;
  onLoudnessChange?: (metrics: LoudnessMetrics) => void;
  onError?: (err: string) => void;
};

// Simplified G2P (Grapheme-to-Phoneme) mapper for Kokoro's IPA token display
export function textToKokoroIpa(text: string): string {
  const dictionary: Record<string, string> = {
    kokoro: 'kóʊkəɹoʊ',
    speech: 'spitʃ',
    engine: 'ˈɛndʒɪn',
    android: 'ˈænˌdɹɔɪd',
    offline: 'ˈɔfˌlaɪn',
    jetpack: 'ˈdʒɛtˌpæk',
    compose: 'kəmˈpoʊz',
    voice: 'vɔɪs',
    models: 'ˈmɑdəlz',
    neural: 'ˈnʊɹəl',
    diffusion: 'dɪˈfjuʒən',
    storage: 'ˈstɔɹɪdʒ',
    playback: 'ˈpleɪˌbæk',
    natural: 'ˈnætʃəɹəl',
    quantum: 'ˈkwɑntəm',
    hello: 'həˈloʊ',
    world: 'wɜrld',
  };

  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .split(/\s+/)
    .map((word) => dictionary[word] || word.split('').join('·'))
    .join(' ');
}

export class KokoroAudioEngine {
  private static instance: KokoroAudioEngine;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private currentAudioBuffer: AudioBuffer | null = null;
  private rawAudioBuffer: AudioBuffer | null = null;

  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private sentences: SentenceItem[] = [];
  private currentSentenceIdx: number = 0;
  private callbacks: EngineEventCallback = {};
  private speed: number = 1.0;
  private pitch: number = 1.0;
  private selectedVoice: KokoroVoice = KOKORO_VOICES[0];
  private normalizeVolume: boolean = true;
  private currentMetrics: LoudnessMetrics | null = null;

  // Track playback time
  private playbackStartTime: number = 0;
  private pauseOffsetTime: number = 0;
  private currentBufferDuration: number = 0;
  private sentenceEndTimer: number | null = null;

  // Audio Cache for real Kokoro WAVs
  private audioCache: Map<string, AudioBuffer> = new Map();

  private constructor() {
    this.initAudioContext();
  }

  public static getInstance(): KokoroAudioEngine {
    if (!KokoroAudioEngine.instance) {
      KokoroAudioEngine.instance = new KokoroAudioEngine();
    }
    return KokoroAudioEngine.instance;
  }

  private initAudioContext() {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }
    } catch {
      // AudioContext fallback
    }
  }

  public setCallbacks(cbs: EngineEventCallback) {
    this.callbacks = cbs;
  }

  public setVoice(voice: KokoroVoice) {
    this.selectedVoice = voice;
  }

  public setSpeed(speed: number) {
    this.speed = speed;
    if (this.currentSourceNode) {
      this.currentSourceNode.playbackRate.value = speed;
    }
  }

  public setPitch(pitch: number) {
    this.pitch = pitch;
  }

  public setNormalizeVolume(enabled: boolean) {
    this.normalizeVolume = enabled;

    // If currently playing, dynamically re-normalize and swap buffer or update gain
    if (this.rawAudioBuffer && this.audioCtx) {
      if (enabled) {
        const { normalizedBuffer, metrics } = AudioNormalizer.normalizeAudioBuffer(
          this.audioCtx,
          this.rawAudioBuffer,
          AudioNormalizer.TARGET_DB
        );
        this.currentAudioBuffer = normalizedBuffer;
        this.currentMetrics = metrics;
        this.callbacks.onLoudnessChange?.(metrics);
      } else {
        this.currentAudioBuffer = this.rawAudioBuffer;
        const rawRms = AudioNormalizer.computeRms(this.rawAudioBuffer.getChannelData(0));
        const rawDb = AudioNormalizer.linearToDb(rawRms);
        const metrics: LoudnessMetrics = {
          rawRms,
          rawDb: Number(rawDb.toFixed(1)),
          normalizedRms: rawRms,
          normalizedDb: Number(rawDb.toFixed(1)),
          appliedGainMultiplier: 1.0,
          appliedGainDb: 0,
          peakAmplitude: 1.0,
          isNormalized: false,
        };
        this.currentMetrics = metrics;
        this.callbacks.onLoudnessChange?.(metrics);
      }
    }
  }

  public isNormalizeEnabled(): boolean {
    return this.normalizeVolume;
  }

  public getLoudnessMetrics(): LoudnessMetrics | null {
    return this.currentMetrics;
  }

  public parseSentences(rawText: string): SentenceItem[] {
    if (!rawText.trim()) return [];

    const regex = /[^.!?]+[.!?]+|[^.!?]+$/g;
    const matches = rawText.match(regex) || [rawText];

    let charOffset = 0;
    const items: SentenceItem[] = [];

    matches.forEach((chunk, idx) => {
      const trimmed = chunk.trim();
      if (trimmed.length > 0) {
        const start = rawText.indexOf(trimmed, charOffset);
        const end = start + trimmed.length;
        charOffset = end;

        items.push({
          id: idx,
          text: trimmed,
          startChar: start,
          endChar: end,
          phonemes: textToKokoroIpa(trimmed),
        });
      }
    });

    this.sentences = items;
    return items;
  }

  /**
   * Fetches or retrieves real authentic Kokoro neural audio for a given text and voice.
   */
  private async getRealKokoroAudio(text: string, voiceId: string): Promise<AudioBuffer | null> {
    if (!this.audioCtx) return null;

    const cacheKey = `${voiceId}_${text}_${this.speed}`;
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!;
    }

    // 1. Check if this is the sample text for one of the 12 standard Kokoro voices
    const isSampleOfVoice = this.selectedVoice.sampleText.trim() === text.trim();
    if (isSampleOfVoice) {
      try {
        const staticUrl = `/audio/${voiceId}.wav`;
        const res = await fetch(staticUrl);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const decoded = await this.audioCtx.decodeAudioData(arrayBuf);
          this.audioCache.set(cacheKey, decoded);
          return decoded;
        }
      } catch (e) {
        // Fall through to server API
      }
    }

    // 2. Synthesize with real Kokoro neural model via local backend endpoint
    try {
      const res = await fetch('/api/kokoro/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: voiceId,
          speed: this.speed,
          normalize: false, // We normalize locally on the audio buffer to give live control
        }),
      });

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const decoded = await this.audioCtx.decodeAudioData(arrayBuf);
        this.audioCache.set(cacheKey, decoded);
        return decoded;
      }
    } catch (e) {
      console.warn('[Kokoro Engine] Real server synthesis failed, falling back:', e);
    }

    return null;
  }

  public async play(text: string, startIndex: number = 0) {
    if (!text.trim()) return;

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    if (this.sentences.length === 0 || this.sentences[0].text !== text.slice(0, this.sentences[0]?.text.length)) {
      this.parseSentences(text);
    }

    this.currentSentenceIdx = Math.max(0, Math.min(startIndex, this.sentences.length - 1));
    this.isPlaying = true;
    this.isPaused = false;
    this.pauseOffsetTime = 0;
    this.callbacks.onStateChange?.(true, false);

    this.speakCurrentSentence();
  }

  private async speakCurrentSentence() {
    if (!this.isPlaying || this.currentSentenceIdx >= this.sentences.length) {
      this.stop();
      this.callbacks.onPlaybackEnd?.();
      return;
    }

    const item = this.sentences[this.currentSentenceIdx];
    this.callbacks.onSentenceStart?.(this.currentSentenceIdx, item);

    // Stop any existing source node
    this.stopCurrentSource();

    // 1. Attempt to play real Kokoro neural audio
    const rawBuffer = await this.getRealKokoroAudio(item.text, this.selectedVoice.id);

    if (rawBuffer && this.audioCtx && this.masterGain) {
      this.rawAudioBuffer = rawBuffer;

      // 2. Process Audio Output Buffer through Volume Normalizer if enabled
      let playBuffer = rawBuffer;
      if (this.normalizeVolume) {
        const { normalizedBuffer, metrics } = AudioNormalizer.normalizeAudioBuffer(
          this.audioCtx,
          rawBuffer,
          AudioNormalizer.TARGET_DB
        );
        playBuffer = normalizedBuffer;
        this.currentMetrics = metrics;
        this.callbacks.onLoudnessChange?.(metrics);
      } else {
        const rawRms = AudioNormalizer.computeRms(rawBuffer.getChannelData(0));
        const rawDb = AudioNormalizer.linearToDb(rawRms);
        const metrics: LoudnessMetrics = {
          rawRms,
          rawDb: Number(rawDb.toFixed(1)),
          normalizedRms: rawRms,
          normalizedDb: Number(rawDb.toFixed(1)),
          appliedGainMultiplier: 1.0,
          appliedGainDb: 0,
          peakAmplitude: 1.0,
          isNormalized: false,
        };
        this.currentMetrics = metrics;
        this.callbacks.onLoudnessChange?.(metrics);
      }

      this.currentAudioBuffer = playBuffer;
      this.currentBufferDuration = playBuffer.duration;

      // 3. Connect Web Audio Pipeline
      const source = this.audioCtx.createBufferSource();
      source.buffer = playBuffer;
      source.playbackRate.value = this.speed;

      source.connect(this.masterGain);
      this.currentSourceNode = source;
      this.playbackStartTime = this.audioCtx.currentTime - this.pauseOffsetTime;

      source.onended = () => {
        if (this.isPlaying && !this.isPaused) {
          this.currentSentenceIdx++;
          this.pauseOffsetTime = 0;
          this.sentenceEndTimer = window.setTimeout(() => {
            this.speakCurrentSentence();
          }, 180);
        }
      };

      source.start(0, this.pauseOffsetTime);
    } else {
      // Fallback to browser SpeechSynthesis if audio files cannot load
      this.fallbackSpeechSynthesis(item);
    }
  }

  private fallbackSpeechSynthesis(item: SentenceItem) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.rate = Math.min(2.0, Math.max(0.5, this.speed));
      utterance.pitch = this.selectedVoice.gender === 'Female' ? 1.1 : 0.85;

      utterance.onend = () => {
        if (this.isPlaying && !this.isPaused) {
          this.currentSentenceIdx++;
          this.sentenceEndTimer = window.setTimeout(() => {
            this.speakCurrentSentence();
          }, 180);
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  }

  private stopCurrentSource() {
    if (this.sentenceEndTimer) {
      clearTimeout(this.sentenceEndTimer);
      this.sentenceEndTimer = null;
    }
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch {
        // already stopped
      }
      this.currentSourceNode = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public pause() {
    if (this.isPlaying && !this.isPaused) {
      this.isPaused = true;
      if (this.audioCtx && this.currentSourceNode) {
        this.pauseOffsetTime = (this.audioCtx.currentTime - this.playbackStartTime) * this.speed;
        this.stopCurrentSource();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      this.callbacks.onStateChange?.(true, true);
    }
  }

  public resume() {
    if (this.isPlaying && this.isPaused) {
      this.isPaused = false;
      this.speakCurrentSentence();
      this.callbacks.onStateChange?.(true, false);
    }
  }

  public stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseOffsetTime = 0;
    this.stopCurrentSource();
    this.callbacks.onStateChange?.(false, false);
  }

  public skipSentence(direction: 1 | -1) {
    if (this.sentences.length === 0) return;
    const targetIdx = Math.max(0, Math.min(this.sentences.length - 1, this.currentSentenceIdx + direction));
    this.currentSentenceIdx = targetIdx;
    this.pauseOffsetTime = 0;
    if (this.isPlaying) {
      this.stopCurrentSource();
      this.speakCurrentSentence();
    } else {
      this.callbacks.onSentenceStart?.(targetIdx, this.sentences[targetIdx]);
    }
  }

  public getWaveformData(): number[] {
    if (!this.isPlaying || this.isPaused) {
      return Array(18).fill(8);
    }

    if (this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);
      const res: number[] = [];
      const step = Math.floor(dataArray.length / 18);
      for (let i = 0; i < 18; i++) {
        const val = dataArray[i * step] || 0;
        res.push(Math.min(95, Math.max(8, (val / 255) * 100)));
      }
      return res;
    }

    return Array.from({ length: 18 }, (_, i) => {
      const base = 25 + Math.sin(Date.now() / 150 + i) * 20;
      return Math.min(95, Math.max(8, base + Math.random() * 35));
    });
  }

  public exportWav(text: string, voiceName: string): Blob {
    // If we have a processed buffer, serialize it directly to standard 16-bit PCM WAV
    if (this.currentAudioBuffer) {
      return audioBufferToWavBlob(this.currentAudioBuffer);
    }

    // Fallback: harmonic generator
    const sampleRate = 24000;
    const durationSec = Math.max(2.0, (text.split(/\s+/).length / 150) * 60);
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      view.setInt16(offset, 0, true);
      offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const arrayBuffer = new ArrayBuffer(44 + numSamples * 2 * numChannels);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2 * numChannels, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * numChannels * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      const pcm16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, Math.round(pcm16), true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
