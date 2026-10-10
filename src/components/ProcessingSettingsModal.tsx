import React, { useState } from 'react';
import { X, Sliders, Check } from 'lucide-react';
import { ProcessingSettings, PresetType, SensitivityLevel, SensitivityMode, WhiteCutsOutMode, ThemeMode } from '../types';
import { PRESET_CONFIGS } from '../utils/presets';

interface ProcessingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ProcessingSettings;
  onApplySettings: (settings: ProcessingSettings) => void;
  theme: ThemeMode;
}

export const ProcessingSettingsModal: React.FC<ProcessingSettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onApplySettings,
  theme,
}) => {
  const [draft, setDraft] = useState<ProcessingSettings>({ ...currentSettings });
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleSelectPreset = (preset: PresetType) => {
    const config = PRESET_CONFIGS[preset];
    if (config) {
      setDraft({ ...config.settings });
    }
  };

  const handleSave = () => {
    onApplySettings(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`border rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-colors ${
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
          <div>
            <h2 className={`text-base font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Processing Settings
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Fine-tune silence thresholds, speech padding, and cut rules
            </p>
          </div>
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

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-6 flex-1 text-xs">
          {/* Section 1: Presets */}
          <div>
            <label
              className={`text-[11px] font-semibold tracking-wider uppercase block mb-2.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Start from a preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(PRESET_CONFIGS) as PresetType[]).map((pKey) => {
                const p = PRESET_CONFIGS[pKey];
                const isSelected = draft.preset === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => handleSelectPreset(pKey)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? isDark
                          ? 'bg-[#111f3d] border-cyan-400 shadow-sm shadow-blue-500/20'
                          : 'bg-[#f0fbfb] border-[#0ABAB5] shadow-sm shadow-[#0ABAB5]/20'
                        : isDark
                        ? 'bg-[#0e1830]/50 border-[#1e3260] hover:border-slate-500 hover:bg-[#111f3d]'
                        : 'bg-white border-[#ccf4f1] hover:border-[#0ABAB5] hover:bg-[#f8fdfd]'
                    }`}
                  >
                    {isSelected && (
                      <span
                        className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                          isDark ? 'bg-cyan-400' : 'bg-[#0ABAB5]'
                        }`}
                      />
                    )}
                    <div
                      className={`font-semibold text-xs mb-0.5 ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {p.title}
                    </div>
                    <div className={`text-[10px] leading-tight line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {p.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: White cuts out */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className={`text-[11px] font-semibold tracking-wider uppercase ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                White Cuts Out
              </label>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                How silence is isolated
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', title: 'All cleanup', desc: 'Removes all silence and breath pauses' },
                { id: 'inbetween', title: 'In-between', desc: 'Trims gaps between distinct phrases' },
                { id: 'off', title: 'Minimal', desc: 'Only removes extended dead air' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, whiteCutsOut: opt.id as WhiteCutsOutMode })}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    draft.whiteCutsOut === opt.id
                      ? isDark
                        ? 'bg-blue-600/20 border-cyan-400 text-white'
                        : 'bg-[#0ABAB5]/15 border-[#0ABAB5] text-slate-900'
                      : isDark
                      ? 'bg-[#0e1830]/40 border-[#1e3260] text-slate-400 hover:border-slate-500'
                      : 'bg-white border-[#ccf4f1] text-slate-600 hover:border-[#0ABAB5]'
                  }`}
                >
                  <div className="font-semibold text-xs">{opt.title}</div>
                  <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Silence Threshold */}
          <div
            className={`border rounded-xl p-4 space-y-3 ${
              isDark ? 'bg-[#0e1830]/60 border-[#1e3260]' : 'bg-[#f8fdfd] border-[#b2ebe7]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <label
                  className={`text-[11px] font-semibold tracking-wider uppercase ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Silence Threshold
                </label>
                <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {draft.sensitivityMode === 'auto'
                    ? 'Analyzes audio noise floor dynamically per file'
                    : `Cuts any sound quieter than ${draft.thresholdDb} dB`}
                </div>
              </div>

              {/* Mode Toggle: Auto vs Manual */}
              <div
                className={`flex items-center p-1 rounded-lg border ${
                  isDark ? 'bg-[#080d1a] border-[#1e3260]' : 'bg-white border-[#ccf4f1]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, sensitivityMode: 'auto' })}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                    draft.sensitivityMode === 'auto'
                      ? isDark
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#0ABAB5] text-white'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, sensitivityMode: 'manual' })}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                    draft.sensitivityMode === 'manual'
                      ? isDark
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#0ABAB5] text-white'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>

            {/* Visual Waveform Indicator */}
            <div
              className={`h-14 rounded-lg border px-3 py-2 flex items-center justify-between relative overflow-hidden ${
                isDark ? 'bg-[#080d1a] border-[#1e3260]' : 'bg-white border-[#ccf4f1]'
              }`}
            >
              <div className="absolute inset-0 opacity-20 flex items-center justify-around pointer-events-none">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full ${isDark ? 'bg-cyan-400' : 'bg-[#0ABAB5]'}`}
                    style={{
                      height: `${15 + Math.sin(i * 0.4) * 35}%`,
                      opacity: i > 12 && i < 28 ? 0.2 : 1,
                    }}
                  />
                ))}
              </div>
              <div
                className={`relative z-10 text-[11px] font-mono ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Noise Floor: <span className="font-semibold">-54 dB</span>
              </div>
              <div
                className={`relative z-10 flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${
                  isDark
                    ? 'bg-blue-600/30 text-cyan-300 border-cyan-400/40'
                    : 'bg-[#0ABAB5]/15 text-[#0d746f] border-[#0ABAB5]/30'
                }`}
              >
                <Sliders className="w-3 h-3" />
                Cut Line:{' '}
                {draft.sensitivityMode === 'auto'
                  ? `${draft.sensitivityLevel.toUpperCase()}`
                  : `${draft.thresholdDb} dB`}
              </div>
            </div>

            {draft.sensitivityMode === 'auto' ? (
              <div>
                <label
                  className={`text-[10px] uppercase tracking-wider block mb-1.5 font-medium ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Sensitivity Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['conservative', 'moderate', 'aggressive'] as SensitivityLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDraft({ ...draft, sensitivityLevel: lvl })}
                      className={`p-2 rounded-lg border text-center capitalize text-xs font-semibold cursor-pointer transition-all ${
                        draft.sensitivityLevel === lvl
                          ? isDark
                            ? 'bg-blue-600/30 border-cyan-400 text-cyan-300'
                            : 'bg-[#0ABAB5]/20 border-[#0ABAB5] text-[#0d746f]'
                          : isDark
                          ? 'bg-[#080d1a] border-[#1e3260] text-slate-400 hover:text-white'
                          : 'bg-white border-[#ccf4f1] text-slate-600 hover:border-[#0ABAB5]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Decibels Threshold:</span>
                  <span
                    className={`font-mono font-bold ${
                      isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'
                    }`}
                  >
                    {draft.thresholdDb} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="-15"
                  step="1"
                  value={draft.thresholdDb}
                  onChange={(e) => setDraft({ ...draft, thresholdDb: Number(e.target.value) })}
                  className={`w-full cursor-pointer ${
                    isDark ? 'accent-cyan-400' : 'accent-[#0ABAB5]'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Section 4: Padding around speech */}
          <div
            className={`border rounded-xl p-4 space-y-4 ${
              isDark ? 'bg-[#0e1830]/60 border-[#1e3260]' : 'bg-[#f8fdfd] border-[#b2ebe7]'
            }`}
          >
            <div>
              <label
                className={`text-[11px] font-semibold tracking-wider uppercase block ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Padding Around Speech
              </label>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Adds buffer milliseconds before and after words so breath attacks and trailing consonants are never cut.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Enter / Before:</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`}>
                    {draft.padBefore.toFixed(2)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.50"
                  step="0.01"
                  value={draft.padBefore}
                  onChange={(e) => setDraft({ ...draft, padBefore: Number(e.target.value) })}
                  className={`w-full cursor-pointer ${
                    isDark ? 'accent-cyan-400' : 'accent-[#0ABAB5]'
                  }`}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Exit / After:</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`}>
                    {draft.padAfter.toFixed(2)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.50"
                  step="0.01"
                  value={draft.padAfter}
                  onChange={(e) => setDraft({ ...draft, padAfter: Number(e.target.value) })}
                  className={`w-full cursor-pointer ${
                    isDark ? 'accent-cyan-400' : 'accent-[#0ABAB5]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Deselect / keep */}
          <div
            className={`border rounded-xl p-4 space-y-4 ${
              isDark ? 'bg-[#0e1830]/60 border-[#1e3260]' : 'bg-[#f8fdfd] border-[#b2ebe7]'
            }`}
          >
            <div>
              <label
                className={`text-[11px] font-semibold tracking-wider uppercase block ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Deselect / Keep (Minimum Durations)
              </label>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Filters out tiny silence flickers and ignores micro noise artifacts.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Minimum silence:</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`}>
                    {draft.minSilenceDuration.toFixed(2)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="1.50"
                  step="0.05"
                  value={draft.minSilenceDuration}
                  onChange={(e) => setDraft({ ...draft, minSilenceDuration: Number(e.target.value) })}
                  className={`w-full cursor-pointer ${
                    isDark ? 'accent-cyan-400' : 'accent-[#0ABAB5]'
                  }`}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Minimum speech:</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`}>
                    {draft.minSpeechDuration.toFixed(2)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.80"
                  step="0.05"
                  value={draft.minSpeechDuration}
                  onChange={(e) => setDraft({ ...draft, minSpeechDuration: Number(e.target.value) })}
                  className={`w-full cursor-pointer ${
                    isDark ? 'accent-cyan-400' : 'accent-[#0ABAB5]'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
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
            onClick={handleSave}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25'
                : 'bg-[#0ABAB5] hover:bg-[#089c98] shadow-[#0ABAB5]/25'
            }`}
          >
            <Check className="w-4 h-4" />
            Save & Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
