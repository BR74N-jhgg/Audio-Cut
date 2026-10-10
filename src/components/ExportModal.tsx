import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Film,
  Music,
  CheckCircle2,
  Layers,
  Clock,
  Gauge,
  Folder,
  Info,
  HelpCircle,
} from 'lucide-react';
import {
  ProcessedFile,
  VideoExportOptions,
  AudioExportOptions,
  VideoFormat,
  AudioFormat,
  VideoResolutionPreset,
  VideoFrameRate,
  ThemeMode,
} from '../types';
import {
  generateFcpXml,
  generatePremiereXml,
  generateEdl,
  generateJsonCutList,
  downloadFile,
  renderAndExportCutVideo,
  renderAndExportCutAudio,
  formatDurationHuman,
  ExportProgress,
} from '../utils/exporters';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: ProcessedFile;
  theme: ThemeMode;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, file, theme }) => {
  const [activeTab, setActiveTab] = useState<'media' | 'timeline'>('media');
  const [mediaExportType, setMediaExportType] = useState<'video' | 'audio'>(
    file.mediaType === 'video' ? 'video' : 'audio'
  );

  const isDark = theme === 'dark';

  // Detected native audio sample rate from source media (default 48000 for standard video)
  const sourceAudioRate = file.audioSampleRate || (file.audioBuffer ? file.audioBuffer.sampleRate : 48000);
  const sourceAudioChannels = file.audioChannels || (file.audioBuffer ? file.audioBuffer.numberOfChannels : 2);

  // Video Settings
  const [videoOptions, setVideoOptions] = useState<VideoExportOptions>({
    format: 'mp4',
    resolution: '1080p',
    frameRate: 30,
    bitrateMbps: 10,
    audioSampleRate: sourceAudioRate,
    audioBitrateKbps: 256,
  });

  // Audio Settings
  const [audioOptions, setAudioOptions] = useState<AudioExportOptions>({
    format: 'wav',
    sampleRate: sourceAudioRate,
    bitrateKbps: 256,
    bitDepth: 16,
    channels: sourceAudioChannels === 1 ? 'mono' : 'stereo',
  });

  // Auto-sync options if file changes
  useEffect(() => {
    if (file) {
      const detectedRate = file.audioSampleRate || (file.audioBuffer ? file.audioBuffer.sampleRate : 48000);
      const detectedChannels = file.audioChannels || (file.audioBuffer ? file.audioBuffer.numberOfChannels : 2);
      setVideoOptions((prev) => ({
        ...prev,
        audioSampleRate: detectedRate,
      }));
      setAudioOptions((prev) => ({
        ...prev,
        sampleRate: detectedRate,
        channels: detectedChannels === 1 ? 'mono' : 'stereo',
      }));
      setFcpAudioRate(detectedRate);
      setFcpAudioChannels(detectedChannels);
    }
  }, [file]);

  const [timelineFps, setTimelineFps] = useState<number>(29.97);
  const [fcpAudioRate, setFcpAudioRate] = useState<number>(sourceAudioRate);
  const [fcpAudioChannels, setFcpAudioChannels] = useState<number>(sourceAudioChannels);
  const [mediaDirectoryPath, setMediaDirectoryPath] = useState<string>('');
  const [showFcpRelinkGuide, setShowFcpRelinkGuide] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showSuccessNotice = (msg: string) => {
    setExportMessage(msg);
    setTimeout(() => setExportMessage(null), 4000);
  };

  const handleRenderVideo = async () => {
    setIsRendering(true);
    setErrorMessage(null);
    setProgress({ percent: 0, currentStep: 'Starting video export...' });

    try {
      await renderAndExportCutVideo(file, videoOptions, (p) => {
        setProgress(p);
      });
      showSuccessNotice(`Rendered ${videoOptions.format.toUpperCase()} video downloaded successfully!`);
    } catch (err: any) {
      console.error('Video export error:', err);
      setErrorMessage(err.message || 'Failed to export video');
    } finally {
      setIsRendering(false);
      setProgress(null);
    }
  };

  const handleRenderAudio = async () => {
    setIsRendering(true);
    setErrorMessage(null);
    setProgress({ percent: 0, currentStep: 'Starting audio export...' });

    try {
      await renderAndExportCutAudio(file, audioOptions, (p) => {
        setProgress(p);
      });
      showSuccessNotice(`Rendered ${audioOptions.format.toUpperCase()} audio downloaded successfully!`);
    } catch (err: any) {
      console.error('Audio export error:', err);
      setErrorMessage(err.message || 'Failed to export audio');
    } finally {
      setIsRendering(false);
      setProgress(null);
    }
  };

  const handleExportFcpXml = () => {
    const xml = generateFcpXml(file, timelineFps, {
      mediaDirectoryPath: mediaDirectoryPath.trim() || undefined,
      audioRate: fcpAudioRate,
      audioChannels: fcpAudioChannels,
    });
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    downloadFile(xml, `${cleanName}_FCPXML.fcpxml`, 'application/xml');
    showSuccessNotice('Final Cut Pro XML exported successfully with matching audio & media info!');
  };

  const handleExportPremiereXml = () => {
    const xml = generatePremiereXml(file, timelineFps);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    downloadFile(xml, `${cleanName}_Premiere.xml`, 'application/xml');
    showSuccessNotice('Adobe Premiere Pro XML exported successfully!');
  };

  const handleExportEdl = () => {
    const edl = generateEdl(file, timelineFps);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    downloadFile(edl, `${cleanName}.edl`, 'text/plain');
    showSuccessNotice('CMX 3600 EDL exported successfully!');
  };

  const handleExportJson = () => {
    const json = generateJsonCutList(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    downloadFile(json, `${cleanName}_cut_list.json`, 'application/json');
    showSuccessNotice('JSON Cut List exported successfully!');
  };

  const estimatedVideoSizeMb = ((videoOptions.bitrateMbps * file.newDuration) / 8).toFixed(1);
  const estimatedAudioSizeMb =
    audioOptions.format === 'wav'
      ? ((audioOptions.sampleRate * (audioOptions.bitDepth / 8) * 2 * file.newDuration) / (1024 * 1024)).toFixed(1)
      : (((audioOptions.bitrateKbps * file.newDuration) / 8) / 1024).toFixed(1);

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
            <h2
              className={`text-base font-semibold tracking-tight flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <Download className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`} />
              Export Pruned Media & Timelines
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Export high-fidelity cut files with customizable format, resolution, frame rate, and bitrates
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isRendering}
            className={`p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-[#111f3d]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-[#f0fbfb]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notices */}
        {exportMessage && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-500/15 border-b border-rose-500/30 px-6 py-2.5 text-xs text-rose-300 flex items-center gap-2">
            <X className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Top Tab Bar */}
        <div
          className={`flex border-b px-6 pt-3 gap-2 ${
            isDark ? 'border-[#1b2e59] bg-[#080d1a]' : 'border-[#ccf4f1] bg-[#f0fbfb]'
          }`}
        >
          <button
            onClick={() => setActiveTab('media')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'media'
                ? isDark
                  ? 'border-cyan-400 text-white'
                  : 'border-[#0ABAB5] text-[#0d746f]'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Film className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`} />
            <span>Rendered Media File (MP4, MOV, WAV, MP3)</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'timeline'
                ? isDark
                  ? 'border-cyan-400 text-white'
                  : 'border-[#0ABAB5] text-[#0d746f]'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-teal-600'}`} />
            <span>NLE Timelines (DaVinci, FCP, Premiere)</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1 text-xs">
          {/* File Overview Mini Bar */}
          <div
            className={`border rounded-xl p-3 flex items-center justify-between text-xs ${
              isDark ? 'bg-[#0e1830]/60 border-[#1e3260]' : 'bg-[#f8fdfd] border-[#ccf4f1]'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isDark ? 'bg-cyan-400' : 'bg-[#0ABAB5]'}`} />
              <span className={`font-semibold truncate max-w-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {file.name}
              </span>
            </div>
            <div className={`text-[11px] font-mono shrink-0 flex items-center gap-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                isDark ? 'bg-[#111f3d] border-[#1e3260] text-cyan-300' : 'bg-[#e6faf8] border-[#b2ebe7] text-[#0d746f]'
              }`}>
                Audio: {sourceAudioRate} Hz • {sourceAudioChannels === 1 ? 'Mono' : 'Stereo'}
              </span>
              <span>
                Orig: {formatDurationHuman(file.originalDuration)} →{' '}
                <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`}>
                  New: {formatDurationHuman(file.newDuration)}
                </span>{' '}
                <span className="text-rose-400">(-{file.timeSavedPercentage}%)</span>
              </span>
            </div>
          </div>

          {/* TAB 1: RENDERED MEDIA FILE EXPORT */}
          {activeTab === 'media' && (
            <div className="space-y-5">
              {/* Media Type Toggle: Video vs Audio */}
              <div
                className={`flex items-center justify-between p-1.5 rounded-xl border ${
                  isDark ? 'bg-[#080d1a] border-[#1e3260]' : 'bg-[#f0fbfb] border-[#ccf4f1]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setMediaExportType('video')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    mediaExportType === 'video'
                      ? isDark
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-[#0ABAB5] text-white shadow-md'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Video Export (MP4 / MOV / WebM)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaExportType('audio')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    mediaExportType === 'audio'
                      ? isDark
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-[#0ABAB5] text-white shadow-md'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Audio Only Export (WAV / MP3 / M4A)</span>
                </button>
              </div>

              {/* VIDEO CONFIGURATION */}
              {mediaExportType === 'video' && (
                <div
                  className={`space-y-4 border rounded-xl p-4 ${
                    isDark ? 'bg-[#0e1830]/50 border-[#1e3260]' : 'bg-[#f8fdfd] border-[#b2ebe7]'
                  }`}
                >
                  {/* Format Selector */}
                  <div>
                    <label
                      className={`text-[11px] font-semibold tracking-wider uppercase block mb-1.5 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Video Container / Format
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'mp4', name: 'MP4 (H.264)', desc: 'Universal playback, iOS & Mac' },
                        { id: 'mov', name: 'MOV (QuickTime)', desc: 'Apple ProRes/QuickTime container' },
                        { id: 'webm', name: 'WebM (VP9)', desc: 'High compression, web ready' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setVideoOptions({ ...videoOptions, format: fmt.id as VideoFormat })}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            videoOptions.format === fmt.id
                              ? isDark
                                ? 'bg-blue-600/20 border-cyan-400 text-cyan-300 shadow-sm'
                                : 'bg-[#0ABAB5]/15 border-[#0ABAB5] text-[#0d746f] shadow-sm'
                              : isDark
                              ? 'bg-[#080d1a] border-[#1e3260] text-slate-400 hover:border-slate-500'
                              : 'bg-white border-[#ccf4f1] text-slate-600 hover:border-[#0ABAB5]'
                          }`}
                        >
                          <div className="font-semibold text-xs">{fmt.name}</div>
                          <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {fmt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution & Frame Rate Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        className={`text-[11px] font-semibold tracking-wider uppercase block mb-1.5 ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        Resolution
                      </label>
                      <select
                        value={videoOptions.resolution}
                        onChange={(e) =>
                          setVideoOptions({
                            ...videoOptions,
                            resolution: e.target.value as VideoResolutionPreset,
                          })
                        }
                        className={`w-full border rounded-xl px-3 py-2 text-xs outline-none ${
                          isDark
                            ? 'bg-[#080d1a] border-[#1e3260] text-white focus:border-cyan-400'
                            : 'bg-white border-[#ccf4f1] text-slate-800 focus:border-[#0ABAB5]'
                        }`}
                      >
                        <option value="4k">4K Ultra HD (3840 × 2160)</option>
                        <option value="1440p">1440p QHD (2560 × 1440)</option>
                        <option value="1080p">1080p Full HD (1920 × 1080)</option>
                        <option value="720p">720p HD (1280 × 720)</option>
                        <option value="vertical_1080p">9:16 Vertical (1080 × 1920 - Reels/Shorts)</option>
                        <option value="540p">540p SD (960 × 540 - Quick Draft)</option>
                        <option value="source">Source Match (Auto Original)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        className={`text-[11px] font-semibold tracking-wider uppercase block mb-1.5 ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        Frame Rate (FPS)
                      </label>
                      <select
                        value={videoOptions.frameRate}
                        onChange={(e) =>
                          setVideoOptions({
                            ...videoOptions,
                            frameRate: (e.target.value === 'source' ? 'source' : Number(e.target.value)) as VideoFrameRate,
                          })
                        }
                        className={`w-full border rounded-xl px-3 py-2 text-xs outline-none ${
                          isDark
                            ? 'bg-[#080d1a] border-[#1e3260] text-white focus:border-cyan-400'
                            : 'bg-white border-[#ccf4f1] text-slate-800 focus:border-[#0ABAB5]'
                        }`}
                      >
                        <option value={60}>60 FPS (Ultra Smooth 60p)</option>
                        <option value={59.94}>59.94 FPS (Broadcast HFR NTSC)</option>
                        <option value={50}>50 FPS (PAL Smooth)</option>
                        <option value={30}>30 FPS (Standard Web & Vlog 30p)</option>
                        <option value={29.97}>29.97 FPS (NTSC Standard / YouTube / Broadcast)</option>
                        <option value={25}>25 FPS (PAL Standard 25p)</option>
                        <option value={24}>24 FPS (Cinematic 24p True)</option>
                        <option value={23.976}>23.976 FPS (Cinema NTSC 23.98p)</option>
                        <option value="source">Source FPS (Auto Detect)</option>
                      </select>
                    </div>
                  </div>

                  {/* Video Bitrate */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        className={`text-[11px] font-semibold tracking-wider uppercase ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        Video Bitrate
                      </label>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'
                          }`}
                        >
                          {videoOptions.bitrateMbps} Mbps
                        </span>
                        <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          (Est. size: ~{estimatedVideoSizeMb} MB)
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="35"
                      step="1"
                      value={videoOptions.bitrateMbps}
                      onChange={(e) =>
                        setVideoOptions({ ...videoOptions, bitrateMbps: Number(e.target.value) })
                      }
                      className={`w-full cursor-pointer ${
                        isDark ? 'accent-cyan-400' : 'accent-[#0ABAB5]'
                      }`}
                    />
                  </div>

                  {/* Audio Settings inside Video */}
                  <div
                    className={`grid grid-cols-2 gap-3 pt-2 border-t ${
                      isDark ? 'border-[#1b2e59]' : 'border-[#ccf4f1]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          className={`text-[10px] uppercase tracking-wider block ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          Audio Track Sample Rate
                        </label>
                        <span className={`text-[10px] font-mono ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`}>
                          Source: {sourceAudioRate} Hz
                        </span>
                      </div>
                      <select
                        value={videoOptions.audioSampleRate}
                        onChange={(e) =>
                          setVideoOptions({
                            ...videoOptions,
                            audioSampleRate: Number(e.target.value),
                          })
                        }
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs ${
                          isDark
                            ? 'bg-[#080d1a] border-[#1e3260] text-white'
                            : 'bg-white border-[#ccf4f1] text-slate-800'
                        }`}
                      >
                        <option value={sourceAudioRate}>
                          {sourceAudioRate} Hz (Source Match • Recommended)
                        </option>
                        {sourceAudioRate !== 48000 && (
                          <option value={48000}>48,000 Hz (Video Broadcast Standard)</option>
                        )}
                        {sourceAudioRate !== 44100 && (
                          <option value={44100}>44,100 Hz (Music Standard)</option>
                        )}
                        {sourceAudioRate !== 96000 && (
                          <option value={96000}>96,000 Hz (High-Res Master)</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label
                        className={`text-[10px] uppercase tracking-wider block mb-1 ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        Audio Track Bitrate
                      </label>
                      <select
                        value={videoOptions.audioBitrateKbps}
                        onChange={(e) =>
                          setVideoOptions({
                            ...videoOptions,
                            audioBitrateKbps: Number(e.target.value),
                          })
                        }
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs ${
                          isDark
                            ? 'bg-[#080d1a] border-[#1e3260] text-white'
                            : 'bg-white border-[#ccf4f1] text-slate-800'
                        }`}
                      >
                        <option value={320}>320 kbps (High Fidelity)</option>
                        <option value={256}>256 kbps (Standard HQ)</option>
                        <option value={192}>192 kbps (Good)</option>
                        <option value={128}>128 kbps (Compact)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* AUDIO ONLY CONFIGURATION */}
              {mediaExportType === 'audio' && (
                <div
                  className={`space-y-4 border rounded-xl p-4 ${
                    isDark ? 'bg-[#0e1830]/50 border-[#1e3260]' : 'bg-[#f8fdfd] border-[#b2ebe7]'
                  }`}
                >
                  {/* Format Selector */}
                  <div>
                    <label
                      className={`text-[11px] font-semibold tracking-wider uppercase block mb-1.5 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Audio Format
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'wav', name: 'WAV', desc: 'Studio PCM Lossless' },
                        { id: 'mp3', name: 'MP3', desc: 'Universal MPEG audio' },
                        { id: 'm4a', name: 'M4A / AAC', desc: 'Apple High-Efficiency' },
                        { id: 'ogg', name: 'OGG', desc: 'Open Vorbis stream' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setAudioOptions({ ...audioOptions, format: fmt.id as AudioFormat })}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            audioOptions.format === fmt.id
                              ? isDark
                                ? 'bg-blue-600/20 border-cyan-400 text-cyan-300 shadow-sm'
                                : 'bg-[#0ABAB5]/15 border-[#0ABAB5] text-[#0d746f] shadow-sm'
                              : isDark
                              ? 'bg-[#080d1a] border-[#1e3260] text-slate-400 hover:border-slate-500'
                              : 'bg-white border-[#ccf4f1] text-slate-600 hover:border-[#0ABAB5]'
                          }`}
                        >
                          <div className="font-semibold text-xs">{fmt.name}</div>
                          <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {fmt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sample Rate */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          className={`text-[11px] font-semibold tracking-wider uppercase block ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          Sample Rate
                        </label>
                        <span className={`text-[10px] font-mono ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`}>
                          Source: {sourceAudioRate} Hz
                        </span>
                      </div>
                      <select
                        value={audioOptions.sampleRate}
                        onChange={(e) =>
                          setAudioOptions({ ...audioOptions, sampleRate: Number(e.target.value) })
                        }
                        className={`w-full border rounded-xl px-3 py-2 text-xs outline-none ${
                          isDark
                            ? 'bg-[#080d1a] border-[#1e3260] text-white focus:border-cyan-400'
                            : 'bg-white border-[#ccf4f1] text-slate-800 focus:border-[#0ABAB5]'
                        }`}
                      >
                        <option value={sourceAudioRate}>
                          {sourceAudioRate} Hz ({sourceAudioRate / 1000} kHz - Source Match • Recommended)
                        </option>
                        {sourceAudioRate !== 48000 && (
                          <option value={48000}>48,000 Hz (48 kHz - Video & Cinema standard)</option>
                        )}
                        {sourceAudioRate !== 44100 && (
                          <option value={44100}>44,100 Hz (44.1 kHz - CD & Music standard)</option>
                        )}
                        {sourceAudioRate !== 96000 && (
                          <option value={96000}>96,000 Hz (96 kHz - High-Res Audio master)</option>
                        )}
                        {sourceAudioRate !== 32000 && (
                          <option value={32000}>32,000 Hz (32 kHz - Voice notes)</option>
                        )}
                      </select>
                    </div>

                    {/* Bitrate or Bit Depth */}
                    {audioOptions.format === 'wav' ? (
                      <div>
                        <label
                          className={`text-[11px] font-semibold tracking-wider uppercase block mb-1.5 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          Bit Depth (Linear PCM)
                        </label>
                        <select
                          value={audioOptions.bitDepth}
                          onChange={(e) =>
                            setAudioOptions({
                              ...audioOptions,
                              bitDepth: Number(e.target.value) as 16 | 24,
                            })
                          }
                          className={`w-full border rounded-xl px-3 py-2 text-xs outline-none ${
                            isDark
                              ? 'bg-[#080d1a] border-[#1e3260] text-white focus:border-cyan-400'
                              : 'bg-white border-[#ccf4f1] text-slate-800 focus:border-[#0ABAB5]'
                          }`}
                        >
                          <option value={16}>16-bit PCM (Standard CD Quality, ~1411 kbps)</option>
                          <option value={24}>24-bit PCM (Studio Master 144 dB Dynamic Range)</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label
                          className={`text-[11px] font-semibold tracking-wider uppercase block mb-1.5 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          Bitrate ({audioOptions.format.toUpperCase()})
                        </label>
                        <select
                          value={audioOptions.bitrateKbps}
                          onChange={(e) =>
                            setAudioOptions({
                              ...audioOptions,
                              bitrateKbps: Number(e.target.value),
                            })
                          }
                          className={`w-full border rounded-xl px-3 py-2 text-xs outline-none ${
                            isDark
                              ? 'bg-[#080d1a] border-[#1e3260] text-white focus:border-cyan-400'
                              : 'bg-white border-[#ccf4f1] text-slate-800 focus:border-[#0ABAB5]'
                          }`}
                        >
                          <option value={320}>320 kbps (Maximum Quality)</option>
                          <option value={256}>256 kbps (High Quality Studio)</option>
                          <option value={192}>192 kbps (Standard Streaming)</option>
                          <option value={128}>128 kbps (Voice / Podcast)</option>
                          <option value={96}>96 kbps (Compact)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {isRendering && progress && (
                <div
                  className={`border rounded-xl p-4 space-y-2.5 animate-in fade-in ${
                    isDark ? 'bg-[#080d1a] border-[#1e3260]' : 'bg-[#f0fbfb] border-[#ccf4f1]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`font-semibold flex items-center gap-2 ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      <Gauge className={`w-4 h-4 animate-spin ${isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'}`} />
                      {progress.currentStep}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'
                      }`}
                    >
                      {progress.percent}%
                    </span>
                  </div>

                  <div
                    className={`w-full rounded-full h-2.5 overflow-hidden border ${
                      isDark ? 'bg-[#080d1a] border-[#1e3260]' : 'bg-white border-[#ccf4f1]'
                    }`}
                  >
                    <div
                      className={`h-full transition-all duration-200 ${
                        isDark
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-400'
                          : 'bg-gradient-to-r from-[#0ABAB5] to-[#089c98]'
                      }`}
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>

                  {progress.timeRemainingSec !== undefined && (
                    <div className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Clock className="w-3 h-3" />
                      <span>Est. time remaining: ~{progress.timeRemainingSec}s</span>
                    </div>
                  )}
                </div>
              )}

              {/* Pro Tip for FCP Users */}
              <div className={`p-3 rounded-xl border text-[11px] flex items-start gap-2.5 ${
                isDark ? 'bg-purple-950/20 border-purple-800/40 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'
              }`}>
                <Film className="w-4 h-4 shrink-0 text-purple-400 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-semibold text-xs">Final Cut Pro (FCP) User Tip:</div>
                  <p className="text-[10px] leading-relaxed opacity-90">
                    If you want to edit this footage in Final Cut Pro, switch to the <strong>"NLE Timelines (FCPXML)"</strong> tab. FCPXML preserves 100% original camera quality and allows seamless timeline relinking without re-encoding!
                  </p>
                </div>
              </div>

              {/* Render & Download Action Button */}
              <div>
                <button
                  type="button"
                  disabled={isRendering}
                  onClick={mediaExportType === 'video' ? handleRenderVideo : handleRenderAudio}
                  className={`w-full py-3 rounded-xl text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] ${
                    isDark
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25'
                      : 'bg-[#0ABAB5] hover:bg-[#089c98] shadow-[#0ABAB5]/25'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isRendering
                      ? 'Rendering Media in Progress...'
                      : mediaExportType === 'video'
                      ? `Render & Download Cut Video (${videoOptions.format.toUpperCase()} • ${videoOptions.resolution})`
                      : `Render & Download Cut Audio (${audioOptions.format.toUpperCase()} • ${audioOptions.sampleRate / 1000}kHz)`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: NLE TIMELINE FILE EXPORT */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[11px] font-semibold tracking-wider uppercase ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Select NLE Timeline Format
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Timeline FPS:
                  </span>
                  <select
                    value={timelineFps}
                    onChange={(e) => setTimelineFps(Number(e.target.value))}
                    className={`border rounded-lg px-2 py-1 text-xs ${
                      isDark
                        ? 'bg-[#080d1a] border-[#1e3260] text-white'
                        : 'bg-white border-[#ccf4f1] text-slate-800'
                    }`}
                  >
                    <option value={29.97}>29.97 FPS (NTSC Standard / YouTube / Broadcast)</option>
                    <option value={23.976}>23.976 FPS (Cinema / Film NTSC)</option>
                    <option value={24}>24 FPS (Cinema True)</option>
                    <option value={25}>25 FPS (PAL / Europe)</option>
                    <option value={30}>30 FPS (Web Standard 30p)</option>
                    <option value={59.94}>59.94 FPS (Broadcast HFR NTSC)</option>
                    <option value={60}>60 FPS (Gaming / Action 60p)</option>
                  </select>
                </div>
              </div>

              {/* Final Cut Pro Media Linking Options Box */}
              <div
                className={`p-3.5 rounded-xl border space-y-2.5 ${
                  isDark ? 'bg-[#0a1226] border-[#1e3260]' : 'bg-[#f4fcfb] border-[#bceee9]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <span className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      FCP Media Relinking & Source Matching
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFcpRelinkGuide(!showFcpRelinkGuide)}
                    className={`text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-[#0ABAB5] hover:text-[#0d746f]'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showFcpRelinkGuide ? 'Hide guide' : 'Why "Relink" happens?'}</span>
                  </button>
                </div>

                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Detected original media dimensions:{' '}
                  <span className="font-semibold text-purple-400">
                    {file.videoWidth || 1920}×{file.videoHeight || 1080}
                  </span>{' '}
                  • Audio:{' '}
                  <span className="font-semibold text-purple-400">
                    {file.audioChannels || 2}ch @ {file.audioSampleRate || 48000}Hz
                  </span>
                  . Ensure timeline frame rate matches your camera clip exactly (e.g. 29.97 or 59.94 FPS).
                </p>

                {/* FCPXML Audio Configuration Matchers */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className={`block text-[10px] uppercase font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      FCPXML Audio Rate:
                    </label>
                    <select
                      value={fcpAudioRate}
                      onChange={(e) => setFcpAudioRate(Number(e.target.value))}
                      className={`w-full border rounded-lg px-2.5 py-1.5 text-xs ${
                        isDark ? 'bg-[#080d1a] border-[#1e3260] text-white' : 'bg-white border-[#ccf4f1] text-slate-800'
                      }`}
                    >
                      <option value={sourceAudioRate}>{sourceAudioRate} Hz (Source Match • Recommended)</option>
                      <option value={48000}>48,000 Hz (Video Broadcast Standard)</option>
                      <option value={44100}>44,100 Hz (Music Standard)</option>
                      <option value={96000}>96,000 Hz (High Resolution)</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[10px] uppercase font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      FCPXML Audio Channels:
                    </label>
                    <select
                      value={fcpAudioChannels}
                      onChange={(e) => setFcpAudioChannels(Number(e.target.value))}
                      className={`w-full border rounded-lg px-2.5 py-1.5 text-xs ${
                        isDark ? 'bg-[#080d1a] border-[#1e3260] text-white' : 'bg-white border-[#ccf4f1] text-slate-800'
                      }`}
                    >
                      <option value={2}>Stereo (2 Channels)</option>
                      <option value={1}>Mono (1 Channel)</option>
                    </select>
                  </div>
                </div>

                {/* Optional Absolute Folder Path input */}
                <div>
                  <label className={`block text-[11px] font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Original Media Folder Path on your Mac (Optional, enables 1-click zero-relink import):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={mediaDirectoryPath}
                      onChange={(e) => setMediaDirectoryPath(e.target.value)}
                      placeholder="/Users/yourname/Movies or /Volumes/SD_CARD/DCIM/100MEDIA"
                      className={`flex-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                        isDark
                          ? 'bg-[#080d1a] border-[#1e3260] text-slate-200 placeholder-slate-600 focus:border-cyan-400'
                          : 'bg-white border-[#ccf4f1] text-slate-800 placeholder-slate-400 focus:border-[#0ABAB5]'
                      }`}
                    />
                  </div>
                  <span className={`text-[10px] block mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Tip: Right-click your media file in macOS Finder, hold <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-200">Option ⌥</kbd>, and choose <strong>"Copy as Pathname"</strong>.
                  </span>
                </div>

                {/* Relink Guide Accordion */}
                {showFcpRelinkGuide && (
                  <div
                    className={`mt-2 p-3.5 rounded-xl border text-[11px] space-y-2.5 ${
                      isDark ? 'bg-[#080d1a]/90 border-[#23386b] text-slate-300' : 'bg-white border-[#ccf4f1] text-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center gap-1.5 text-amber-400">
                      <Info className="w-4 h-4 shrink-0" />
                      Diagnosing "Incompatible media / The original file had audio, but the new file does not"
                    </div>

                    <div className="space-y-1.5 text-[11px] leading-relaxed text-slate-300">
                      <p>
                        <strong className="text-white">Why Final Cut Pro shows this error:</strong> When you open FCP's <em>Relink Files</em> dialog, FCP verifies that the target file matches the original media asset's duration, audio track layout, and sample rate.
                      </p>
                      <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300">
                        <li>
                          <strong className="text-amber-300">Relinking to a cut video:</strong> If you try to relink your original camera clip to a rendered cut/pruned video file, FCP will <strong>always reject it</strong> because the cut file has a shorter duration and modified audio! In FCP, <em>Relink Files</em> is only for reconnecting the original uncut footage.
                        </li>
                        <li>
                          <strong className="text-amber-300">Correct Workflow with FCPXML:</strong> Import the <code>.fcpxml</code> into Final Cut Pro (<code>File &gt; Import &gt; XML</code>). Final Cut Pro will open a new project that non-destructively arranges your original high-quality footage on the timeline with all silence cuts in place.
                        </li>
                        <li>
                          <strong className="text-amber-300">If FCP prompts to Relink on XML import:</strong> Click <em>Locate All...</em> and select your <strong>original camera video file ({file.name})</strong>, NEVER a rendered cut file.
                        </li>
                        <li>
                          <strong className="text-amber-300">Audio Sample Rate Match:</strong> Ensure the FCPXML audio rate matches your source file (typically <strong>48,000 Hz</strong> for camera video).
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* DaVinci Resolve */}
              <button
                type="button"
                onClick={handleExportFcpXml}
                className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                  isDark
                    ? 'bg-[#0e1830]/60 border-[#1e3260] hover:border-cyan-400 hover:bg-[#111f3d]'
                    : 'bg-white border-[#ccf4f1] hover:border-[#0ABAB5] hover:bg-[#f8fdfd]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-xs">
                    DaV
                  </div>
                  <div>
                    <div
                      className={`font-semibold text-xs transition-colors ${
                        isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-[#0ABAB5]'
                      }`}
                    >
                      DaVinci Resolve (.fcpxml)
                    </div>
                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Imports complete cut sequence into DaVinci Resolve with clips positioned seamlessly
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
              </button>

              {/* Final Cut Pro */}
              <button
                type="button"
                onClick={handleExportFcpXml}
                className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                  isDark
                    ? 'bg-[#0e1830]/60 border-[#1e3260] hover:border-cyan-400 hover:bg-[#111f3d]'
                    : 'bg-white border-[#ccf4f1] hover:border-[#0ABAB5] hover:bg-[#f8fdfd]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-xs">
                    FCP
                  </div>
                  <div>
                    <div
                      className={`font-semibold text-xs transition-colors ${
                        isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-[#0ABAB5]'
                      }`}
                    >
                      Final Cut Pro (.fcpxml)
                    </div>
                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Apple FCPXML 1.9 timeline ready for macOS Final Cut Pro
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
              </button>

              {/* Adobe Premiere Pro */}
              <button
                type="button"
                onClick={handleExportPremiereXml}
                className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                  isDark
                    ? 'bg-[#0e1830]/60 border-[#1e3260] hover:border-cyan-400 hover:bg-[#111f3d]'
                    : 'bg-white border-[#ccf4f1] hover:border-[#0ABAB5] hover:bg-[#f8fdfd]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                    Pr
                  </div>
                  <div>
                    <div
                      className={`font-semibold text-xs transition-colors ${
                        isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-[#0ABAB5]'
                      }`}
                    >
                      Adobe Premiere Pro (.xml)
                    </div>
                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Standard XML sequence with matched cut tracks and preserved timecodes
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
              </button>

              {/* EDL */}
              <button
                type="button"
                onClick={handleExportEdl}
                className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                  isDark
                    ? 'bg-[#0e1830]/60 border-[#1e3260] hover:border-cyan-400 hover:bg-[#111f3d]'
                    : 'bg-white border-[#ccf4f1] hover:border-[#0ABAB5] hover:bg-[#f8fdfd]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center font-bold text-xs">
                    EDL
                  </div>
                  <div>
                    <div
                      className={`font-semibold text-xs transition-colors ${
                        isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-[#0ABAB5]'
                      }`}
                    >
                      CMX 3600 Edit Decision List (.edl)
                    </div>
                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Broadcast standard EDL for Avid Media Composer and professional edit suites
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
              </button>

              {/* JSON Cut List */}
              <button
                type="button"
                onClick={handleExportJson}
                className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                  isDark
                    ? 'bg-[#0e1830]/60 border-[#1e3260] hover:border-cyan-400 hover:bg-[#111f3d]'
                    : 'bg-white border-[#ccf4f1] hover:border-[#0ABAB5] hover:bg-[#f8fdfd]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-xs">
                    JSON
                  </div>
                  <div>
                    <div
                      className={`font-semibold text-xs transition-colors ${
                        isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-[#0ABAB5]'
                      }`}
                    >
                      JSON Cut Decision List (.json)
                    </div>
                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Machine-readable start/end timestamps for Python, ffmpeg, or custom pipelines
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t ${
            isDark ? 'border-[#1b2e59] bg-[#0e1830]/80' : 'border-[#ccf4f1] bg-[#f8fdfd]'
          }`}
        >
          <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Hardware acceleration: active
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isRendering}
            className={`px-5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
              isDark
                ? 'bg-[#111f3d] hover:bg-[#16284f] text-slate-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
