import React, { useState, useEffect, useMemo } from 'react';
import { DropZone } from './components/DropZone';
import { WaveformTimeline } from './components/WaveformTimeline';
import { BatchQueue } from './components/BatchQueue';
import { ProcessingSettingsModal } from './components/ProcessingSettingsModal';
import { GeneralSettingsModal } from './components/GeneralSettingsModal';
import { ExportModal } from './components/ExportModal';
import { ImportConfirmModal, PendingImportItem } from './components/ImportConfirmModal';
import { ProcessingLoadingModal } from './components/ProcessingLoadingModal';
import { ProcessedFile, ProcessingSettings, ThemeMode } from './types';
import { DEFAULT_SETTINGS } from './utils/presets';
import { decodeMediaFile, extractWaveformPeaks, detectSilence } from './utils/silenceDetector';
import { SampleFootageItem } from './utils/sampleFootage';
import { Sliders, Settings, Sun, Moon, RotateCcw, Smartphone, Monitor } from 'lucide-react';

export default function App() {
  const [sessionName, setSessionName] = useState('Session - Oct 10');
  const [settings, setSettings] = useState<ProcessingSettings>({ ...DEFAULT_SETTINGS });
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isIosMode, setIsIosMode] = useState(false);

  // Theme: 'dark' = Navy Blue, 'light' = Tiffany Blue
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('autoedit_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('autoedit_theme', next);
      return next;
    });
  };

  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Modals state
  const [isProcessingSettingsOpen, setIsProcessingSettingsOpen] = useState(false);
  const [isGeneralSettingsOpen, setIsGeneralSettingsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Import Confirm & Loading Screen state
  const [pendingImportItems, setPendingImportItems] = useState<PendingImportItem[]>([]);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);

  // Loading Screen state
  const [isProcessingLoadingOpen, setIsProcessingLoadingOpen] = useState(false);
  const [loadingFileName, setLoadingFileName] = useState('');
  const [loadingFileIndex, setLoadingFileIndex] = useState(1);
  const [loadingTotalFiles, setLoadingTotalFiles] = useState(1);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingStatusMessage, setLoadingStatusMessage] = useState('Initializing...');

  // Active file pointer
  const activeFile = useMemo(() => {
    return files.find((f) => f.id === activeFileId) || files[0] || null;
  }, [files, activeFileId]);

  // Process a single file with audio decoding and silence detection
  const processSingleFile = async (
    fileObj: File,
    id: string,
    existingUrl?: string,
    existingBuffer?: AudioBuffer,
    onStepProgress?: (pct: number, msg: string) => void
  ): Promise<ProcessedFile> => {
    const isVideo = fileObj.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(fileObj.name);
    const mediaType = isVideo ? 'video' : 'audio';
    const url = existingUrl || URL.createObjectURL(fileObj);

    const sizeMb = (fileObj.size / (1024 * 1024)).toFixed(1);
    const sizeFormatted = `${sizeMb} MB`;

    onStepProgress?.(25, 'Decoding audio stream via native WebAudio DSP...');
    await new Promise((r) => setTimeout(r, 60)); // allow UI frame render
    const audioBuffer = existingBuffer || (await decodeMediaFile(fileObj));

    onStepProgress?.(55, 'Extracting audio envelope & computing RMS energy...');
    await new Promise((r) => setTimeout(r, 60));
    const waveformPeaks = extractWaveformPeaks(audioBuffer, 1500);

    onStepProgress?.(80, 'Detecting silence intervals & applying speech padding...');
    await new Promise((r) => setTimeout(r, 60));
    const analysis = detectSilence(audioBuffer, settings);

    onStepProgress?.(98, 'Finalizing jumpcut sequence...');
    await new Promise((r) => setTimeout(r, 40));

    return {
      id,
      name: fileObj.name,
      file: fileObj,
      url,
      mediaType,
      sizeFormatted,
      originalDuration: analysis.originalDuration,
      newDuration: analysis.newDuration,
      timeSavedPercentage: analysis.timeSavedPercentage,
      cutsCount: analysis.cutsCount,
      status: 'done',
      progress: 100,
      waveformPeaks,
      segments: analysis.segments,
      audioBuffer,
    };
  };

  // 1. Files selected by user -> Show Confirm Window
  const handleFilesSelected = (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    const items: PendingImportItem[] = newFiles.map((f) => {
      const isVideo = f.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(f.name);
      return {
        name: f.name,
        sizeFormatted: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        type: isVideo ? 'video' : 'audio',
        file: f,
      };
    });

    setPendingImportItems(items);
    setIsImportConfirmOpen(true);
  };

  // 2. Sample selected by user -> Show Confirm Window
  const handleLoadSample = (sample: SampleFootageItem) => {
    const items: PendingImportItem[] = [
      {
        name: sample.name,
        sizeFormatted: `${sample.duration}s clip`,
        type: sample.mediaType,
        sampleGenerator: sample.generate,
      },
    ];

    setPendingImportItems(items);
    setIsImportConfirmOpen(true);
  };

  // 3. User Confirmed in Modal -> Execute processing with Loading Screen
  const handleConfirmProcessing = async () => {
    setIsImportConfirmOpen(false);
    if (pendingImportItems.length === 0) return;

    setIsProcessingLoadingOpen(true);
    setLoadingTotalFiles(pendingImportItems.length);
    setIsProcessingBatch(true);

    const newProcessedItems: ProcessedFile[] = [];

    for (let i = 0; i < pendingImportItems.length; i++) {
      const item = pendingImportItems[i];
      setLoadingFileIndex(i + 1);
      setLoadingFileName(item.name);
      setLoadingPercent(10);
      setLoadingStatusMessage('Preparing file for analysis...');

      const id = `file-${Date.now()}-${i}`;

      try {
        let fileObj: File;
        let url: string | undefined;
        let buffer: AudioBuffer | undefined;

        if (item.sampleGenerator) {
          setLoadingPercent(20);
          setLoadingStatusMessage('Synthesizing sample audio stream...');
          const gen = await item.sampleGenerator();
          fileObj = gen.file;
          url = gen.url;
          buffer = gen.buffer;
        } else if (item.file) {
          fileObj = item.file;
        } else {
          continue;
        }

        const processed = await processSingleFile(
          fileObj,
          id,
          url,
          buffer,
          (stepPct, stepMsg) => {
            const overallPct = Math.round(
              ((i + stepPct / 100) / pendingImportItems.length) * 100
            );
            setLoadingPercent(Math.min(99, Math.max(10, overallPct)));
            setLoadingStatusMessage(stepMsg);
          }
        );

        newProcessedItems.push(processed);
      } catch (err) {
        console.error('Failed to process file:', item.name, err);
      }
    }

    setLoadingPercent(100);
    setLoadingStatusMessage('Silence removal complete!');
    await new Promise((r) => setTimeout(r, 350));

    setFiles((prev) => {
      const merged = [...prev, ...newProcessedItems];
      if (!activeFileId && merged.length > 0) {
        setActiveFileId(merged[0].id);
      }
      return merged;
    });

    setIsProcessingLoadingOpen(false);
    setIsProcessingBatch(false);
    setPendingImportItems([]);
  };

  // Automatically recalculate cuts when settings change
  const handleApplySettings = (newSettings: ProcessingSettings) => {
    setSettings(newSettings);

    setFiles((prevFiles) =>
      prevFiles.map((file) => {
        if (!file.audioBuffer) return file;
        const analysis = detectSilence(file.audioBuffer, newSettings);
        return {
          ...file,
          newDuration: analysis.newDuration,
          timeSavedPercentage: analysis.timeSavedPercentage,
          cutsCount: analysis.cutsCount,
          segments: analysis.segments,
        };
      })
    );
  };

  // Toggle Keep/Cut on a specific segment
  const handleUpdateSegmentKeep = (fileId: string, segmentId: string, keep: boolean) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f;
        const updatedSegments = f.segments.map((s) => (s.id === segmentId ? { ...s, keep } : s));

        let newDuration = 0;
        let cutsCount = 0;
        updatedSegments.forEach((s) => {
          if (s.keep) newDuration += s.duration;
          else cutsCount++;
        });

        const timeSaved = Math.max(0, f.originalDuration - newDuration);
        const timeSavedPercentage =
          f.originalDuration > 0 ? Math.round((timeSaved / f.originalDuration) * 100) : 0;

        return {
          ...f,
          segments: updatedSegments,
          newDuration,
          cutsCount,
          timeSavedPercentage,
        };
      })
    );
  };

  // Remove file from queue
  const handleRemoveFile = (fileId: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== fileId);
      if (activeFileId === fileId) {
        setActiveFileId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  };

  // Reset Session
  const handleResetSession = () => {
    if (files.length > 0 && !confirm('Create a new session? This will clear the current queue.')) {
      return;
    }
    setFiles([]);
    setActiveFileId(null);
    setSessionName(`Session - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
  };

  // Reprocess all pending
  const handleProcessAll = async () => {
    setIsProcessingBatch(true);
    setFiles((prevFiles) =>
      prevFiles.map((file) => {
        if (!file.audioBuffer) return file;
        const analysis = detectSilence(file.audioBuffer, settings);
        return {
          ...file,
          status: 'done',
          newDuration: analysis.newDuration,
          timeSavedPercentage: analysis.timeSavedPercentage,
          cutsCount: analysis.cutsCount,
          segments: analysis.segments,
        };
      })
    );
    setIsProcessingBatch(false);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark
          ? 'bg-[#080d1a] text-slate-100 selection:bg-blue-600 selection:text-white'
          : 'bg-[#f0fbfb] text-slate-800 selection:bg-[#0ABAB5] selection:text-white'
      } ${
        isIosMode
          ? isDark
            ? 'max-w-md mx-auto my-4 border border-[#1b2e59] rounded-3xl shadow-2xl overflow-hidden'
            : 'max-w-md mx-auto my-4 border border-[#b2ebe7] rounded-3xl shadow-2xl overflow-hidden'
          : ''
      }`}
    >
      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto px-4 py-5 max-w-6xl w-full mx-auto space-y-6">
        {files.length === 0 ? (
          <div className="py-6">
            <DropZone
              onFilesSelected={handleFilesSelected}
              onLoadSample={handleLoadSample}
              isProcessingSample={isProcessingLoadingOpen}
              theme={theme}
            />
          </div>
        ) : (
          <>
            {/* Active File Waveform Timeline */}
            {activeFile && (
              <WaveformTimeline
                file={activeFile}
                theme={theme}
                onUpdateSegmentKeep={handleUpdateSegmentKeep}
                onOpenExportModal={() => setIsExportModalOpen(true)}
              />
            )}

            {/* Batch Processing Queue */}
            <BatchQueue
              files={files}
              activeFileId={activeFileId}
              onSelectFile={(id) => setActiveFileId(id)}
              onRemoveFile={handleRemoveFile}
              onAddMoreFiles={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = 'video/*,audio/*,.mp4,.mov,.mp3,.wav';
                input.onchange = (e: any) => {
                  if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                };
                input.click();
              }}
              onProcessAll={handleProcessAll}
              isProcessingBatch={isProcessingBatch}
              theme={theme}
            />
          </>
        )}
      </main>

      {/* Bottom Status Bar with Control Actions */}
      <footer
        className={`border-t px-4 py-2.5 text-[11px] flex flex-wrap items-center justify-between gap-3 select-none transition-colors ${
          isDark
            ? 'border-[#1b2e59] bg-[#0a1128]/95 text-slate-400'
            : 'border-[#b2ebe7] bg-white/95 text-slate-600 shadow-inner'
        }`}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${isDark ? 'bg-cyan-400' : 'bg-[#0ABAB5]'}`}
            />
            <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              AutoEdit
            </span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              • Connected (Fast WebAudio DSP)
            </span>
          </div>

          <span className={isDark ? 'text-[#1e3260]' : 'text-[#ccf4f1]'}>|</span>

          <span>
            Preset: <b className="capitalize">{settings.preset}</b> ({settings.sensitivityMode === 'auto' ? `Auto ${settings.sensitivityLevel}` : `${settings.thresholdDb} dB`})
          </span>

          <span className={isDark ? 'text-[#1e3260]' : 'text-[#ccf4f1]'}>|</span>

          <span>
            Padding: {Math.round(settings.padBefore * 1000)}ms / {Math.round(settings.padAfter * 1000)}ms
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2">
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold border transition-all cursor-pointer ${
              isDark
                ? 'bg-[#111f3d] border-[#1e3260] text-cyan-300 hover:border-cyan-400'
                : 'bg-[#e4f7f6] border-[#a2e5e0] text-[#0d746f] hover:border-[#0ABAB5]'
            }`}
            title="Toggle Navy Blue Dark / Tiffany Blue Light"
          >
            {isDark ? <Moon className="w-3.5 h-3.5 text-cyan-400" /> : <Sun className="w-3.5 h-3.5 text-[#0ABAB5]" />}
            <span>{isDark ? 'Navy Blue' : 'Tiffany Blue'}</span>
          </button>

          {/* Customize Thresholds */}
          <button
            onClick={() => setIsProcessingSettingsOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#111f3d] border-[#1e3260] text-slate-300 hover:text-white'
                : 'bg-white border-[#b2ebe7] text-slate-700 hover:text-slate-900'
            }`}
          >
            <Sliders className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`} />
            <span>Customize</span>
          </button>

          {/* General Settings */}
          <button
            onClick={() => setIsGeneralSettingsOpen(true)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#111f3d] border-[#1e3260] text-slate-400 hover:text-white'
                : 'bg-white border-[#b2ebe7] text-slate-600 hover:text-slate-900'
            }`}
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* iOS Mode toggle */}
          <button
            onClick={() => setIsIosMode(!isIosMode)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isIosMode
                ? isDark
                  ? 'bg-blue-600/30 text-cyan-300 border-blue-500/60'
                  : 'bg-[#0ABAB5]/20 text-[#0d746f] border-[#0ABAB5]'
                : isDark
                ? 'bg-[#111f3d] border-[#1e3260] text-slate-400 hover:text-white'
                : 'bg-white border-[#b2ebe7] text-slate-600 hover:text-slate-900'
            }`}
            title={isIosMode ? 'Switch to Desktop Mode' : 'Switch to iOS Mobile View'}
          >
            {isIosMode ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
          </button>

          {/* Reset Session */}
          {files.length > 0 && (
            <button
              onClick={handleResetSession}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#111f3d] border-[#1e3260] text-slate-400 hover:text-rose-400'
                  : 'bg-white border-[#b2ebe7] text-slate-600 hover:text-rose-500'
              }`}
              title="Reset Session / Clear Queue"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </footer>

      {/* Confirmation Modal prior to processing import */}
      <ImportConfirmModal
        isOpen={isImportConfirmOpen}
        onClose={() => {
          setIsImportConfirmOpen(false);
          setPendingImportItems([]);
        }}
        onConfirm={handleConfirmProcessing}
        pendingItems={pendingImportItems}
        settings={settings}
        onOpenSettings={() => setIsProcessingSettingsOpen(true)}
        theme={theme}
      />

      {/* Processing Loading Screen */}
      <ProcessingLoadingModal
        isOpen={isProcessingLoadingOpen}
        currentFileName={loadingFileName}
        currentIndex={loadingFileIndex}
        totalFiles={loadingTotalFiles}
        percent={loadingPercent}
        statusMessage={loadingStatusMessage}
        theme={theme}
      />

      {/* Modals */}
      <ProcessingSettingsModal
        isOpen={isProcessingSettingsOpen}
        onClose={() => setIsProcessingSettingsOpen(false)}
        currentSettings={settings}
        onApplySettings={handleApplySettings}
        theme={theme}
      />

      <GeneralSettingsModal
        isOpen={isGeneralSettingsOpen}
        onClose={() => setIsGeneralSettingsOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {activeFile && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          file={activeFile}
          theme={theme}
        />
      )}
    </div>
  );
}
