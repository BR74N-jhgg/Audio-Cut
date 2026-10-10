import { ProcessingSettings, AudioSegment } from '../types';

/**
 * Decodes an audio/video File or Blob into an AudioBuffer using the browser's Web Audio API.
 * Uses native sampleRate without forcing 44100 Hz so the true source audio rate is preserved.
 */
export async function decodeMediaFile(file: File | Blob): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  // Do NOT constrain sampleRate so the browser initializes AudioContext
  // at the system/hardware native sample rate (e.g. 48000 Hz for video or 44100 Hz for CD)
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    return audioBuffer;
  } finally {
    // Clean up AudioContext
    if (audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  }
}

/**
 * Extracts normalized peak data for rendering the waveform on Canvas.
 */
export function extractWaveformPeaks(audioBuffer: AudioBuffer, targetPoints: number = 1200): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const totalSamples = channelData.length;
  const blockSize = Math.floor(totalSamples / targetPoints);
  const peaks: number[] = new Array(targetPoints);

  for (let i = 0; i < targetPoints; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, totalSamples);
    let max = 0;
    for (let j = start; j < end; j++) {
      const absVal = Math.abs(channelData[j]);
      if (absVal > max) {
        max = absVal;
      }
    }
    peaks[i] = Math.min(1, max);
  }

  return peaks;
}

/**
 * Detects silent intervals and kept speech intervals in an AudioBuffer.
 */
