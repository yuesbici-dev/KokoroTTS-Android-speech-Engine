import React, { useState } from 'react';
import { Volume2, Play, Check, Sparkles, Filter } from 'lucide-react';
import { KokoroVoice } from '../types/tts';
import { KOKORO_VOICES } from '../data/kokoroData';
import { KokoroAudioEngine } from '../services/kokoroAudioEngine';

interface VoiceCatalogScreenProps {
  selectedVoiceId: string;
  isDarkTheme?: boolean;
  onSelectVoice: (voice: KokoroVoice) => void;
  onClose?: () => void;
}

export const VoiceCatalogScreen: React.FC<VoiceCatalogScreenProps> = ({
  selectedVoiceId,
  isDarkTheme = true,
  onSelectVoice,
  onClose,
}) => {
  const [accentFilter, setAccentFilter] = useState<'All' | 'American' | 'British'>('All');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const engine = KokoroAudioEngine.getInstance();

  const filteredVoices = KOKORO_VOICES.filter((v) => {
    if (accentFilter === 'All') return true;
    return v.accent === accentFilter;
  });

  const handleAudition = (voice: KokoroVoice) => {
    if (playingVoiceId === voice.id) {
      engine.stop();
      setPlayingVoiceId(null);
    } else {
      engine.setVoice(voice);
      setPlayingVoiceId(voice.id);
      engine.play(voice.sampleText, 0);
      engine.setCallbacks({
        onPlaybackEnd: () => setPlayingVoiceId(null),
        onStateChange: (isPlaying) => {
          if (!isPlaying) setPlayingVoiceId(null);
        },
      });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top Header */}
      <div
        className={`flex items-center justify-between px-5 py-3.5 border-b ${
          isDarkTheme ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white/90'
        }`}
      >
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-blue-500" />
          <h2 className="text-sm font-semibold tracking-tight">Kokoro Voice Models</h2>
        </div>
        <span className="text-[11px] font-semibold text-emerald-400">Real Kokoro-82M Audio</span>
      </div>

      {/* Filter Tabs (Interactive Filter Controls, functional buttons) */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-1 p-1 bg-slate-800/60 rounded-xl border border-slate-700/60">
          {(['All', 'American', 'British'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setAccentFilter(filter)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                accentFilter === filter
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter === 'All' ? 'All Voices' : `${filter}`}
            </button>
          ))}
        </div>
      </div>

      {/* Voice List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5">
        {filteredVoices.map((voice) => {
          const isSelected = voice.id === selectedVoiceId;
          const isAuditioning = playingVoiceId === voice.id;

          return (
            <div
              key={voice.id}
              className={`rounded-2xl p-3.5 border transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                  : isDarkTheme
                  ? 'border-slate-800 bg-slate-800/30 hover:border-slate-700'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-100">{voice.name}</span>
                    {voice.isFlagship && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-medium">
                        <Sparkles className="h-3 w-3" /> Flagship
                      </span>
                    )}
                  </div>

                  {/* Clean unboxed metadata with typographic separators */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                    <span>{voice.accent}</span>
                    <span aria-hidden="true">·</span>
                    <span>{voice.gender}</span>
                    <span aria-hidden="true">·</span>
                    <span>{voice.sizeMb} MB Latent</span>
                  </div>
                </div>

                {/* Select / Active Badge */}
                {isSelected ? (
                  <span className="flex items-center gap-1 text-[11px] text-blue-400 font-semibold px-2 py-0.5 rounded-full bg-blue-500/20">
                    <Check className="h-3.5 w-3.5" /> Active
                  </span>
                ) : (
                  <button
                    onClick={() => onSelectVoice(voice)}
                    className="text-[11px] font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    Select
                  </button>
                )}
              </div>

              {/* Description */}
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">{voice.description}</p>

              {/* Sample Audition Box */}
              <div className="flex items-center justify-between rounded-xl bg-slate-900/60 border border-slate-800/80 px-2.5 py-1.5 text-[11px]">
                <span className="italic text-slate-400 truncate max-w-[210px]">
                  "{voice.sampleText}"
                </span>
                <button
                  onClick={() => handleAudition(voice)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    isAuditioning
                      ? 'bg-blue-600 text-white animate-pulse'
                      : 'text-blue-400 hover:bg-blue-500/10'
                  }`}
                  title="Audition voice"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>{isAuditioning ? 'Playing' : 'Audition'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
