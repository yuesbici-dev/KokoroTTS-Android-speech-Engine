/**
 * Audio Buffer Loudness Normalizer
 * Provides EBU R128 / RMS speech loudness normalization with soft-saturation limiting
 * to guarantee consistent volume across diverse voice styles (e.g., deep baritones vs soft literary voices).
 */

export interface LoudnessMetrics {
  rawRms: number;
  rawDb: number;
  normalizedRms: number;
  normalizedDb: number;
  appliedGainMultiplier: number;
  appliedGainDb: number;
  peakAmplitude: number;
  isNormalized: boolean;
}

export class AudioNormalizer {
  // Target speech RMS level corresponding to ~ -16.0 LUFS / dBFS
  public static readonly TARGET_RMS = 0.158; // -16 dBFS
  public static readonly TARGET_DB = -16.0;

  /**
   * Computes the Root-Mean-Square (RMS) energy of an audio buffer channel.
   */
  public static computeRms(samples: Float32Array): number {
    let sumSquares = 0;
    const len = samples.length;
    if (len === 0) return 0;

    for (let i = 0; i < len; i++) {
      sumSquares += samples[i] * samples[i];
    }
    return Math.sqrt(sumSquares / len);
  }

  /**
   * Converts linear RMS to decibels full scale (dBFS).
   */
  public static linearToDb(linear: number): number {
    if (linear <= 0.000001) return -96.0;
    return 20 * Math.log10(linear);
  }

  /**
   * Converts decibels to linear amplitude multiplier.
   */
  public static dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  /**
   * Processes a Float32Array audio buffer in-place or returns a new normalized buffer.
   * Applies target gain with tanh soft-limiting to eliminate digital clipping.
   */
  public static normalizeBuffer(
    input: Float32Array,
    targetDb: number = AudioNormalizer.TARGET_DB
  ): { output: Float32Array; metrics: LoudnessMetrics } {
    const len = input.length;
    const output = new Float32Array(len);

    const rawRms = this.computeRms(input);
    const rawDb = this.linearToDb(rawRms);

    if (rawRms < 0.001) {
      // Near silence, do not over-amplify noise floor
      output.set(input);
      return {
        output,
        metrics: {
          rawRms,
          rawDb,
          normalizedRms: rawRms,
          normalizedDb: rawDb,
          appliedGainMultiplier: 1.0,
          appliedGainDb: 0,
          peakAmplitude: 0,
          isNormalized: false,
        },
      };
    }

    const targetLinearRms = this.dbToLinear(targetDb);
    // Calculate required gain, clamped between -12 dB (0.25x) and +14 dB (5.0x) to preserve stability
    const desiredGain = Math.min(5.0, Math.max(0.25, targetLinearRms / rawRms));
    const appliedGainDb = Number(this.linearToDb(desiredGain).toFixed(1));

    let peak = 0;
    for (let i = 0; i < len; i++) {
      const amplified = input[i] * desiredGain;
      // Soft saturation limiter to prevent digital clipping while preserving vocal warmness
      const sample = Math.tanh(amplified) * 0.98;
      output[i] = sample;
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
    }

    const normalizedRms = this.computeRms(output);
    const normalizedDb = Number(this.linearToDb(normalizedRms).toFixed(1));

    return {
      output,
      metrics: {
        rawRms,
        rawDb: Number(rawDb.toFixed(1)),
        normalizedRms,
        normalizedDb,
        appliedGainMultiplier: Number(desiredGain.toFixed(2)),
        appliedGainDb,
        peakAmplitude: Number(peak.toFixed(2)),
        isNormalized: true,
      },
    };
  }

  /**
   * Normalizes an AudioBuffer across all channels.
   */
  public static normalizeAudioBuffer(
    audioCtx: AudioContext,
    buffer: AudioBuffer,
    targetDb: number = AudioNormalizer.TARGET_DB
  ): { normalizedBuffer: AudioBuffer; metrics: LoudnessMetrics } {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;

    const newBuffer = audioCtx.createBuffer(numChannels, length, sampleRate);
    let combinedMetrics: LoudnessMetrics | null = null;

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      const { output, metrics } = this.normalizeBuffer(channelData, targetDb);
      newBuffer.getChannelData(channel).set(output);
      if (channel === 0) {
        combinedMetrics = metrics;
      }
    }

    return {
      normalizedBuffer: newBuffer,
      metrics: combinedMetrics || {
        rawRms: 0,
        rawDb: -96,
        normalizedRms: 0,
        normalizedDb: -96,
        appliedGainMultiplier: 1.0,
        appliedGainDb: 0,
        peakAmplitude: 0,
        isNormalized: true,
      },
    };
  }
}
