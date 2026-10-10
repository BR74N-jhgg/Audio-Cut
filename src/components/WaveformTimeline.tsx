import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  FastForward,
  Rewind,
  Scissors,
  Download,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { ProcessedFile, AudioSegment, ThemeMode } from '../types';
import { formatTimecode, formatDurationHuman } from '../utils/exporters';

interface WaveformTimelineProps {
  file: ProcessedFile;
  theme: ThemeMode;
  onUpdateSegmentKeep: (fileId: string, segmentId: string, keep: boolean) => void;
  onOpenExportModal: () => void;
}

export const WaveformTimeline: React.FC<WaveformTimelineProps> = ({
  file,
  theme,
  onUpdateSegmentKeep,
  onOpenExportModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const isJumpingRef = useRef<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [jumpcutMode, setJumpcutMode] = useState<boolean>(true); // default true: skip silences!
  const [zoom, setZoom] = useState<number>(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [hoveredSegment, setHoveredSegment] = useState<AudioSegment | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  const isDark = theme === 'dark';

  // Keep isPlayingRef in sync with isPlaying
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Jumpcut playback loop
  useEffect(() => {
    let animFrame: number;

    const checkJumpcut = () => {
      if (!mediaRef.current) return;
      const t = mediaRef.current.currentTime;
      setCurrentTime(t);

      if (isPlayingRef.current && jumpcutMode) {
        // Find segment at current time
        const currentSegIndex = file.segments.findIndex((s) => t >= s.start && t < s.end);
        if (currentSegIndex !== -1) {
          const currentSeg = file.segments[currentSegIndex];
          if (!currentSeg.keep) {
            // Find the next kept speech segment by index or future timestamp
            const nextKept =
              file.segments.slice(currentSegIndex + 1).find((s) => s.keep) ||
              file.segments.find((s) => s.start > t + 0.02 && s.keep);

            if (nextKept) {
              if (Math.abs(t - nextKept.start) > 0.04) {
                isJumpingRef.current = true;
                mediaRef.current.currentTime = nextKept.start;
                setCurrentTime(nextKept.start);
                if (mediaRef.current.paused) {
                  mediaRef.current.play().catch(() => {});
                }
              }
            } else {
              // Reached end of kept content
              isJumpingRef.current = false;
              mediaRef.current.pause();
              setIsPlaying(false);
              isPlayingRef.current = false;
              return;
            }
          }
        }
      }

      if (isPlayingRef.current) {
        animFrame = requestAnimationFrame(checkJumpcut);
      }
    };

    if (isPlaying) {
      animFrame = requestAnimationFrame(checkJumpcut);
    }

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [isPlaying, jumpcutMode, file.segments]);

  // Handle Play/Pause
  const togglePlay = useCallback(() => {
    if (!mediaRef.current) return;
    if (isPlaying) {
      isJumpingRef.current = false;
      mediaRef.current.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      const cur = mediaRef.current.currentTime;
      const lastKept = [...file.segments].reverse().find((s) => s.keep);

      // If at or past the end of the last speech segment, restart from the first kept segment
      if (lastKept && cur >= lastKept.end - 0.05) {
        const firstKept = file.segments.find((s) => s.keep);
        const restartTime = firstKept ? firstKept.start : 0;
        mediaRef.current.currentTime = restartTime;
        setCurrentTime(restartTime);
      } else if (jumpcutMode) {
        // If starting while positioned inside a cut silence segment, jump to next kept segment
        const inCutIdx = file.segments.findIndex((s) => cur >= s.start && cur < s.end && !s.keep);
        if (inCutIdx !== -1) {
          const nextKept =
            file.segments.slice(inCutIdx + 1).find((s) => s.keep) ||
            file.segments.find((s) => s.start > cur + 0.02 && s.keep);
          if (nextKept) {
            isJumpingRef.current = true;
            mediaRef.current.currentTime = nextKept.start;
            setCurrentTime(nextKept.start);
          }
        }
      }

      isPlayingRef.current = true;
      setIsPlaying(true);
      mediaRef.current
        .play()
        .then(() => {
          isPlayingRef.current = true;
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('Playback play failed:', err);
          isPlayingRef.current = false;
          setIsPlaying(false);
        });
    }
  }, [isPlaying, jumpcutMode, file.segments]);

  // Keyboard shortcut for spacebar play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        seekRelative(-1);
      } else if (e.code === 'ArrowRight') {
        seekRelative(1);
      } else if (e.code === 'KeyJ') {
        jumpToCut('prev');
      } else if (e.code === 'KeyK') {
        togglePlay();
      } else if (e.code === 'KeyL') {
        jumpToCut('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const seekTo = (time: number) => {
    const clamped = Math.max(0, Math.min(file.originalDuration, time));
    if (mediaRef.current) {
      mediaRef.current.currentTime = clamped;
    }
    setCurrentTime(clamped);
  };

  const seekRelative = (delta: number) => {
    seekTo(currentTime + delta);
  };

  const jumpToCut = (dir: 'next' | 'prev') => {
    if (dir === 'next') {
      const nextSeg = file.segments.find((s) => s.start > currentTime + 0.1);
      if (nextSeg) seekTo(nextSeg.start);
    } else {
      const prevSeg = [...file.segments].reverse().find((s) => s.start < currentTime - 0.2);
      if (prevSeg) seekTo(prevSeg.start);
    }
  };

  // Draw Waveform onto Canvas with Theme awareness (Navy Blue vs Tiffany Blue)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const duration = file.originalDuration || 1;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Canvas background
    ctx.fillStyle = isDark ? '#080d1a' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Center baseline
    ctx.strokeStyle = isDark ? '#1e3260' : '#b2ebe7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // 1. Draw segment background highlights
    file.segments.forEach((seg) => {
      const xStart = (seg.start / duration) * width;
      const xEnd = (seg.end / duration) * width;
      const segWidth = Math.max(1, xEnd - xStart);

      if (!seg.keep) {
        // Cut silence segment: Red/Rose shaded background with diagonal stripe texture
        ctx.fillStyle = isDark ? 'rgba(244, 63, 94, 0.16)' : 'rgba(244, 63, 94, 0.12)';
        ctx.fillRect(xStart, 0, segWidth, height);

        // Top and bottom border
        ctx.fillStyle = isDark ? 'rgba(244, 63, 94, 0.6)' : 'rgba(244, 63, 94, 0.5)';
        ctx.fillRect(xStart, 0, segWidth, 2);
        ctx.fillRect(xStart, height - 2, segWidth, 2);

        // Diagonal hatch lines
        ctx.strokeStyle = isDark ? 'rgba(244, 63, 94, 0.25)' : 'rgba(244, 63, 94, 0.20)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const stripeStep = 10;
        for (let sx = xStart; sx < xEnd + height; sx += stripeStep) {
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx - height, height);
        }
        ctx.stroke();
      } else {
        // Kept speech segment: Navy subtle blue or Tiffany mint
        ctx.fillStyle = isDark ? 'rgba(37, 99, 235, 0.08)' : 'rgba(10, 186, 181, 0.08)';
        ctx.fillRect(xStart, 0, segWidth, height);
      }
    });

    // 2. Draw audio waveform peaks
    const peaks = file.waveformPeaks;
    if (peaks && peaks.length > 0) {
      const barCount = Math.floor(width / 3);
      const step = peaks.length / barCount;

      for (let b = 0; b < barCount; b++) {
        const peakIdx = Math.floor(b * step);
        const peak = peaks[peakIdx] || 0;
        const x = b * 3;
        const timeAtX = (x / width) * duration;

        const seg = file.segments.find((s) => timeAtX >= s.start && timeAtX < s.end);
        const isCut = seg && !seg.keep;

        const barHeight = Math.max(4, peak * (height - 20));
        const yTop = (height - barHeight) / 2;

        if (isCut) {
          ctx.fillStyle = isDark ? 'rgba(244, 63, 94, 0.45)' : 'rgba(244, 63, 94, 0.4)';
        } else {
          // Active speech: Ice-blue in Navy dark mode, signature Tiffany Blue (#0ABAB5) in light mode
          ctx.fillStyle = isDark ? '#93c5fd' : '#0ABAB5';
        }

        ctx.beginPath();
        ctx.roundRect(x, yTop, 2, barHeight, 1);
        ctx.fill();
      }
    }

    // 3. Cut markers & scissors
    file.segments.forEach((seg) => {
      const xStart = (seg.start / duration) * width;
      const xEnd = (seg.end / duration) * width;

      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xStart, 0);
      ctx.lineTo(xStart, height);
      ctx.stroke();

      if (!seg.keep && xEnd - xStart > 24) {
        ctx.fillStyle = isDark ? '#f43f5e' : '#e11d48';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`✂ -${seg.duration.toFixed(1)}s`, (xStart + xEnd) / 2, 14);
      }
    });

    // 4. Playhead
    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = isDark ? '#38bdf8' : '#0ABAB5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#38bdf8' : '#0ABAB5';
    ctx.beginPath();
    ctx.arc(playheadX, 6, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [file, currentTime, zoom, isDark]);

  // Handlers
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    handleTimelineSeek(e);
  };

  const handleTimelineSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percent * file.originalDuration;
    seekTo(targetTime);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      handleTimelineSeek(e);
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const timeAtX = percent * file.originalDuration;

    const seg = file.segments.find((s) => timeAtX >= s.start && timeAtX < s.end);
    if (seg) {
      setHoveredSegment(seg);
      setHoverPos({ x: e.clientX, y: rect.top - 10 });
    } else {
      setHoveredSegment(null);
      setHoverPos(null);
    }
  };

  const handleTimelineMouseUp = () => {
    setIsScrubbing(false);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.altKey && hoveredSegment) {
      onUpdateSegmentKeep(file.id, hoveredSegment.id, !hoveredSegment.keep);
    }
  };

  const toggleCurrentHoveredSegment = () => {
    if (hoveredSegment) {
      onUpdateSegmentKeep(file.id, hoveredSegment.id, !hoveredSegment.keep);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Metrics Banner */}
      <div
        className={`grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-sm transition-colors ${
          isDark
            ? 'bg-[#0e1830]/80 border-[#1b2e59]'
            : 'bg-white/90 border-[#b2ebe7] shadow-sm'
        }`}
      >
        {/* Metric 1: Time Saved */}
        <div
          className={`border rounded-xl p-3 flex flex-col justify-between ${
            isDark ? 'bg-[#080d1a]/80 border-[#1e3260]' : 'bg-[#f0fbfb] border-[#ccf4f1]'
          }`}
        >
          <span className={`text-[10px] uppercase tracking-wider font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Time Saved
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-black tracking-tight ${
                isDark ? 'text-cyan-400' : 'text-[#0ABAB5]'
              }`}
            >
              -{file.timeSavedPercentage}%
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              ({formatDurationHuman(Math.max(0, file.originalDuration - file.newDuration))} cut)
            </span>
          </div>
        </div>

        {/* Metric 2: New Duration */}
        <div
          className={`border rounded-xl p-3 flex flex-col justify-between ${
            isDark ? 'bg-[#080d1a]/80 border-[#1e3260]' : 'bg-[#f0fbfb] border-[#ccf4f1]'
          }`}
        >
          <span className={`text-[10px] uppercase tracking-wider font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            New Duration
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatDurationHuman(file.newDuration)}
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              from {formatDurationHuman(file.originalDuration)}
            </span>
          </div>
        </div>

        {/* Metric 3: Total Cuts */}
        <div
          className={`border rounded-xl p-3 flex flex-col justify-between ${
            isDark ? 'bg-[#080d1a]/80 border-[#1e3260]' : 'bg-[#f0fbfb] border-[#ccf4f1]'
          }`}
        >
          <span className={`text-[10px] uppercase tracking-wider font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Cuts Made
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {file.cutsCount}
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              silent gaps removed
            </span>
          </div>
        </div>

        {/* Metric 4: Work Time Saved */}
        <div
          className={`border rounded-xl p-3 flex flex-col justify-between ${
            isDark ? 'bg-[#080d1a]/80 border-[#1e3260]' : 'bg-[#f0fbfb] border-[#ccf4f1]'
          }`}
        >
          <span className={`text-[10px] uppercase tracking-wider font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Work Time Saved
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-black tracking-tight ${isDark ? 'text-blue-400' : 'text-[#0d9488]'}`}>
              ~{Math.max(3, Math.round(file.cutsCount * 0.15))} mins
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              manual scrubbing
            </span>
          </div>
        </div>
      </div>

      {/* Main Timeline Card */}
      <div
        className={`border rounded-2xl overflow-hidden shadow-2xl transition-colors ${
          isDark
            ? 'bg-[#0a1128] border-[#1b2e59]'
            : 'bg-white border-[#b2ebe7] shadow-sm'
        }`}
      >
        {/* Subheader */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b ${
            isDark ? 'border-[#1b2e59] bg-[#0e1830]/60' : 'border-[#ccf4f1] bg-[#f8fdfd]'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`font-semibold text-xs tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-cyan-400 animate-pulse' : 'bg-[#0ABAB5] animate-pulse'}`} />
              {file.name}
            </span>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                isDark
                  ? 'text-slate-400 bg-[#080d1a] border-[#1e3260]'
                  : 'text-slate-600 bg-white border-[#ccf4f1]'
              }`}
            >
              {file.mediaType.toUpperCase()} • {file.sizeFormatted}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Jumpcut mode switch */}
            <button
              onClick={() => setJumpcutMode(!jumpcutMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                jumpcutMode
                  ? isDark
                    ? 'bg-blue-600/20 border-cyan-400 text-cyan-300 shadow-sm'
                    : 'bg-[#0ABAB5]/15 border-[#0ABAB5] text-[#0d746f] shadow-sm'
                  : isDark
                  ? 'bg-[#111f3d] border-[#1e3260] text-slate-400 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Jumpcut Preview: {jumpcutMode ? 'ACTIVE (Skipping Silence)' : 'OFF (Raw)'}</span>
            </button>

            {/* Export Button */}
            <button
              onClick={onOpenExportModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                isDark
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25'
                  : 'bg-[#0ABAB5] hover:bg-[#089c98] shadow-[#0ABAB5]/25'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Media & Timeline</span>
            </button>
          </div>
        </div>

        {/* Media Preview Player & Controls */}
        <div
          className={`p-4 border-b ${
            isDark ? 'bg-[#080d1a] border-[#1b2e59]' : 'bg-white border-[#ccf4f1]'
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            {/* Player viewport */}
            <div
              className={`lg:col-span-1 rounded-xl border overflow-hidden aspect-video flex items-center justify-center relative group ${
                isDark ? 'bg-black border-[#1e3260]' : 'bg-slate-900 border-[#b2ebe7]'
              }`}
            >
              {file.mediaType === 'video' ? (
                <video
                  ref={mediaRef as any}
                  src={file.url}
                  className="w-full h-full object-contain"
                  playsInline
                  onEnded={() => {
                    isJumpingRef.current = false;
                    isPlayingRef.current = false;
                    setIsPlaying(false);
                  }}
                  onPlay={() => {
                    isPlayingRef.current = true;
                    setIsPlaying(true);
                  }}
                  onPause={() => {
                    if (!isJumpingRef.current) {
                      isPlayingRef.current = false;
                      setIsPlaying(false);
                    }
                  }}
                  onSeeked={() => {
                    isJumpingRef.current = false;
                    if (isPlayingRef.current && mediaRef.current?.paused) {
                      mediaRef.current.play().catch(() => {});
                    }
                  }}
                  onTimeUpdate={() => {
                    if (mediaRef.current) {
                      setCurrentTime(mediaRef.current.currentTime);
                    }
                  }}
                />
              ) : (
                <audio
                  ref={mediaRef as any}
                  src={file.url}
                  onEnded={() => {
                    isJumpingRef.current = false;
                    isPlayingRef.current = false;
                    setIsPlaying(false);
                  }}
                  onPlay={() => {
                    isPlayingRef.current = true;
                    setIsPlaying(true);
                  }}
                  onPause={() => {
                    if (!isJumpingRef.current) {
                      isPlayingRef.current = false;
                      setIsPlaying(false);
                    }
                  }}
                  onSeeked={() => {
                    isJumpingRef.current = false;
                    if (isPlayingRef.current && mediaRef.current?.paused) {
                      mediaRef.current.play().catch(() => {});
                    }
                  }}
                  onTimeUpdate={() => {
                    if (mediaRef.current) {
                      setCurrentTime(mediaRef.current.currentTime);
                    }
                  }}
                />
              )}

              {file.mediaType === 'audio' && (
                <div className="text-center p-4">
                  <div
                    className={`w-12 h-12 rounded-full border flex items-center justify-center mx-auto mb-2 ${
                      isDark
                        ? 'bg-blue-600/20 border-cyan-400 text-cyan-300'
                        : 'bg-[#0ABAB5]/20 border-[#0ABAB5] text-[#0ABAB5]'
                    }`}
                  >
                    <Volume2 className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-white font-medium">{file.name}</span>
                </div>
              )}

              <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white border border-white/10 flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPlaying ? (isDark ? 'bg-cyan-400 animate-ping' : 'bg-[#0ABAB5] animate-ping') : 'bg-zinc-500'
                  }`}
                />
                {formatTimecode(currentTime)}
              </div>

              {jumpcutMode && isPlaying && (
                <div
                  className={`absolute bottom-2 right-2 text-white px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide flex items-center gap-1 shadow-md ${
                    isDark ? 'bg-blue-600/90' : 'bg-[#0ABAB5]/90'
                  }`}
                >
                  <FastForward className="w-3 h-3" />
                  JUMPCUT ACTIVE
                </div>
              )}
            </div>

            {/* Playback Controls */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-lg transition-all cursor-pointer ${
                      isDark
                        ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'
                        : 'bg-[#0ABAB5] hover:bg-[#089c98] shadow-[#0ABAB5]/30'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>

                  {/* Previous Cut */}
                  <button
                    onClick={() => jumpToCut('prev')}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-[#111f3d] hover:bg-[#16284f] text-slate-300 border-[#1e3260]'
                        : 'bg-white hover:bg-[#e4f7f6] text-slate-700 border-[#ccf4f1]'
                    }`}
                    title="Jump to Previous Cut (J)"
                  >
                    <Rewind className="w-4 h-4" />
                  </button>

                  {/* Next Cut */}
                  <button
                    onClick={() => jumpToCut('next')}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-[#111f3d] hover:bg-[#16284f] text-slate-300 border-[#1e3260]'
                        : 'bg-white hover:bg-[#e4f7f6] text-slate-700 border-[#ccf4f1]'
                    }`}
                    title="Jump to Next Cut (L)"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>

                  {/* Reset */}
                  <button
                    onClick={() => seekTo(0)}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-[#111f3d] hover:bg-[#16284f] text-slate-400 hover:text-white border-[#1e3260]'
                        : 'bg-white hover:bg-[#e4f7f6] text-slate-500 hover:text-slate-900 border-[#ccf4f1]'
                    }`}
                    title="Restart from beginning"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Playback speed selector */}
                  <div
                    className={`flex items-center border rounded-lg p-0.5 text-xs ${
                      isDark ? 'bg-[#111f3d] border-[#1e3260]' : 'bg-white border-[#ccf4f1]'
                    }`}
                  >
                    {[1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (mediaRef.current) mediaRef.current.playbackRate = rate;
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          playbackRate === rate
                            ? isDark
                              ? 'bg-blue-600 text-white'
                              : 'bg-[#0ABAB5] text-white'
                            : isDark
                            ? 'text-slate-400 hover:text-white'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Timecodes */}
                <div className="flex items-center gap-3 text-xs font-mono">
                  <div
                    className={`px-2.5 py-1 rounded-lg border ${
                      isDark
                        ? 'bg-[#111f3d] border-[#1e3260] text-slate-300'
                        : 'bg-white border-[#ccf4f1] text-slate-700'
                    }`}
                  >
                    Playhead: <span className="font-bold">{currentTime.toFixed(1)}s</span>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-lg border ${
                      isDark
                        ? 'bg-[#111f3d] border-[#1e3260] text-slate-400'
                        : 'bg-white border-[#ccf4f1] text-slate-500'
                    }`}
                  >
                    Total: <span>{file.originalDuration.toFixed(1)}s</span>
                  </div>
                </div>
              </div>

              {/* Instructions Bar */}
              <div
                className={`flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg border ${
                  isDark
                    ? 'bg-[#0e1830] text-slate-400 border-[#1e3260]'
                    : 'bg-[#f0fbfb] text-slate-600 border-[#ccf4f1]'
                }`}
              >
                <span>
                  💡 <b>Shortcuts:</b> Space to Play/Pause • J/L to jump cuts • Click segment to view • Alt+Click to toggle Keep/Cut
                </span>
                {hoveredSegment && (
                  <button
                    onClick={toggleCurrentHoveredSegment}
                    className={`text-xs font-semibold underline cursor-pointer ${
                      isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-[#0ABAB5] hover:text-[#089c98]'
                    }`}
                  >
                    Toggle {hoveredSegment.keep ? 'Cut' : 'Keep'} ({hoveredSegment.duration.toFixed(1)}s)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Waveform Canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleTimelineMouseDown}
          onMouseMove={handleTimelineMouseMove}
          onMouseUp={handleTimelineMouseUp}
          onClick={handleTimelineClick}
          className={`relative h-32 w-full cursor-crosshair select-none overflow-hidden ${
            isDark ? 'bg-[#080d1a]' : 'bg-white'
          }`}
        >
          <canvas ref={canvasRef} width={1600} height={128} className="w-full h-full block" />

          {/* Hover Tooltip */}
          {hoveredSegment && hoverPos && (
            <div
              style={{ left: Math.min(window.innerWidth - 200, Math.max(10, hoverPos.x - 70)) }}
              className={`fixed bottom-32 z-50 pointer-events-none text-[11px] px-3 py-1.5 rounded-lg border shadow-xl backdrop-blur-md ${
                isDark
                  ? 'bg-[#0e1830] text-white border-[#2563eb]'
                  : 'bg-white text-slate-900 border-[#0ABAB5]'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    hoveredSegment.keep
                      ? isDark
                        ? 'bg-cyan-400'
                        : 'bg-[#0ABAB5]'
                      : 'bg-rose-500'
                  }`}
                />
                {hoveredSegment.keep ? 'Kept Speech' : 'Cut Silence (✂)'}
              </div>
              <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {hoveredSegment.start.toFixed(2)}s → {hoveredSegment.end.toFixed(2)}s ({hoveredSegment.duration.toFixed(2)}s)
              </div>
            </div>
          )}
        </div>

        {/* Timeline Bottom Legend */}
        <div
          className={`flex flex-wrap items-center justify-between px-5 py-2.5 border-t text-[11px] ${
            isDark
              ? 'bg-[#0e1830]/80 border-[#1b2e59] text-slate-400'
              : 'bg-[#f8fdfd] border-[#ccf4f1] text-slate-600'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded ${isDark ? 'bg-[#93c5fd]' : 'bg-[#0ABAB5]'}`} />
              <span>Kept Speech Audio</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500/40 border border-rose-500" />
              <span>Cut Silence (Will be removed)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span>{file.segments.filter((s) => s.keep).length} speech blocks kept</span>
            <span>•</span>
            <span className="text-rose-400 font-medium">{file.cutsCount} silent blocks removed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
