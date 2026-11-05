import React from 'react';
import {
  Cpu,
  Database,
  Radio,
  FileCode,
  Layers,
  ArrowRight,
  ShieldCheck,
  Headphones,
  CheckCircle,
} from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-6">
      <div>
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-400" />
          <span>Kokoro Android Engine Architecture & Pipeline</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          End-to-end data flow: From raw UTF-8 string to 24kHz PCM audio playback in Android Jetpack Compose
        </p>
      </div>

      {/* Pipeline Diagram Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Step 1: Input & G2P */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-[10px]">1</span>
            <span>Phonemizer</span>
          </div>
          <h3 className="text-xs font-semibold text-slate-200">G2P Tokenization</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Sentence boundary detection. ESpeak-NG G2P converts text to IPA phoneme tokens mapped to token index tensors.
          </p>
          <div className="rounded-lg bg-slate-900 p-1.5 font-mono text-[10px] text-slate-400">
            Shape: [1, seq_len]
          </div>
        </div>

        {/* Step 2: Voice Latent Style Vector */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px]">2</span>
            <span>Voice Latents</span>
          </div>
          <h3 className="text-xs font-semibold text-slate-200">Speaker Vectors</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Loads pre-computed 256-dim style embeddings (<code className="text-indigo-400 font-mono">voices.bin</code>) for active voice (Heart, Bella, Adam).
          </p>
          <div className="rounded-lg bg-slate-900 p-1.5 font-mono text-[10px] text-slate-400">
            Shape: [1, 256] Float32
          </div>
        </div>

        {/* Step 3: ONNX Runtime Mobile */}
        <div className="rounded-2xl border border-blue-500/40 bg-blue-950/20 p-3.5 space-y-2 shadow-lg shadow-blue-900/10">
          <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[10px]">3</span>
            <span>ONNX Runtime</span>
          </div>
          <h3 className="text-xs font-semibold text-slate-100">Kokoro-82M Model</h3>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Quantized INT8 / FP16 neural model executed on-device. Utilizes ARM NEON SIMD and NNAPI for 15x real-time inference.
          </p>
          <div className="rounded-lg bg-slate-900 p-1.5 font-mono text-[10px] text-cyan-400">
            Latency: ~60ms/sentence
          </div>
        </div>

        {/* Step 4: Audio Buffer Normalizer (DSP) */}
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px]">4</span>
            <span>DSP Normalizer</span>
          </div>
          <h3 className="text-xs font-semibold text-slate-100">Buffer Normalizer</h3>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Scans raw PCM / Float32 buffer RMS. Normalizes speech loudness to -16 dBFS with soft-saturation limiting to eliminate voice disparities.
          </p>
          <div className="rounded-lg bg-slate-900 p-1.5 font-mono text-[10px] text-amber-300">
            Target: -16 LUFS · Tanh
          </div>
        </div>

        {/* Step 5: AudioTrack & Compose */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px]">5</span>
            <span>Playback & UI</span>
          </div>
          <h3 className="text-xs font-semibold text-slate-200">AudioTrack & UI</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Streams 24kHz 16-bit PCM through AudioTrack & MediaSession. Jetpack Compose highlights matching sentence synchronously.
          </p>
          <div className="rounded-lg bg-slate-900 p-1.5 font-mono text-[10px] text-slate-400">
            24,000 Hz · 16-bit PCM
          </div>
        </div>
      </div>

      {/* Scoped Storage & Security Architecture */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-400" />
          <span>Local Large Model File Storage Architecture</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
            <p className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>Android Scoped Storage</span>
            </p>
            <p>
              Stored inside <code className="text-blue-400 font-mono">context.filesDir/kokoro_models</code>. Files are private to the app sandbox and exempt from external storage permissions.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
            <p className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span>SHA-256 Digest Verification</span>
            </p>
            <p>
              Downloaded chunks are written to temporary <code className="text-emerald-400 font-mono">.downloading</code> files. Checksum is verified before atomic rename to prevent model corruption.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
            <p className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-amber-400" />
              <span>Storage Quota Safeguard</span>
            </p>
            <p>
              Pre-allocates and queries <code className="text-amber-400 font-mono">StatFs</code> before downloading to ensure at least 200MB buffer remains free, eliminating out-of-disk crashes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
