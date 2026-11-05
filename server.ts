import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { KokoroTTS } from 'kokoro-js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Singleton KokoroTTS model instance
let ttsInstance: KokoroTTS | null = null;
let isModelLoading = false;
let modelLoadPromise: Promise<KokoroTTS> | null = null;

async function getKokoroModel(): Promise<KokoroTTS> {
  if (ttsInstance) return ttsInstance;
  if (modelLoadPromise) return modelLoadPromise;

  isModelLoading = true;
  console.log('[Kokoro Server] Initializing Kokoro-82M ONNX neural model...');
  modelLoadPromise = KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
    dtype: 'q8',
  })
    .then((model) => {
      console.log('[Kokoro Server] Kokoro-82M ONNX model successfully loaded into memory!');
      ttsInstance = model;
      isModelLoading = false;
      return model;
    })
    .catch((err) => {
      console.error('[Kokoro Server] Failed to load Kokoro-82M model:', err);
      isModelLoading = false;
      modelLoadPromise = null;
      throw err;
    });

  return modelLoadPromise;
}

// Convert Float32Array audio samples into 24kHz 16-bit Mono PCM WAV container
function float32ToWav(samples: Float32Array, sampleRate = 24000): Buffer {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const pcm16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    buffer.writeInt16LE(Math.round(pcm16), offset);
    offset += 2;
  }

  return buffer;
}

// Buffer Volume Normalization algorithm (EBU R128 / RMS speech target -16 dBFS)
function normalizeFloat32Buffer(samples: Float32Array, targetDb = -16.0): {
  normalized: Float32Array;
  rawRms: number;
  rawDb: number;
  appliedGainDb: number;
} {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  const rawRms = Math.sqrt(sumSquares / samples.length);
  const rawDb = rawRms > 0.000001 ? 20 * Math.log10(rawRms) : -96.0;

  if (rawRms < 0.001) {
    return { normalized: samples, rawRms, rawDb, appliedGainDb: 0 };
  }

  const targetRms = Math.pow(10, targetDb / 20);
  const desiredGain = Math.min(5.0, Math.max(0.25, targetRms / rawRms));
  const appliedGainDb = Number((20 * Math.log10(desiredGain)).toFixed(1));

  const normalized = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    // Soft saturation limiting to protect against clipping
    normalized[i] = Math.tanh(samples[i] * desiredGain) * 0.98;
  }

  return { normalized, rawRms, rawDb, appliedGainDb };
}

// API: Synthesize speech with REAL Kokoro neural model
app.post('/api/kokoro/synthesize', async (req: Request, res: Response): Promise<void> => {
  const { text, voice = 'af_heart', speed = 1.0, normalize = false } = req.body;

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Text prompt is required' });
    return;
  }

  try {
    const tts = await getKokoroModel();
    console.log(`[Kokoro Server] Synthesizing "${text.slice(0, 40)}..." [Voice: ${voice}, Normalize: ${normalize}]`);

    const result = await tts.generate(text, {
      voice: voice as any,
      speed: Number(speed) || 1.0,
    });

    let audioSamples: Float32Array = result.audio;
    let gainDb = 0;
    let rawDb = -18.0;

    if (normalize) {
      const normResult = normalizeFloat32Buffer(audioSamples, -16.0);
      audioSamples = normResult.normalized;
      gainDb = normResult.appliedGainDb;
      rawDb = Number(normResult.rawDb.toFixed(1));
    }

    const wavBuffer = float32ToWav(audioSamples, result.sampling_rate || 24000);

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': wavBuffer.length.toString(),
      'X-Kokoro-Voice': voice,
      'X-Kokoro-SampleRate': (result.sampling_rate || 24000).toString(),
      'X-Kokoro-Raw-Db': rawDb.toString(),
      'X-Kokoro-Applied-Gain-Db': gainDb.toString(),
      'X-Kokoro-Normalized': normalize ? 'true' : 'false',
    });

    res.send(wavBuffer);
  } catch (error: any) {
    console.error('[Kokoro Server] Synthesis error:', error);
    res.status(500).json({ error: 'Failed to synthesize speech', details: error.message });
  }
});

// API: Model and status healthcheck
app.get('/api/kokoro/status', async (req: Request, res: Response) => {
  res.json({
    engine: 'Kokoro-82M',
    isLoaded: !!ttsInstance,
    isLoading: isModelLoading,
    sampleRate: 24000,
    defaultVoice: 'af_heart',
    supportedVoices: [
      'af_heart', 'af_bella', 'af_sarah', 'af_sky',
      'am_adam', 'am_michael', 'am_fenrir',
      'bf_emma', 'bf_isabella', 'bm_george', 'bm_lewis', 'bm_fable',
    ],
  });
});

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Kokoro Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
