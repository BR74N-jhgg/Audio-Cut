import React, { useRef, useState } from 'react';
import { Upload, FolderPlus, ArrowRight, Sparkles } from 'lucide-react';
import { SAMPLE_FOOTAGES, SampleFootageItem } from '../utils/sampleFootage';
import { ThemeMode } from '../types';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample: (sample: SampleFootageItem) => void;
  isProcessingSample: boolean;
  theme: ThemeMode;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  onLoadSample,
  isProcessingSample,
  theme,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDark = theme === 'dark';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-10 my-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,.mp4,.mov,.mp3,.wav,.m4a,.aac,.webm,.ogg"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Main Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full max-w-2xl border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 relative overflow-hidden group shadow-xl ${
          isDragOver
            ? isDark
              ? 'border-cyan-400 bg-blue-600/10 scale-[1.01]'
              : 'border-[#0ABAB5] bg-[#0ABAB5]/10 scale-[1.01]'
            : isDark
            ? 'border-[#1e3260] bg-[#0a1128]/80 hover:border-cyan-500/50 hover:bg-[#0e1830]'
            : 'border-[#a2e5e0] bg-white/90 hover:border-[#0ABAB5] hover:bg-[#f6fcfe]'
        }`}
      >
        {/* Glow */}
        <div
          className={`absolute inset-0 pointer-events-none bg-gradient-to-b ${
            isDark ? 'from-blue-600/5 to-transparent' : 'from-[#0ABAB5]/5 to-transparent'
          }`}
        />

        {/* Central Icon */}
        <div
          className={`w-16 h-16 rounded-2xl border flex items-center justify-center group-hover:scale-105 transition-all shadow-xl ${
            isDark
              ? 'bg-[#111f3d] border-[#1e3260] text-cyan-400 group-hover:border-cyan-400/50'
              : 'bg-[#e4f7f6] border-[#a2e5e0] text-[#0ABAB5] group-hover:border-[#0ABAB5]'
          }`}
        >
          <Upload className="w-8 h-8 group-hover:-translate-y-0.5 transition-transform" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3
            className={`text-xl sm:text-2xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Drop your footage here
          </h3>
          <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            MP4, MOV, MP3, WAV and other audio/video files (No file size limits)
          </p>
        </div>

        {/* Select Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className={`mt-2 px-6 py-3 rounded-xl text-xs font-bold text-white shadow-xl flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
            isDark
              ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25'
              : 'bg-[#0ABAB5] hover:bg-[#089c98] shadow-[#0ABAB5]/25'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          <span>Select video or audio files</span>
        </button>

        {/* Badge */}
        <div
          className={`flex items-center gap-2 text-[11px] mt-2 font-mono ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-cyan-400' : 'bg-[#0ABAB5]'}`} />
          <span>Client-side private processing • No files uploaded to external servers</span>
        </div>
      </div>

      {/* Quick Test Demo Footage Section */}
      <div
        className={`mt-6 w-full max-w-2xl rounded-2xl p-4 border transition-colors ${
          isDark
            ? 'bg-[#0e1830]/60 border-[#1b2e59]'
            : 'bg-white/80 border-[#b2ebe7] shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-xs font-semibold flex items-center gap-1.5 ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`} />
            Don't have footage handy? Load sample video or audio:
          </span>
          {isProcessingSample && (
            <span
              className={`text-[11px] font-medium animate-pulse ${
                isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'
              }`}
            >
              Synthesizing sample media...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SAMPLE_FOOTAGES.map((sample) => (
            <button
              key={sample.id}
              disabled={isProcessingSample}
              onClick={() => onLoadSample(sample)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 group flex flex-col justify-between ${
                isDark
                  ? 'bg-[#080d1a] border-[#1e3260] hover:border-cyan-400 hover:bg-[#111f3d]'
                  : 'bg-[#f0fbfb] border-[#ccf4f1] hover:border-[#0ABAB5] hover:bg-white shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                      isDark
                        ? 'text-cyan-300 bg-blue-600/20 border-cyan-400/30'
                        : 'text-[#0d746f] bg-[#0ABAB5]/15 border-[#0ABAB5]/30'
                    }`}
                  >
                    {sample.mediaType}
                  </span>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {sample.duration}s
                  </span>
                </div>
                <div
                  className={`font-semibold text-xs transition-colors line-clamp-1 ${
                    isDark ? 'text-white group-hover:text-cyan-300' : 'text-slate-900 group-hover:text-[#0ABAB5]'
                  }`}
                >
                  {sample.name}
                </div>
                <div className={`text-[10px] line-clamp-2 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {sample.description}
                </div>
              </div>

              <div
                className={`mt-2.5 flex items-center text-[10px] font-medium transition-colors ${
                  isDark
                    ? 'text-slate-300 group-hover:text-cyan-400'
                    : 'text-slate-600 group-hover:text-[#0ABAB5]'
                }`}
              >
                <span>Load & Test</span>
                <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