export function detectSilence(
  audioBuffer: AudioBuffer,
  settings: ProcessingSettings
): {
  segments: AudioSegment[];
  originalDuration: number;
  newDuration: number;
  timeSavedPercentage: number;
  cutsCount: number;
  computedThresholdDb: number;
} {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const originalDuration = audioBuffer.duration;

  // Window size for RMS analysis: 25ms
  const windowSeconds = 0.025;
  const windowSamples = Math.floor(sampleRate * windowSeconds);
  const totalWindows = Math.floor(channelData.length / windowSamples);

  const windowDbs: number[] = new Array(totalWindows);
  let minDb = 0;
  let maxDb = -100;

  for (let w = 0; w < totalWindows; w++) {
    const startSample = w * windowSamples;
    const endSample = startSample + windowSamples;
    let sumSquares = 0;

    for (let s = startSample; s < endSample; s++) {
      const val = channelData[s];
      sumSquares += val * val;
    }

    const rms = Math.sqrt(sumSquares / windowSamples);
    // Convert to dBFS (clamp at -90 dB for absolute silence)
    const db = rms > 0.00001 ? 20 * Math.log10(rms) : -90;
    windowDbs[w] = db;

    if (db < minDb) minDb = db;
    if (db > maxDb) maxDb = db;
  }

  // Determine effective threshold dB
  let effectiveThresholdDb = settings.thresholdDb;

  if (settings.sensitivityMode === 'auto') {
    // Sort dbs to analyze histogram / noise floor
    const sorted = [...windowDbs].sort((a, b) => a - b);
    const p15 = sorted[Math.floor(sorted.length * 0.15)] || -60; // Approximate background noise
    const p85 = sorted[Math.floor(sorted.length * 0.85)] || -15; // Approximate active speech

    if (settings.sensitivityLevel === 'aggressive') {
      // Cut tighter into speech tails
      effectiveThresholdDb = p15 + (p85 - p15) * 0.45;
    } else if (settings.sensitivityLevel === 'conservative') {
      // Very safe, only cut absolute dead air
      effectiveThresholdDb = p15 + (p85 - p15) * 0.20;
    } else {
      // Moderate (default)
      effectiveThresholdDb = p15 + (p85 - p15) * 0.32;
    }

    // Clamp between -55 dB and -18 dB
    effectiveThresholdDb = Math.min(-18, Math.max(-55, Math.round(effectiveThresholdDb)));
  }

  // Step 1: Label raw windows as speech or silence
  const rawSilent: boolean[] = new Array(totalWindows);
  for (let w = 0; w < totalWindows; w++) {
    rawSilent[w] = windowDbs[w] < effectiveThresholdDb;
  }

  // Step 2: Group consecutive windows into preliminary segments
  interface RawSegment {
    start: number;
    end: number;
    isSilent: boolean;
    avgDb: number;
    peakDb: number;
  }

  const rawSegments: RawSegment[] = [];
  if (totalWindows > 0) {
    let currentIsSilent = rawSilent[0];
    let startIdx = 0;
    let sumDb = windowDbs[0];
    let peak = windowDbs[0];

    for (let w = 1; w < totalWindows; w++) {
      if (rawSilent[w] === currentIsSilent) {
        sumDb += windowDbs[w];
        if (windowDbs[w] > peak) peak = windowDbs[w];
      } else {
        const count = w - startIdx;
        rawSegments.push({
          start: startIdx * windowSeconds,
          end: w * windowSeconds,
          isSilent: currentIsSilent,
          avgDb: sumDb / count,
          peakDb: peak,
        });

        currentIsSilent = rawSilent[w];
        startIdx = w;
        sumDb = windowDbs[w];
        peak = windowDbs[w];
      }
    }

    // Push trailing segment
    const count = totalWindows - startIdx;
    rawSegments.push({
      start: startIdx * windowSeconds,
      end: originalDuration,
      isSilent: currentIsSilent,
      avgDb: sumDb / count,
      peakDb: peak,
    });
  }

  // Step 3: Apply minimum silence duration filter
  // Silences shorter than minSilenceDuration are considered natural pauses and kept
  for (let i = 0; i < rawSegments.length; i++) {
    const seg = rawSegments[i];
    const duration = seg.end - seg.start;
    if (seg.isSilent && duration < settings.minSilenceDuration) {
      seg.isSilent = false; // keep it!
    }
    // Also ignore tiny speech bursts (e.g. mic pops or coughs)
    if (!seg.isSilent && duration < settings.minSpeechDuration) {
      seg.isSilent = true; // treat as noise / cut
    }
  }

  // Step 4: Merge adjacent segments with same status
  const mergedSegments: RawSegment[] = [];
  for (const seg of rawSegments) {
    if (mergedSegments.length === 0) {
      mergedSegments.push({ ...seg });
    } else {
      const last = mergedSegments[mergedSegments.length - 1];
      if (last.isSilent === seg.isSilent) {
        last.end = seg.end;
        last.avgDb = (last.avgDb + seg.avgDb) / 2;
        last.peakDb = Math.max(last.peakDb, seg.peakDb);
      } else {
        mergedSegments.push({ ...seg });
      }
    }
  }

  // Step 5: Apply padding before and after speech chunks
  // Padding expands speech segments into neighbouring silence to avoid clipping consonants
  const finalSegments: AudioSegment[] = [];
  const padBefore = settings.padBefore;
  const padAfter = settings.padAfter;

  for (let i = 0; i < mergedSegments.length; i++) {
    const seg = mergedSegments[i];
    let start = seg.start;
    let end = seg.end;

    if (!seg.isSilent) {
      // Speech: expand earlier by padBefore and later by padAfter
      start = Math.max(0, start - padBefore);
      end = Math.min(originalDuration, end + padAfter);
    }

    // Clamp with previous segment
    if (finalSegments.length > 0) {
      const prev = finalSegments[finalSegments.length - 1];
      if (!seg.isSilent && prev.isSilent) {
        // Adjust previous silence's end to avoid overlap
        prev.end = Math.min(prev.end, start);
        prev.duration = Math.max(0, prev.end - prev.start);
      }
    }

    finalSegments.push({
      id: `seg-${i}-${Math.random().toString(36).substr(2, 6)}`,
      start,
      end,
      duration: Math.max(0, end - start),
      isSilent: seg.isSilent,
      keep: !seg.isSilent, // speech is kept by default, silence is cut by default
      avgDb: Math.round(seg.avgDb),
      peakDb: Math.round(seg.peakDb),
    });
  }

  // Filter out any 0-duration segments
  const validSegments = finalSegments.filter((s) => s.duration > 0.01);

  // Compute stats
  let newDuration = 0;
  let cutsCount = 0;

  for (const s of validSegments) {
    if (s.keep) {
      newDuration += s.duration;
    } else {
      cutsCount++;
    }
  }

  const timeSaved = Math.max(0, originalDuration - newDuration);
  const timeSavedPercentage = originalDuration > 0
    ? Math.round((timeSaved / originalDuration) * 100)
    : 0;

  return {
    segments: validSegments,
    originalDuration,
    newDuration,
    timeSavedPercentage,
    cutsCount,
    computedThresholdDb: effectiveThresholdDb,
  };
}
