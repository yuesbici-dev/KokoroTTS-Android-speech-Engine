export interface KokoroVoice {
  id: string;
  name: string;
  accent: 'American' | 'British' | 'Japanese' | 'European';
  gender: 'Female' | 'Male';
  traits: string[];
  description: string;
  sampleText: string;
  speedRecommendation: number;
  pitchOffset: number;
  sizeMb: number;
  isFlagship?: boolean;
}

export interface ModelFile {
  id: string;
  name: string;
  filename: string;
  version: string;
  type: 'quantized_int8' | 'fp16_standard' | 'voices_pack' | 'espeak_lexicon';
  sizeBytes: number;
  sizeFormatted: string;
  description: string;
  checksumSha256: string;
  isDownloaded: boolean;
  downloadProgress: number; // 0 to 100
  downloadSpeed?: string;
  status: 'idle' | 'downloading' | 'verifying' | 'ready' | 'error';
  lastDownloadedAt?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  isSynthesizing: boolean;
  currentSentenceIndex: number;
  currentTime: number;
  duration: number;
  speed: number;
  pitch: number;
  volume: number;
  selectedVoiceId: string;
  selectedModelId: string;
}

export interface StorageStatus {
  totalAllocatedBytes: number;
  usedBytes: number;
  availableBytes: number;
  modelCount: number;
  path: string;
}

export interface SentenceItem {
  id: number;
  text: string;
  startChar: number;
  endChar: number;
  startTimeSec?: number;
  durationSec?: number;
  phonemes?: string;
}
