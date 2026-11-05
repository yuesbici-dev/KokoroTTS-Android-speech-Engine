import { ModelFile, StorageStatus } from '../types/tts';
import { INITIAL_MODELS } from '../data/kokoroData';

const STORAGE_KEY = 'kokoro_android_models_v1';
const OFFLINE_KEY = 'kokoro_offline_mode_flag';

export class StorageManager {
  private static instance: StorageManager;
  private models: ModelFile[] = [];
  private activeDownloads: Map<string, { abort: boolean; intervalId?: number }> = new Map();
  private listeners: Set<(models: ModelFile[]) => void> = new Set();
  private isOfflineMode: boolean = false;

  private constructor() {
    this.loadState();
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.models = JSON.parse(stored);
      } else {
        this.models = [...INITIAL_MODELS];
        this.saveState();
      }
      const offline = localStorage.getItem(OFFLINE_KEY);
      this.isOfflineMode = offline === 'true';
    } catch {
      this.models = [...INITIAL_MODELS];
    }
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.models));
    } catch {
      // ignore
    }
    this.notify();
  }

  public subscribe(listener: (models: ModelFile[]) => void) {
    this.listeners.add(listener);
    listener([...this.models]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.models]));
  }

  public getModels(): ModelFile[] {
    return [...this.models];
  }

  public getModel(id: string): ModelFile | undefined {
    return this.models.find((m) => m.id === id);
  }

  public isOffline(): boolean {
    return this.isOfflineMode;
  }

  public setOffline(offline: boolean) {
    this.isOfflineMode = offline;
    try {
      localStorage.setItem(OFFLINE_KEY, String(offline));
    } catch {
      // ignore
    }
    this.notify();
  }

  public getStorageStatus(): StorageStatus {
    const downloaded = this.models.filter((m) => m.isDownloaded);
    const usedBytes = downloaded.reduce((acc, m) => acc + m.sizeBytes, 0);
    // Simulating Android 15 Device Internal App Storage partition (e.g., 64 GB available, 10 GB quota allocated for TTS models)
    const totalAllocatedBytes = 10 * 1024 * 1024 * 1024; // 10 GB
    const availableBytes = totalAllocatedBytes - usedBytes;

    return {
      totalAllocatedBytes,
      usedBytes,
      availableBytes,
      modelCount: downloaded.length,
      path: '/data/user/0/com.kokoro.tts/files/kokoro_models/',
    };
  }

  public startDownload(
    modelId: string,
    onProgress?: (progress: number, speed: string) => void,
    onComplete?: () => void,
    onError?: (err: string) => void
  ) {
    if (this.isOfflineMode) {
      onError?.('Device is in Offline Mode. Disable offline mode or connect to Wi-Fi to download voice models.');
      return;
    }

    const modelIndex = this.models.findIndex((m) => m.id === modelId);
    if (modelIndex === -1) {
      onError?.('Model not found');
      return;
    }

    const model = { ...this.models[modelIndex] };
    model.status = 'downloading';
    model.downloadProgress = 0;
    model.downloadSpeed = '0 MB/s';
    this.models[modelIndex] = model;
    this.saveState();

    const controller = { abort: false };
    this.activeDownloads.set(modelId, controller);

    let current = 0;
    const total = 100;
    const totalBytes = model.sizeBytes;

    const intervalId = window.setInterval(() => {
      if (controller.abort) {
        window.clearInterval(intervalId);
        this.activeDownloads.delete(modelId);
        return;
      }

      // Simulate network speed variation between 12 MB/s and 28 MB/s (typical Android Wi-Fi)
      const chunkPct = 3 + Math.random() * 5;
      current = Math.min(total, current + chunkPct);

      const simSpeed = (14 + Math.random() * 10).toFixed(1) + ' MB/s';
      const mIdx = this.models.findIndex((m) => m.id === modelId);
      if (mIdx !== -1) {
        if (current >= 100) {
          window.clearInterval(intervalId);
          this.activeDownloads.delete(modelId);

          // Step 2: SHA-256 verification phase
          this.models[mIdx] = {
            ...this.models[mIdx],
            status: 'verifying',
            downloadProgress: 100,
            downloadSpeed: 'Verifying SHA-256...',
          };
          this.saveState();

          setTimeout(() => {
            const finalIdx = this.models.findIndex((m) => m.id === modelId);
            if (finalIdx !== -1) {
              this.models[finalIdx] = {
                ...this.models[finalIdx],
                status: 'ready',
                isDownloaded: true,
                downloadProgress: 100,
                downloadSpeed: undefined,
                lastDownloadedAt: new Date().toISOString().split('T')[0],
              };
              this.saveState();
              onComplete?.();
            }
          }, 650);
        } else {
          this.models[mIdx] = {
            ...this.models[mIdx],
            downloadProgress: Math.round(current),
            downloadSpeed: simSpeed,
          };
          this.saveState();
          onProgress?.(Math.round(current), simSpeed);
        }
      }
    }, 180);

    (controller as any).intervalId = intervalId;
  }

  public cancelDownload(modelId: string) {
    const active = this.activeDownloads.get(modelId);
    if (active) {
      active.abort = true;
      if (active.intervalId) window.clearInterval(active.intervalId);
      this.activeDownloads.delete(modelId);
    }

    const idx = this.models.findIndex((m) => m.id === modelId);
    if (idx !== -1) {
      this.models[idx] = {
        ...this.models[idx],
        status: 'idle',
        downloadProgress: 0,
        downloadSpeed: undefined,
      };
      this.saveState();
    }
  }

  public deleteModel(modelId: string) {
    this.cancelDownload(modelId);
    const idx = this.models.findIndex((m) => m.id === modelId);
    if (idx !== -1) {
      this.models[idx] = {
        ...this.models[idx],
        isDownloaded: false,
        status: 'idle',
        downloadProgress: 0,
        downloadSpeed: undefined,
        lastDownloadedAt: undefined,
      };
      this.saveState();
    }
  }

  public isEngineReady(): boolean {
    // Engine requires an ONNX model, voices pack, and phoneme lexicon
    const hasOnnx = this.models.some((m) => (m.type === 'quantized_int8' || m.type === 'fp16_standard') && m.isDownloaded);
    const hasVoices = this.models.some((m) => m.type === 'voices_pack' && m.isDownloaded);
    const hasLexicon = this.models.some((m) => m.type === 'espeak_lexicon' && m.isDownloaded);
    return hasOnnx && hasVoices && hasLexicon;
  }
}
