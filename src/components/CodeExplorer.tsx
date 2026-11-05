import React, { useState } from 'react';
import {
  FileCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Cpu,
  Database,
  Radio,
  FileCheck,
} from 'lucide-react';
import { KOTLIN_PROJECT_FILES, exportAndroidProjectZip, AndroidCodeFile } from '../services/androidProjectGenerator';

export const CodeExplorer: React.FC = () => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activeFile: AndroidCodeFile = KOTLIN_PROJECT_FILES[selectedFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsExporting(true);
      const blob = await exportAndroidProjectZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kokoro-tts-android.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-950/60">
        <div>
          <div className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-blue-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Android Kotlin & Jetpack Compose Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Production-ready native implementation for Android Studio Ladybug / Koala
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied!' : 'Copy File'}</span>
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? 'Packaging ZIP...' : 'Download Project ZIP'}</span>
          </button>
        </div>
      </div>

      {/* Main Split: Left Files Sidebar, Right Code View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Files List */}
        <div className="w-72 shrink-0 border-r border-slate-800 bg-slate-950/30 overflow-y-auto p-3 space-y-1">
          <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Project Modules
          </p>

          {KOTLIN_PROJECT_FILES.map((file, idx) => {
            const isSelected = idx === selectedFileIndex;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedFileIndex(idx)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-blue-600/15 text-blue-300 font-semibold border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <FileCode className={`h-4 w-4 shrink-0 mt-0.5 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{file.filename}</p>
                  <p className="text-[10px] text-slate-500 truncate">{file.path}</p>
                </div>
              </button>
            );
          })}

          {/* Architecture Highlights Box */}
          <div className="mt-4 p-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 text-[11px] space-y-2 text-slate-400">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-blue-400" />
              <span>Target Android Stack</span>
            </p>
            <ul className="space-y-1 text-[11px]">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                <span>ONNX Runtime Mobile v1.19</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>Jetpack Compose BOM 2024.10</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                <span>Android Media3 MediaSession</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                <span>Scoped Internal Storage</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Code Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/80">
          {/* File description banner */}
          <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs text-slate-300">
            <span className="font-mono text-blue-400 text-[11px]">{activeFile.path}</span>
            <span className="text-[11px] text-slate-400">{activeFile.language.toUpperCase()}</span>
          </div>

          <div className="px-5 py-2 border-b border-slate-800/50 bg-slate-900/20 text-xs text-slate-400">
            {activeFile.description}
          </div>

          {/* Syntax Highlighted Code Canvas */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
            <pre className="whitespace-pre">
              <code>{activeFile.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
