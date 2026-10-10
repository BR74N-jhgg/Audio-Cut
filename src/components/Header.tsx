import React from 'react';
import {
  Scissors,
  Sliders,
  Settings,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Palette
} from 'lucide-react';
import { ProcessingSettings, ThemeMode } from '../types';

interface HeaderProps {
  sessionName: string;
  setSessionName: (name: string) => void;
  settings: ProcessingSettings;
  onOpenProcessingSettings: () => void;
  onOpenGeneralSettings: () => void;
  onResetSession: () => void;
  isIosMode: boolean;
  setIsIosMode: (val: boolean) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  hasFiles: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  sessionName,
  setSessionName,
  settings,
  onOpenProcessingSettings,
  onOpenGeneralSettings,
  onResetSession,
  isIosMode,
  setIsIosMode,
  theme,
  onToggleTheme,
  hasFiles,
}) => {
  const isDark = theme === 'dark';

  return (
    <header
      className={`border-b backdrop-blur-xl px-4 py-3 select-none transition-colors duration-200 ${
        isDark
          ? 'border-[#1b2e59] bg-[#0a1128]/90 text-slate-100'
          : 'border-[#b2ebe7] bg-white/90 text-slate-800 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: macOS Traffic Lights + App Brand */}
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 mr-1">
            <button
              onClick={onResetSession}
              title="New Session / Clear"
              className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-400 border border-rose-600/40 transition-colors cursor-pointer"
            />
            <button
              title="Minimize"
              className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-400 border border-amber-600/40 transition-colors cursor-pointer"
            />
            <button
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                } else {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              title="Fullscreen"
              className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-400 border border-emerald-600/40 transition-colors cursor-pointer"
            />
          </div>

          {/* Logo */}
          <div
            className={`flex items-center gap-2 pl-2 border-l ${
              isDark ? 'border-[#1e3260]' : 'border-[#ccf4f1]'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-md transition-colors ${
                isDark
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/20'
                  : 'bg-gradient-to-br from-[#0ABAB5] to-[#089c98] shadow-[#0ABAB5]/25'
              }`}
            >
              <Scissors className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight flex items-center gap-1.5">
              AutoEdit
              <span
                className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border transition-colors ${
                  isDark
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-[#0ABAB5]/15 text-[#0d746f] border-[#0ABAB5]/30'
                }`}
              >
                PRO
              </span>
            </span>
          </div>

          {/* Session editable title */}
          <div
            className={`hidden sm:flex items-center gap-2 ml-2 pl-3 border-l ${
              isDark ? 'border-[#1e3260]' : 'border-[#ccf4f1]'
            }`}
          >
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className={`text-xs font-medium px-2 py-1 rounded transition-colors border outline-none w-36 ${
                isDark
                  ? 'bg-transparent text-slate-300 hover:text-white focus:text-white focus:bg-[#111f3d] border-transparent focus:border-[#2563eb]'
                  : 'bg-transparent text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-[#e4f7f6] border-transparent focus:border-[#0ABAB5]'
              }`}
              title="Click to rename session"
            />
          </div>
        </div>

        {/* Center: Processing Configuration Badges */}
        <div className="hidden lg:flex items-center gap-6 text-xs">
          {/* Preset */}
          <button
            onClick={onOpenProcessingSettings}
            className="flex flex-col items-center group text-left cursor-pointer hover:opacity-90 transition-opacity"
          >
            <span
              className={`text-[10px] uppercase tracking-wider font-medium ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Preset
            </span>
            <span
              className={`text-sm font-semibold capitalize flex items-center gap-1 ${
                isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-[#0ABAB5]'
              }`}
            >
              {settings.preset}
            </span>
          </button>

          {/* Threshold */}
          <button
            onClick={onOpenProcessingSettings}
            className="flex flex-col items-center group text-left cursor-pointer hover:opacity-90 transition-opacity"
          >
            <span
              className={`text-[10px] uppercase tracking-wider font-medium ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Threshold
            </span>
            <span
              className={`text-sm font-semibold flex items-center gap-1 ${
                isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-[#0ABAB5]'
              }`}
            >
              {settings.sensitivityMode === 'auto' ? 'Auto' : `${settings.thresholdDb} dB`}
              <span className={`text-[10px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                per file
              </span>
            </span>
          </button>

          {/* White cuts out */}
          <button
            onClick={onOpenProcessingSettings}
            className="flex flex-col items-center group text-left cursor-pointer hover:opacity-90 transition-opacity"
          >
            <span
              className={`text-[10px] uppercase tracking-wider font-medium ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              White Cuts Out
            </span>
            <span
              className={`text-sm font-semibold ${
                isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-[#0ABAB5]'
              }`}
            >
              {settings.whiteCutsOut.toUpperCase()}
            </span>
          </button>

          {/* Shortest cut */}
          <button
            onClick={onOpenProcessingSettings}
            className="flex flex-col items-center group text-left cursor-pointer hover:opacity-90 transition-opacity"
          >
            <span
              className={`text-[10px] uppercase tracking-wider font-medium ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Shortest Cut
            </span>
            <span
              className={`text-sm font-semibold ${
                isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-[#0ABAB5]'
              }`}
            >
              {settings.minSilenceDuration}s
            </span>
          </button>
        </div>

        {/* Right: Actions & Theme Switcher */}
        <div className="flex items-center gap-2">
          {/* Navy Blue vs Tiffany Blue Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
              isDark
                ? 'bg-[#111f3d] border-[#1e3260] text-cyan-300 hover:border-cyan-400 hover:bg-[#16284f]'
                : 'bg-[#e4f7f6] border-[#a2e5e0] text-[#0d746f] hover:border-[#0ABAB5] hover:bg-[#d5f3f2]'
            }`}
            title={
              isDark
                ? 'Currently Navy Blue Dark Mode. Click for Tiffany Blue Light Mode'
                : 'Currently Tiffany Blue Light Mode. Click for Navy Blue Dark Mode'
            }
          >
            {isDark ? (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Navy Blue</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-[#0ABAB5]" />
                <span className="hidden sm:inline">Tiffany Blue</span>
              </>
            )}
          </button>

          {/* Customize Settings Modal */}
          <button
            onClick={onOpenProcessingSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#111f3d] text-slate-200 border-[#1e3260] hover:border-slate-500 hover:text-white'
                : 'bg-white text-slate-700 border-[#b2ebe7] hover:border-[#0ABAB5] hover:text-slate-900 shadow-sm'
            }`}
            title="Customize Thresholds & Padding"
          >
            <Sliders className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`} />
            <span className="hidden sm:inline">Customize</span>
          </button>

          {/* General App Settings */}
          <button
            onClick={onOpenGeneralSettings}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-white bg-[#111f3d] hover:bg-[#16284f] border-[#1e3260]'
                : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-[#e4f7f6] border-[#b2ebe7] shadow-sm'
            }`}
            title="Export & App Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* iOS / Mac view switcher */}
          <button
            onClick={() => setIsIosMode(!isIosMode)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isIosMode
                ? isDark
                  ? 'bg-blue-600/30 text-cyan-300 border-blue-500/60'
                  : 'bg-[#0ABAB5]/20 text-[#0d746f] border-[#0ABAB5]'
                : isDark
                ? 'bg-[#111f3d] text-slate-400 hover:text-white border-[#1e3260]'
                : 'bg-white text-slate-600 hover:text-slate-900 border-[#b2ebe7] shadow-sm'
            }`}
            title={isIosMode ? 'Switch to macOS Desktop Mode' : 'Switch to iOS Mobile/Touch Mode'}
          >
            {isIosMode ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
