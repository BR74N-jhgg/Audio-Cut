import React from 'react';
import { Film, Music, Trash2, CheckCircle2, Plus, RefreshCw, Scissors } from 'lucide-react';
import { ProcessedFile, ThemeMode } from '../types';
import { formatDurationHuman } from '../utils/exporters';

interface BatchQueueProps {
  files: ProcessedFile[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onRemoveFile: (fileId: string) => void;
  onAddMoreFiles: () => void;
  onProcessAll: () => void;
  isProcessingBatch: boolean;
  theme: ThemeMode;
}

export const BatchQueue: React.FC<BatchQueueProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onRemoveFile,
  onAddMoreFiles,
  onProcessAll,
  isProcessingBatch,
  theme,
}) => {
  const isDark = theme === 'dark';
  const pendingCount = files.filter((f) => f.status === 'idle').length;
  const doneCount = files.filter((f) => f.status === 'done').length;

  return (
    <div
      className={`border rounded-2xl p-4 shadow-xl space-y-4 transition-colors ${
        isDark
          ? 'bg-[#0a1128] border-[#1b2e59]'
          : 'bg-white border-[#b2ebe7] shadow-sm'
      }`}
    >
      {/* Queue Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Batch Queue ({files.length} {files.length === 1 ? 'file' : 'files'})
          </span>
          {doneCount > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                isDark
                  ? 'bg-blue-600/20 text-cyan-300 border-cyan-400/30'
                  : 'bg-[#0ABAB5]/15 text-[#0d746f] border-[#0ABAB5]/30'
              }`}
            >
              {doneCount} Processed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddMoreFiles}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#111f3d] hover:bg-[#16284f] text-slate-300 border-[#1e3260]'
                : 'bg-[#f0fbfb] hover:bg-[#e4f7f6] text-slate-700 border-[#ccf4f1]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Files</span>
          </button>

          {pendingCount > 0 && (
            <button
              onClick={onProcessAll}
              disabled={isProcessingBatch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25'
                  : 'bg-[#0ABAB5] hover:bg-[#089c98] shadow-[#0ABAB5]/25'
              }`}
            >
              {isProcessingBatch ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Scissors className="w-3.5 h-3.5" />
              )}
              <span>Process All ({pendingCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Queue Items */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {files.map((f) => {
          const isActive = f.id === activeFileId;

          return (
            <div
              key={f.id}
              onClick={() => onSelectFile(f.id)}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                isActive
                  ? isDark
                    ? 'bg-[#111f3d] border-cyan-400 shadow-md shadow-blue-500/10'
                    : 'bg-[#f0fbfb] border-[#0ABAB5] shadow-md shadow-[#0ABAB5]/10'
                  : isDark
                  ? 'bg-[#0e1830]/60 border-[#1e3260] hover:border-slate-500 hover:bg-[#111f3d]'
                  : 'bg-white border-[#ccf4f1] hover:border-[#0ABAB5] hover:bg-[#f8fdfd]'
              }`}
            >
              {/* Left Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    f.mediaType === 'video'
                      ? isDark
                        ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/40'
                        : 'bg-[#0ABAB5]/15 text-[#0d746f] border border-[#0ABAB5]/30'
                      : isDark
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-teal-600/15 text-teal-700 border border-teal-500/30'
                  }`}
                >
                  {f.mediaType === 'video' ? <Film className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold truncate max-w-xs sm:max-w-md ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {f.name}
                    </span>
                    {isActive && (
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                          isDark
                            ? 'bg-blue-600/30 text-cyan-300 border-cyan-400/40'
                            : 'bg-[#0ABAB5]/20 text-[#0d746f] border-[#0ABAB5]/40'
                        }`}
                      >
                        Active in Timeline
                      </span>
                    )}
                  </div>
                  <div
                    className={`flex items-center gap-2 text-[10px] mt-0.5 font-mono ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    <span>{f.sizeFormatted}</span>
                    <span>•</span>
                    <span>Orig: {formatDurationHuman(f.originalDuration)}</span>
                    {f.status === 'done' && (
                      <>
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'
                          }`}
                        >
                          New: {formatDurationHuman(f.newDuration)} (-{f.timeSavedPercentage}%)
                        </span>
                        <span>•</span>
                        <span className="text-rose-400">{f.cutsCount} cuts</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-3 shrink-0">
                {f.status === 'analyzing' && (
                  <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{f.progress}%</span>
                  </div>
                )}

                {f.status === 'done' && (
                  <div
                    className={`flex items-center gap-1.5 text-xs font-medium ${
                      isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Ready</span>
                  </div>
                )}

                {f.status === 'idle' && (
                  <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Queued
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(f.id);
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isDark
                      ? 'text-slate-400 hover:text-rose-400 hover:bg-[#111f3d]'
                      : 'text-slate-400 hover:text-rose-500 hover:bg-[#f0fbfb]'
                  }`}
                  title="Remove from queue"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
