import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Wifi,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { ModelFile, StorageStatus } from '../types/tts';
import { StorageManager } from '../services/storageManager';

interface ModelManagerScreenProps {
  isDarkTheme?: boolean;
  onClose?: () => void;
}

export const ModelManagerScreen: React.FC<ModelManagerScreenProps> = ({
  isDarkTheme = true,
  onClose,
}) => {
  const [models, setModels] = useState<ModelFile[]>([]);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const storage = StorageManager.getInstance();

  useEffect(() => {
    const unsub = storage.subscribe((updated) => {
      setModels(updated);
      setStorageStatus(storage.getStorageStatus());
      setIsOffline(storage.isOffline());
    });
    return unsub;
  }, []);

  const handleDownload = (modelId: string) => {
    setErrorMessage(null);
    storage.startDownload(
      modelId,
      undefined,
      () => {
        // Success
      },
      (err) => {
        setErrorMessage(err);
      }
    );
  };

  const handleCancel = (modelId: string) => {
    storage.cancelDownload(modelId);
  };

  const handleDelete = (modelId: string) => {
    storage.deleteModel(modelId);
  };

  const handleToggleOffline = () => {
    const next = !isOffline;
    storage.setOffline(next);
    setIsOffline(next);
  };

  const usedMb = storageStatus ? (storageStatus.usedBytes / (1024 * 1024)).toFixed(1) : '0';
  const totalGb = storageStatus ? (storageStatus.totalAllocatedBytes / (1024 * 1024 * 1024)).toFixed(1) : '10.0';
  const usedPercent = storageStatus
    ? Math.min(100, Math.max(1, (storageStatus.usedBytes / storageStatus.totalAllocatedBytes) * 100))
    : 1.2;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top Bar */}
      <div
        className={`flex items-center justify-between px-5 py-3.5 border-b ${
          isDarkTheme ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white/90'
        }`}
      >
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-blue-500" />
          <h2 className="text-sm font-semibold tracking-tight">Android Model Storage</h2>
        </div>

        {/* Offline Mode Toggle Button */}
        <button
          onClick={handleToggleOffline}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            isOffline
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : isDarkTheme
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          title="Toggle Android Offline Mode"
        >
          {isOffline ? <WifiOff className="h-3.5 w-3.5 text-amber-400" /> : <Wifi className="h-3.5 w-3.5 text-emerald-400" />}
          <span>{isOffline ? 'Offline' : 'Online'}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Error notification if offline download attempted */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Download Blocked</p>
              <p className="text-rose-400/90">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Storage Quota Card */}
        <div
          className={`rounded-2xl p-4 border ${
            isDarkTheme ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-100/70 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Scoped Storage Allocation</span>
            <span className="font-mono text-blue-400 font-medium">
              {usedMb} MB / {totalGb} GB
            </span>
          </div>

          {/* Quota bar */}
          <div className="h-2 w-full rounded-full bg-slate-700/60 overflow-hidden mb-2">
            <div
              className="h-full bg-blue-500 transition-all duration-300 rounded-full"
              style={{ width: `${usedPercent}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{storageStatus?.modelCount || 0} Models Installed</span>
            <span className="truncate max-w-[200px]" title={storageStatus?.path}>
              internal /kokoro_models/
            </span>
          </div>
        </div>

        {/* Models List Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Kokoro ONNX Models & Weights
            </h3>
            <span className="text-[11px] text-slate-400">SHA-256 Verified</span>
          </div>

          <div className="space-y-2.5">
            {models.map((model) => {
              const isDownloading = model.status === 'downloading';
              const isVerifying = model.status === 'verifying';

              return (
                <div
                  key={model.id}
                  className={`rounded-2xl p-3.5 border transition-all ${
                    model.isDownloaded
                      ? isDarkTheme
                        ? 'bg-slate-800/30 border-slate-700/50'
                        : 'bg-white border-slate-200 shadow-sm'
                      : isDarkTheme
                      ? 'bg-slate-800/10 border-slate-800/80'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-100">{model.name}</span>
                        {model.isDownloaded && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Ready Offline
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                        {model.description}
                      </p>
                    </div>

                    <span className="font-mono text-xs font-semibold text-slate-300 shrink-0">
                      {model.sizeFormatted}
                    </span>
                  </div>

                  {/* Download Progress Bar if active */}
                  {(isDownloading || isVerifying) && (
                    <div className="my-2 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-blue-400 font-medium">
                          {isVerifying ? 'Checking SHA-256 Digest...' : `Downloading (${model.downloadSpeed})`}
                        </span>
                        <span className="font-mono text-slate-300">{model.downloadProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-150 ${
                            isVerifying ? 'bg-amber-400 animate-pulse' : 'bg-blue-500'
                          }`}
                          style={{ width: `${model.downloadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Actions & Checksum strip */}
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-700/30 text-[11px]">
                    <div className="flex items-center gap-1 text-slate-400">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-400/80 shrink-0" />
                      <span className="font-mono text-[10px] truncate max-w-[130px]" title={model.checksumSha256}>
                        {model.checksumSha256.slice(0, 14)}...
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {model.isDownloaded ? (
                        <button
                          onClick={() => handleDelete(model.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors text-[11px]"
                          title="Delete from local storage"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      ) : isDownloading ? (
                        <button
                          onClick={() => handleCancel(model.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-[11px]"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownload(model.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors text-[11px] shadow-sm"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Safety & Android Architecture Note */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-[11px] text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Android Scoped Storage Guardrails</p>
          <p>
            Models are stored securely in app internal files (<code className="text-blue-400 font-mono">context.filesDir</code>), isolated from other apps. A 200MB safety threshold is enforced before downloading to prevent device out-of-memory errors.
          </p>
        </div>
      </div>
    </div>
  );
};
