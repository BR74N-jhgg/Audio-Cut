import React from 'react';
import { X, Film, Music, Check, Sliders, ShieldCheck, ArrowRight, FileCheck } from 'lucide-react';
import { ProcessingSettings, ThemeMode } from '../types';

export interface PendingImportItem {
  name: string;
  sizeFormatted: string;
  type: 'video' | 'audio';
  file?: File;
  sampleGenerator?: () => Promise<{ file: File; buffer: AudioBuffer; url: string }>;
}

interface ImportConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pendingItems: PendingImportItem[];
  settings: ProcessingSettings;
  onOpenSettings: () => void;
  theme: ThemeMode;
}

export const ImportConfirmModal: React.FC<ImportConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  pendingItems,
  settings,
  onOpenSettings,
  theme,
}) => {
  if (!isOpen || pendingItems.length === 0) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#0a1128] border-[#1b2e59]'
            : 'bg-white border-[#b2ebe7] shadow-xl'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-[#1b2e59] bg-[#0e1830]/70' : 'border-[#ccf4f1] bg-[#f8fdfd]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-md ${
                isDark
                  ? 'bg-blue-600/20 text-cyan-400 border border-cyan-400/30'
                  : 'bg-[#0ABAB5]/20 text-[#0d746f] border border-[#0ABAB5]/40'
              }`}
            >
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h2
                className={`text-sm font-semibold tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Confirm Import & Silence Removal
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Ready to analyze and remove silent segments from {pendingItems.length}{' '}
                {pendingItems.length === 1 ? 'file' : 'files'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-[#111f3d]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-[#f0fbfb]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* File list preview */}
          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Files to Process ({pendingItems.length})
            </label>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {pendingItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isDark
                      ? 'bg-[#0e1830]/60 border-[#1e3260]'
                      : 'bg-[#f0fbfb] border-[#ccf4f1]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'video'
                          ? isDark
                            ? 'bg-blue-600/20 text-cyan-300'
                            : 'bg-[#0ABAB5]/20 text-[#0d746f]'
                          : isDark
                          ? 'bg-indigo-600/20 text-indigo-300'
                          : 'bg-teal-600/20 text-teal-700'
                      }`}
                    >
                      {item.type === 'video' ? (
                        <Film className="w-3.5 h-3.5" />
                      ) : (
                        <Music className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span
                      className={`font-semibold truncate max-w-xs ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[10px] shrink-0 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {item.sizeFormatted}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Settings Snapshot */}
          <div
            className={`p-3.5 rounded-xl border space-y-2 ${
              isDark
                ? 'bg-[#0e1830]/40 border-[#1e3260]'
                : 'bg-[#f8fdfd] border-[#ccf4f1]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`font-semibold text-xs flex items-center gap-1.5 ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                <Sliders className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`} />
                Detection Parameters
              </span>
              <button
                type="button"
                onClick={onOpenSettings}
                className={`text-[11px] font-semibold underline cursor-pointer ${
                  isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-[#0ABAB5] hover:text-[#089c98]'
                }`}
              >
                Edit Preset
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div
                className={`p-2 rounded border ${
                  isDark ? 'bg-[#080d1a] border-[#1e3260] text-slate-300' : 'bg-white border-[#ccf4f1] text-slate-700'
                }`}
              >
                Preset: <b className="capitalize font-sans text-xs">{settings.preset}</b>
              </div>
              <div
                className={`p-2 rounded border ${
                  isDark ? 'bg-[#080d1a] border-[#1e3260] text-slate-300' : 'bg-white border-[#ccf4f1] text-slate-700'
                }`}
              >
                Threshold:{' '}
                <span className={isDark ? 'text-cyan-400 font-bold' : 'text-[#0ABAB5] font-bold'}>
                  {settings.sensitivityMode === 'auto'
                    ? `Auto (${settings.sensitivityLevel})`
                    : `${settings.thresholdDb} dB`}
                </span>
              </div>
              <div
                className={`p-2 rounded border ${
                  isDark ? 'bg-[#080d1a] border-[#1e3260] text-slate-300' : 'bg-white border-[#ccf4f1] text-slate-700'
                }`}
              >
                Padding: {Math.round(settings.padBefore * 1000)}ms / {Math.round(settings.padAfter * 1000)}ms
              </div>
              <div
                className={`p-2 rounded border ${
                  isDark ? 'bg-[#080d1a] border-[#1e3260] text-slate-300' : 'bg-white border-[#ccf4f1] text-slate-700'
                }`}
              >
                Min Silence: {settings.minSilenceDuration}s
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t ${
            isDark ? 'border-[#1b2e59] bg-[#0e1830]/80' : 'border-[#ccf4f1] bg-[#f8fdfd]'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-[#111f3d]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#f0fbfb]'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99] ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25'
                : 'bg-[#0ABAB5] hover:bg-[#089c98] shadow-[#0ABAB5]/25'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Process & Remove Silence</span>
          </button>
        </div>
      </div>
    </div>
  );
};
