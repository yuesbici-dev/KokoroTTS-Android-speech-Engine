import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  FolderArchive,
  Layers,
  Code2,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { KokoroVoice, SentenceItem } from '../types/tts';
import { SAMPLE_TEXTS } from '../data/kokoroData';
import { PlaybackController } from './PlaybackController';
import { LoudnessMetrics } from '../services/audioNormalizer';

interface TtsScreenProps {
  text: string;
  sentences: SentenceItem[];
  currentSentenceIdx: number;
  isPlaying: boolean;
  isPaused: boolean;
  currentSpeed: number;
  currentPitch: number;
  selectedVoice: KokoroVoice;
  normalizeVolume: boolean;
  loudnessMetrics: LoudnessMetrics | null;
  isDarkTheme?: boolean;
  onTextChange: (newText: string) => void;
  onSentenceClick: (index: number) => void;
  onPlayPause: () => void;
  onStop: () => void;
  onSkipSentence: (direction: 1 | -1) => void;
  onSeekSentence: (index: number) => void;
  onSpeedChange: (speed: number) => void;
  onPitchChange: (pitch: number) => void;
  onToggleNormalizeVolume: () => void;
  onOpenVoiceCatalog: () => void;
  onOpenStorageManager: () => void;
  onExportWav: () => void;
}

export const TtsScreen: React.FC<TtsScreenProps> = ({
  text,
  sentences,
  currentSentenceIdx,
  isPlaying,
  isPaused,
  currentSpeed,
  currentPitch,
  selectedVoice,
  normalizeVolume,
  loudnessMetrics,
  isDarkTheme = true,
  onTextChange,
  onSentenceClick,
  onPlayPause,
  onStop,
  onSkipSentence,
  onSeekSentence,
  onSpeedChange,
  onPitchChange,
  onToggleNormalizeVolume,
  onOpenVoiceCatalog,
  onOpenStorageManager,
  onExportWav,
}) => {
  const [showPhonemes, setShowPhonemes] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'karaoke'>('karaoke');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Jetpack Compose Top App Bar */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
          isDarkTheme ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white/90'
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold tracking-tight text-slate-100 truncate">
              Kokoro Speech
            </h1>
            <span className="text-[10px] text-blue-400 font-medium">82M Offline</span>
          </div>
          <button
            onClick={onOpenVoiceCatalog}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-400 transition-colors mt-0.5"
          >
            <Volume2 className="h-3 w-3 text-blue-400" />
            <span className="truncate">{selectedVoice.name} ({selectedVoice.accent})</span>
          </button>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPhonemes(!showPhonemes)}
            title="Toggle IPA Phoneme Tokens"
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showPhonemes
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenStorageManager}
            title="Manage Offline Models"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <FolderArchive className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mode Segmented Controls */}
      <div className="px-4 pt-2.5 pb-1 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 flex-1">
          <button
            onClick={() => setActiveTab('karaoke')}
            className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'karaoke'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sentence Reader
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'editor'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Edit Text
          </button>
        </div>

        {/* Quick Sample Presets Picker */}
        <select
          onChange={(e) => {
            const found = SAMPLE_TEXTS.find((s) => s.label === e.target.value);
            if (found) onTextChange(found.text);
          }}
          defaultValue=""
          className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="" disabled>
            Presets...
          </option>
          {SAMPLE_TEXTS.map((s) => (
            <option key={s.label} value={s.label}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {activeTab === 'editor' ? (
          <div className="h-full flex flex-col space-y-2">
            <textarea
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Type or paste text to synthesize with Kokoro..."
              className="flex-1 w-full rounded-2xl bg-slate-800/40 border border-slate-700/70 p-3 text-xs leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-sans"
            />
            <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
              <span>{text.split(/\s+/).filter(Boolean).length} words · {text.length} characters</span>
              <button
                onClick={() => onTextChange(SAMPLE_TEXTS[0].text)}
                className="flex items-center gap-1 text-blue-400 hover:underline"
              >
                <RotateCcw className="h-3 w-3" /> Reset default
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Tap any sentence to jump:</span>
              <span className="font-mono">{sentences.length} sentences</span>
            </div>

            {sentences.map((item, idx) => {
              const isActive = isPlaying && idx === currentSentenceIdx;

              return (
                <div
                  key={item.id}
                  onClick={() => onSentenceClick(idx)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-blue-600/20 border-blue-500/80 shadow-md ring-1 ring-blue-500/30'
                      : isDarkTheme
                      ? 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`text-xs font-mono font-semibold shrink-0 pt-0.5 ${
                        isActive ? 'text-blue-400' : 'text-slate-500'
                      }`}
                    >
                      {idx + 1}.
                    </span>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs leading-relaxed ${
                          isActive
                            ? 'font-medium text-white'
                            : isDarkTheme
                            ? 'text-slate-300'
                            : 'text-slate-800'
                        }`}
                      >
                        {item.text}
                      </p>

                      {/* IPA Phoneme rendering if enabled */}
                      {showPhonemes && item.phonemes && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-700/40 font-mono text-[10px] text-blue-400/90 tracking-wide">
                          IPA: /{item.phonemes}/
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Docked Material 3 Playback Controller */}
      <PlaybackController
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentSentenceIdx={currentSentenceIdx}
        totalSentences={sentences.length}
        currentSpeed={currentSpeed}
        currentPitch={currentPitch}
        selectedVoice={selectedVoice}
        normalizeVolume={normalizeVolume}
        loudnessMetrics={loudnessMetrics}
        isDarkTheme={isDarkTheme}
        onPlayPause={onPlayPause}
        onStop={onStop}
        onSkipSentence={onSkipSentence}
        onSeekSentence={onSeekSentence}
        onSpeedChange={onSpeedChange}
        onPitchChange={onPitchChange}
        onToggleNormalizeVolume={onToggleNormalizeVolume}
        onExportWav={onExportWav}
      />
    </div>
  );
};
