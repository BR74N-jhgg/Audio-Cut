import React from 'react';
import { Cpu, Scissors, Activity, Radio } from 'lucide-react';
import { ThemeMode } from '../types';

interface ProcessingLoadingModalProps {
  isOpen: boolean;
  currentFileName: string;
  currentIndex: number;
  totalFiles: number;
  percent: number;
  statusMessage: string;
  theme: ThemeMode;
}

export const ProcessingLoadingModal: React.FC<ProcessingLoadingModalProps> = ({
  isOpen,
  currentFileName,
  currentIndex,
  totalFiles,
  percent,
  statusMessage,
  theme,
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`border rounded-3xl w-full max-w-md p-8 shadow-2xl flex flex-col items-center text-center space-y-6 relative overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#0a1128] border-[#1b2e59]'
            : 'bg-white border-[#b2ebe7] shadow-xl'
        }`}
      >
        {/* Subtle radial glow */}
        <div
          className={`absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-b ${
            isDark
              ? 'from-blue-600 via-cyan-400 to-transparent'
              : 'from-[#0ABAB5] via-teal-300 to-transparent'
          }`}
        />

        {/* Pulsing Animated DSP Icon */}
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-full border-2 flex items-center justify-center relative z-10 transition-colors shadow-2xl ${
              isDark
                ? 'bg-[#111f3d] border-cyan-400 text-cyan-300 shadow-blue-500/30'
                : 'bg-[#e4f7f6] border-[#0ABAB5] text-[#0d746f] shadow-[#0ABAB5]/30'
            }`}
          >
            <Scissors className="w-8 h-8 animate-pulse" />
          </div>

          {/* Animated pulsing outer rings */}
          <div
            className={`absolute inset-0 rounded-full animate-ping opacity-25 ${
              isDark ? 'bg-cyan-400' : 'bg-[#0ABAB5]'
            }`}
          />
          <div
            className={`absolute -inset-2 rounded-full animate-pulse opacity-40 border border-dashed ${
              isDark ? 'border-cyan-400' : 'border-[#0ABAB5]'
            }`}
          />
        </div>

        {/* Title and File Information */}
        <div className="space-y-1.5 relative z-10">
          <h3
            className={`text-lg font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Processing Media
          </h3>
          <p
            className={`text-xs font-medium max-w-xs truncate mx-auto ${
              isDark ? 'text-cyan-300' : 'text-[#0d746f]'
            }`}
          >
            {currentFileName || 'Analyzing footage...'}
          </p>
          <div
            className={`text-[11px] font-mono ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            File {currentIndex} of {totalFiles}
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full space-y-2 relative z-10">
          <div className="flex items-center justify-between text-xs">
            <span
              className={`flex items-center gap-1.5 font-medium ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>{statusMessage}</span>
            </span>
            <span
              className={`font-mono font-bold ${
                isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'
              }`}
            >
              {percent}%
            </span>
          </div>

          <div
            className={`w-full rounded-full h-3 overflow-hidden border ${
              isDark
                ? 'bg-[#080d1a] border-[#1e3260]'
                : 'bg-[#f0fbfb] border-[#ccf4f1]'
            }`}
          >
            <div
              className={`h-full transition-all duration-300 ease-out ${
                isDark
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-400 shadow-md shadow-cyan-400/30'
                  : 'bg-gradient-to-r from-[#0ABAB5] to-[#089c98] shadow-md shadow-[#0ABAB5]/30'
              }`}
              style={{ width: `${Math.max(5, percent)}%` }}
            />
          </div>
        </div>

        {/* Engine Badge */}
        <div
          className={`flex items-center gap-2 text-[10px] font-mono pt-2 border-t w-full justify-center ${
            isDark ? 'border-[#1b2e59] text-slate-400' : 'border-[#ccf4f1] text-slate-500'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>WebAudio DSP Hardware Thread Active</span>
        </div>
      </div>
    </div>
  );
};
