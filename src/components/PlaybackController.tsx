import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  Download,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { KokoroVoice } from '../types/tts';
import { KokoroAudioEngine } from '../services/kokoroAudioEngine';
import { LoudnessMetrics } from '../services/audioNormalizer';

interface PlaybackControllerProps {
  isPlaying: boolean;
  isPaused: boolean;
  currentSentenceIdx: number;
  totalSentences: number;
  currentSpeed: number;
  currentPitch: number;
  selectedVoice: KokoroVoice;
  normalizeVolume: boolean;
  loudnessMetrics: LoudnessMetrics | null;
  isDarkTheme?: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onSkipSentence: (direction: 1 | -1) => void;
  onSeekSentence: (index: number) => void;
  onSpeedChange: (speed: number) => void;
  onPitchChange: (pitch: number) => void;
  onToggleNormalizeVolume: () => void;
  onExportWav: () => void;
}

export const PlaybackController: React.FC<PlaybackControllerProps> = ({
  isPlaying,
  isPaused,
  currentSentenceIdx,
  totalSentences,
  currentSpeed,
  currentPitch,
  selectedVoice,
  normalizeVolume,
  loudnessMetrics,
  isDarkTheme = true,
  onPlayPause,
  onStop,
  onSkipSentence,
  onSeekSentence,
  onSpeedChange,
  onPitchChange,
  onToggleNormalizeVolume,
  onExportWav,
}) => {
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Dynamic waveform rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = KokoroAudioEngine.getInstance();

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const bars = engine.getWaveformData();
      const barWidth = 3;
      const gap = 3;
      const totalBarWidth = bars.length * (barWidth + gap);
      const startX = (width - totalBarWidth) / 2;

      bars.forEach((val, i) => {
        // Amplify visual bar height slightly if normalized to reflect consistent presence
        const factor = normalizeVolume ? 1.15 : 0.95;
        const barHeight = Math.max(3, Math.min(height - 2, (val / 100) * (height - 4) * factor));
        const x = startX + i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = isPlaying && !isPaused
          ? normalizeVolume ? '#3b82f6' : '#60a5fa'
          : isDarkTheme ? '#475569' : '#94a3b8';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      });

      if (isPlaying && !isPaused) {
        animFrameRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    if (isPlaying && !isPaused) {
      animFrameRef.current = requestAnimationFrame(draw);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isPaused, isDarkTheme, normalizeVolume]);

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div
      className={`relative z-20 w-full border-t px-4 py-3 transition-colors ${
        isDarkTheme
          ? 'bg-slate-900/95 border-slate-800 text-slate-100 backdrop-blur-md'
          : 'bg-white/95 border-slate-200 text-slate-900 backdrop-blur-md'
      }`}
    >
      {/* Top row: Voice info, Sentence tracker & Waveform */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              isDarkTheme ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {selectedVoice.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate leading-tight">{selectedVoice.name}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 leading-tight">
              <span>Sentence {totalSentences > 0 ? currentSentenceIdx + 1 : 0} of {totalSentences}</span>
              <span aria-hidden="true">·</span>
              <span className="text-blue-400 font-medium">Neural 24kHz</span>
            </div>
          </div>
        </div>

        {/* Live Audio Waveform Canvas & Controls */}
        <div className="flex items-center gap-1.5">
          <canvas
            ref={canvasRef}
            width={90}
            height={26}
            className="rounded bg-slate-800/40 px-1"
          />

          {/* Quick Normalize Toggle Button */}
          <button
            onClick={onToggleNormalizeVolume}
            title={
              normalizeVolume
                ? 'Volume Normalizer is Active: Processes audio buffer to target -16 dBFS'
                : 'Enable Volume Normalizer to balance loudness across different voice styles'
            }
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
              normalizeVolume
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : isDarkTheme
                ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Volume2 className="h-3 w-3" />
            <span>{normalizeVolume ? 'Norm ON' : 'Norm OFF'}</span>
          </button>

          <button
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            title="Adjust Audio DSP & Normalization"
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showSettingsDrawer
                ? 'bg-blue-600 text-white'
                : isDarkTheme
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Sliders className="h-4 w-4" />
          </button>

          <button
            onClick={onExportWav}
            title="Export Audio to WAV file"
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              isDarkTheme
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Settings & Loudness Normalization Inspector Drawer */}
      {showSettingsDrawer && (
        <div
          className={`mb-3 p-3 rounded-2xl text-xs space-y-2.5 transition-all ${
            isDarkTheme ? 'bg-slate-800/90 border border-slate-700' : 'bg-slate-100 border border-slate-200'
          }`}
        >
          {/* Main Normalize Volume Toggle Row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-200 text-xs">Normalize Volume</p>
              <p className="text-[10px] text-slate-400">
                DSP buffer normalization to -16 dBFS with soft-saturation limiter
              </p>
            </div>
            <button
              onClick={onToggleNormalizeVolume}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                normalizeVolume ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  normalizeVolume ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Real-time Loudness Metrics Meter */}
          <div className="rounded-xl bg-slate-900/70 p-2.5 border border-slate-800 text-[11px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Buffer Target:</span>
              <span className="font-mono text-blue-400 font-semibold">-16.0 dBFS (EBU R128)</span>
            </div>
            {loudnessMetrics ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Input Energy (Raw):</span>
                  <span className="font-mono text-slate-300">{loudnessMetrics.rawDb} dBFS</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Applied Normalization Gain:</span>
                  <span
                    className={`font-mono font-semibold ${
                      loudnessMetrics.appliedGainDb >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {normalizeVolume
                      ? `${loudnessMetrics.appliedGainDb > 0 ? '+' : ''}${loudnessMetrics.appliedGainDb} dB (${loudnessMetrics.appliedGainMultiplier}x)`
                      : '0.0 dB (Bypassed)'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Output Energy:</span>
                  <span className="font-mono text-blue-300 font-bold">
                    {normalizeVolume ? `${loudnessMetrics.normalizedDb} dBFS` : `${loudnessMetrics.rawDb} dBFS`}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-[10px] text-slate-500 italic">
                Play any sentence to inspect live audio buffer loudness metrics
              </p>
            )}
          </div>

          {/* Pitch Modulation */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-700/50">
            <span className="text-slate-400 font-medium whitespace-nowrap text-[11px]">Pitch Tuning:</span>
            <input
              type="range"
              min="0.7"
              max="1.4"
              step="0.05"
              value={currentPitch}
              onChange={(e) => onPitchChange(parseFloat(e.target.value))}
              className="w-full accent-blue-600 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="font-mono tabular-nums text-blue-400 font-semibold w-9 text-right text-[11px]">
              {(currentPitch * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Sentence Scrubber Timeline Slider */}
      <div className="relative mb-2">
        <input
          type="range"
          min="0"
          max={Math.max(0, totalSentences - 1)}
          value={currentSentenceIdx}
          onChange={(e) => onSeekSentence(parseInt(e.target.value, 10))}
          disabled={totalSentences <= 1}
          className="w-full accent-blue-600 h-1.5 bg-slate-700 rounded-lg cursor-pointer disabled:opacity-40"
        />
      </div>

      {/* Primary Transport Controls Row */}
      <div className="flex items-center justify-between px-2">
        {/* Previous Sentence */}
        <button
          onClick={() => onSkipSentence(-1)}
          disabled={currentSentenceIdx <= 0}
          className="p-2 rounded-full text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors m3-pressable"
          title="Previous sentence"
        >
          <SkipBack className="h-5 w-5" />
        </button>

        {/* Stop button */}
        <button
          onClick={onStop}
          disabled={!isPlaying && !isPaused}
          className="p-2 rounded-full text-slate-400 hover:text-rose-400 disabled:opacity-30 transition-colors m3-pressable"
          title="Stop synthesis"
        >
          <Square className="h-4 w-4" />
        </button>

        {/* Main Play / Pause Circle Button */}
        <button
          onClick={onPlayPause}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all m3-pressable"
          title={isPlaying && !isPaused ? 'Pause' : 'Play Speech'}
        >
          {isPlaying && !isPaused ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5 fill-current" />
          )}
        </button>

        {/* Next Sentence */}
        <button
          onClick={() => onSkipSentence(1)}
          disabled={currentSentenceIdx >= totalSentences - 1}
          className="p-2 rounded-full text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors m3-pressable"
          title="Next sentence"
        >
          <SkipForward className="h-5 w-5" />
        </button>

        {/* Speed Selector Segment */}
        <div className="flex items-center gap-1">
          {speedOptions.map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                currentSpeed === speed
                  ? 'bg-blue-600 text-white font-semibold'
                  : isDarkTheme
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
