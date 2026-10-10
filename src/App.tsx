import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { WaveformTimeline } from './components/WaveformTimeline';
import { BatchQueue } from './components/BatchQueue';
import { ProcessingSettingsModal } from './components/ProcessingSettingsModal';
import { GeneralSettingsModal } from './components/GeneralSettingsModal';
import { ExportModal } from './components/ExportModal';
import { ProcessedFile, ProcessingSettings, ThemeMode } from './types';
import { DEFAULT_SETTINGS } from './utils/presets';
import { decodeMediaFile, extractWaveformPeaks, detectSilence } from './utils/silenceDetector';
import { SampleFootageItem } from './utils/sampleFootage';

export default function App() {
  const [sessionName, setSessionName] = useState('Session - Oct 10');
  const [settings, setSettings] = useState<ProcessingSettings>({ ...DEFAULT_SETTINGS });
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isProcessingSample, setIsProcessingSample] = useState(false);
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

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Modals state
  const [isProcessingSettingsOpen, setIsProcessingSettingsOpen] = useState(false);
  const [isGeneralSettingsOpen, setIsGeneralSettingsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Active file pointer
  const activeFile = useMemo(() => {
    return files.find((f) => f.id === activeFileId) || files[0] || null;
  }, [files, activeFileId]);

  // Process a single file with audio decoding and silence detection
  const processSingleFile = async (
    fileObj: File,
    id: string,
    existingUrl?: string,
    existingBuffer?: AudioBuffer
  ): Promise<ProcessedFile> => {
    const isVideo = fileObj.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(fileObj.name);
    const mediaType = isVideo ? 'video' : 'audio';
    const url = existingUrl || URL.createObjectURL(fileObj);

    // Format file size
    const sizeMb = (fileObj.size / (1024 * 1024)).toFixed(1);
    const sizeFormatted = `${sizeMb} MB`;

    // Decode audio
    const audioBuffer = existingBuffer || (await decodeMediaFile(fileObj));

    // Extract peaks for canvas rendering
    const waveformPeaks = extractWaveformPeaks(audioBuffer, 1500);

    // Detect silence
    const analysis = detectSilence(audioBuffer, settings);

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

  // Add files to queue and process
  const handleFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    setIsProcessingBatch(true);
    const newItems: ProcessedFile[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];
      const id = `file-${Date.now()}-${i}`;

      try {
        const processed = await processSingleFile(f, id);
        newItems.push(processed);
      } catch (err) {
        console.error('Failed to process file:', f.name, err);
        newItems.push({
          id,
          name: f.name,
          file: f,
          url: URL.createObjectURL(f),
          mediaType: f.type.startsWith('video/') ? 'video' : 'audio',
          sizeFormatted: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
          originalDuration: 0,
          newDuration: 0,
          timeSavedPercentage: 0,
          cutsCount: 0,
          status: 'error',
          errorMessage: 'Unable to decode media audio track',
          progress: 0,
          waveformPeaks: [],
          segments: [],
        });
      }
    }

    setFiles((prev) => {
      const merged = [...prev, ...newItems];
      if (!activeFileId && merged.length > 0) {
        setActiveFileId(merged[0].id);
      }
      return merged;
    });

    setIsProcessingBatch(false);
  };

  // Load procedural sample footage
  const handleLoadSample = async (sample: SampleFootageItem) => {
    setIsProcessingSample(true);
    try {
      const { file, buffer, url } = await sample.generate();
      const id = `sample-${Date.now()}`;
      const processed = await processSingleFile(file, id, url, buffer);

      setFiles((prev) => [processed, ...prev]);
      setActiveFileId(id);
    } catch (err: any) {
      alert(`Error loading sample: ${err.message}`);
    } finally {
      setIsProcessingSample(false);
    }
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
      {/* Top Header */}
      <Header
        sessionName={sessionName}
        setSessionName={setSessionName}
        settings={settings}
        onOpenProcessingSettings={() => setIsProcessingSettingsOpen(true)}
        onOpenGeneralSettings={() => setIsGeneralSettingsOpen(true)}
        onResetSession={handleResetSession}
        isIosMode={isIosMode}
        setIsIosMode={setIsIosMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        hasFiles={files.length > 0}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto px-4 py-5 max-w-6xl w-full mx-auto space-y-6">
        {files.length === 0 ? (
          <div className="py-6">
            <DropZone
              onFilesSelected={handleFilesSelected}
              onLoadSample={handleLoadSample}
              isProcessingSample={isProcessingSample}
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

      {/* Bottom Status Bar */}
      <footer
        className={`border-t px-4 py-2.5 text-[11px] flex flex-wrap items-center justify-between gap-2 select-none transition-colors ${
          isDark
            ? 'border-[#1b2e59] bg-[#0a1128]/95 text-slate-400'
            : 'border-[#b2ebe7] bg-white/95 text-slate-600 shadow-inner'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${isDark ? 'bg-cyan-400' : 'bg-[#0ABAB5]'}`}
            />
            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
              Engine: Connected • Fast native WebAudio DSP analysis
            </span>
          </div>
          <span className={isDark ? 'text-[#1e3260]' : 'text-[#ccf4f1]'}>|</span>
          <span>
            Theme: <b>{isDark ? 'Navy Blue (Dark)' : 'Tiffany Blue (Light)'}</b>
          </span>
          <span className={isDark ? 'text-[#1e3260]' : 'text-[#ccf4f1]'}>|</span>
          <span>
            Silence Threshold: {settings.sensitivityMode === 'auto' ? `Auto (${settings.sensitivityLevel})` : `${settings.thresholdDb} dB`}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span>AutoEdit macOS & iOS v2.5</span>
        </div>
      </footer>

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
