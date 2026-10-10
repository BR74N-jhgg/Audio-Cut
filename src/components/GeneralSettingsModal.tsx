import React, { useState } from 'react';
import { X, Moon, Sun } from 'lucide-react';
import { ThemeMode } from '../types';

interface GeneralSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const GeneralSettingsModal: React.FC<GeneralSettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'general' | 'privacy'>('export');
  const [exportFolder, setExportFolder] = useState('~/Movies/AutoEdit_Exports');
  const [autoLaunchNle, setAutoLaunchNle] = useState(false);
  const [addGapBetweenClips, setAddGapBetweenClips] = useState(false);
  const [allowTelemetry, setAllowTelemetry] = useState(false);
  const [hardwareAccel, setHardwareAccel] = useState(true);

  const isDark = theme === 'dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-colors ${
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
          <h2 className={`text-base font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-[#111f3d]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-[#f0fbfb]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabbed Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div
            className={`w-44 border-r p-3 space-y-1 text-xs ${
              isDark ? 'border-[#1b2e59] bg-[#080d1a]/50' : 'border-[#ccf4f1] bg-[#f8fdfd]'
            }`}
          >
            {(['export', 'general', 'privacy'] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`w-full text-left px-3 py-2 rounded-xl font-semibold capitalize transition-colors cursor-pointer ${
                  activeTab === tabKey
                    ? isDark
                      ? 'bg-blue-600/20 text-cyan-300 border border-cyan-400/30'
                      : 'bg-[#0ABAB5]/15 text-[#0d746f] border border-[#0ABAB5]/30'
                    : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-[#111f3d]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#e4f7f6]'
                }`}
              >
                {tabKey}
              </button>
            ))}
          </div>

          {/* Right Pane */}
          <div className="flex-1 p-6 overflow-y-auto text-xs space-y-5">
            {activeTab === 'export' && (
              <div className="space-y-5">
                <div>
                  <label className={`font-semibold block mb-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    Export Folder
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={exportFolder}
                      onChange={(e) => setExportFolder(e.target.value)}
                      className={`flex-1 border rounded-xl px-3 py-2 outline-none font-mono ${
                        isDark
                          ? 'bg-[#080d1a] border-[#1e3260] text-white focus:border-cyan-400'
                          : 'bg-white border-[#ccf4f1] text-slate-800 focus:border-[#0ABAB5]'
                      }`}
                    />
                    <button
                      onClick={() => alert('Folder selected: ' + exportFolder)}
                      className={`px-3 py-2 border rounded-xl font-medium cursor-pointer ${
                        isDark
                          ? 'bg-[#111f3d] hover:bg-[#16284f] border-[#1e3260] text-slate-300'
                          : 'bg-[#f0fbfb] hover:bg-[#e4f7f6] border-[#ccf4f1] text-slate-700'
                      }`}
                    >
                      Browse...
                    </button>
                  </div>
                </div>

                <div className={`pt-2 border-t space-y-3 ${isDark ? 'border-[#1b2e59]' : 'border-[#ccf4f1]'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoLaunchNle}
                      onChange={(e) => setAutoLaunchNle(e.target.checked)}
                      className={`w-4 h-4 rounded cursor-pointer ${isDark ? 'accent-cyan-400' : 'accent-[#0ABAB5]'}`}
                    />
                    <div>
                      <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        Launch Final Cut Pro / Premiere automatically
                      </div>
                      <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Opens the exported sequence directly in your default NLE
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addGapBetweenClips}
                      onChange={(e) => setAddGapBetweenClips(e.target.checked)}
                      className={`w-4 h-4 rounded cursor-pointer ${isDark ? 'accent-cyan-400' : 'accent-[#0ABAB5]'}`}
                    />
                    <div>
                      <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        Add gaps between clips
                      </div>
                      <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Leaves micro-spacers for adding transitions
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hardwareAccel}
                      onChange={(e) => setHardwareAccel(e.target.checked)}
                      className={`w-4 h-4 rounded cursor-pointer ${isDark ? 'accent-cyan-400' : 'accent-[#0ABAB5]'}`}
                    />
                    <div>
                      <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        Apple Silicon / GPU Acceleration
                      </div>
                      <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Uses WebAudio & WebCodecs DSP threads on macOS / iOS
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="space-y-4">
                <div>
                  <label className={`font-semibold block mb-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    Active Appearance Theme
                  </label>
                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    {/* Navy Blue Option */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isDark) onToggleTheme();
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                        isDark
                          ? 'bg-[#111f3d] border-cyan-400 text-white shadow-md'
                          : 'bg-[#f0fbfb] border-[#ccf4f1] text-slate-700 hover:border-[#0ABAB5]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Moon className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <div>
                          <div className="font-semibold text-xs">Navy Blue</div>
                          <div className="text-[10px] text-slate-400">Dark Mode Palette</div>
                        </div>
                      </div>
                      {isDark && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                    </button>

                    {/* Tiffany Blue Option */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isDark) onToggleTheme();
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                        !isDark
                          ? 'bg-[#e4f7f6] border-[#0ABAB5] text-[#0d746f] shadow-md'
                          : 'bg-[#080d1a] border-[#1e3260] text-slate-300 hover:border-cyan-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sun className={`w-4 h-4 ${!isDark ? 'text-[#0ABAB5]' : 'text-slate-400'}`} />
                        <div>
                          <div className="font-semibold text-xs">Tiffany Blue</div>
                          <div className="text-[10px] text-slate-500">Light Mode Palette</div>
                        </div>
                      </div>
                      {!isDark && <span className="w-2 h-2 rounded-full bg-[#0ABAB5]" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`font-semibold block mb-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    Interface Language
                  </label>
                  <select
                    className={`w-full border rounded-xl px-3 py-2 ${
                      isDark
                        ? 'bg-[#080d1a] border-[#1e3260] text-white'
                        : 'bg-white border-[#ccf4f1] text-slate-800'
                    }`}
                  >
                    <option value="en">English (Default)</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ja">日本語</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    isDark ? 'bg-[#080d1a] border-[#1e3260]' : 'bg-[#f0fbfb] border-[#ccf4f1]'
                  }`}
                >
                  <div>
                    <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      Allow anonymous telemetry
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Helps improve silence detection threshold accuracy
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowTelemetry}
                    onChange={(e) => setAllowTelemetry(e.target.checked)}
                    className={`w-4 h-4 rounded cursor-pointer ${isDark ? 'accent-cyan-400' : 'accent-[#0ABAB5]'}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div
                    className={`p-3 rounded-xl border ${
                      isDark ? 'bg-[#080d1a]/50 border-[#1e3260]' : 'bg-white border-[#ccf4f1]'
                    }`}
                  >
                    <div className={`font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      What we collect:
                    </div>
                    <ul className={`text-[10px] space-y-1 list-disc pl-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <li>Total duration of files processed</li>
                      <li>Number of silence cuts generated</li>
                      <li>App platform and version</li>
                    </ul>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      isDark ? 'bg-[#080d1a]/50 border-[#1e3260]' : 'bg-white border-[#ccf4f1]'
                    }`}
                  >
                    <div className={`font-semibold mb-1 ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`}>
                      What we NEVER collect:
                    </div>
                    <ul className={`text-[10px] space-y-1 list-disc pl-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <li>NO video or audio recordings</li>
                      <li>NO spoken speech or transcripts</li>
                      <li>NO personal file names or user paths</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-4 border-t flex justify-end ${
            isDark ? 'border-[#1b2e59] bg-[#0e1830]/80' : 'border-[#ccf4f1] bg-[#f8fdfd]'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/25'
                : 'bg-[#0ABAB5] hover:bg-[#089c98] shadow-md shadow-[#0ABAB5]/25'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
