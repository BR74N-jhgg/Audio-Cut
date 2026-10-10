import {
  AudioSegment,
  ProcessedFile,
  VideoExportOptions,
  AudioExportOptions,
  VideoResolutionPreset,
} from '../types';

/**
 * Format seconds into HH:MM:SS:FF or HH:MM:SS.mmm
 */
export function formatTimecode(seconds: number, fps: number = 30): string {
  const roundedFps = Math.round(fps);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * roundedFps);

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

export function formatDurationHuman(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function resolveResolutionDimensions(
  preset: VideoResolutionPreset,
  sourceWidth: number = 1920,
  sourceHeight: number = 1080
): { width: number; height: number } {
  switch (preset) {
    case '4k': return { width: 3840, height: 2160 };
    case '1440p': return { width: 2560, height: 1440 };
    case '1080p': return { width: 1920, height: 1080 };
    case '720p': return { width: 1280, height: 720 };
    case 'vertical_1080p': return { width: 1080, height: 1920 };
    case '540p': return { width: 960, height: 540 };
    case 'source':
    default:
      return { width: sourceWidth || 1920, height: sourceHeight || 1080 };
  }
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Helper to convert decimal frame rates (e.g., 29.97, 59.94) into strictly integer FCPXML timebases.
 */
function getFcpTimebase(fps: number) {
  const fpsFloat = Math.round(fps * 1000) / 1000;

  if (fpsFloat >= 23.97 && fpsFloat <= 23.98) return { fpsName: "2398", frameDuration: "1001/24000s", num: 1001, den: 24000 };
  if (fpsFloat === 24) return { fpsName: "24", frameDuration: "100/2400s", num: 100, den: 2400 };
  if (fpsFloat === 25) return { fpsName: "25", frameDuration: "100/2500s", num: 100, den: 2500 };
  if (fpsFloat >= 29.97 && fpsFloat <= 29.98) return { fpsName: "2997", frameDuration: "1001/30000s", num: 1001, den: 30000 };
  if (fpsFloat === 30) return { fpsName: "30", frameDuration: "100/3000s", num: 100, den: 3000 };
  if (fpsFloat === 50) return { fpsName: "50", frameDuration: "100/5000s", num: 100, den: 5000 };
  if (fpsFloat >= 59.94 && fpsFloat <= 59.95) return { fpsName: "5994", frameDuration: "1001/60000s", num: 1001, den: 60000 };
  if (fpsFloat === 60) return { fpsName: "60", frameDuration: "100/6000s", num: 100, den: 6000 };
  
  const intFps = Math.round(fpsFloat);
  return { fpsName: String(intFps), frameDuration: `100/${intFps * 100}s`, num: 100, den: intFps * 100 };
}

/**
 * Generates an FCPXML (Final Cut Pro / DaVinci Resolve XML) compliant with FCPXML 1.9 DTD.
 */
export function generateFcpXml(file: ProcessedFile, fps: number = 30): string {
  const keptSegments = file.segments.filter((s) => s.keep);
  const isVideo = file.mediaType === 'video';
  
  const tb = getFcpTimebase(fps);
  const exactFps = tb.den / tb.num;
  
  // SAFEGUARD CLAMP: Trim 2 frames off the total duration to avoid the "no shared media range" 
  // out-of-bounds error on DJI files when they are successfully relinked.
  const safeTotalFrames = Math.max(1, Math.floor(file.originalDuration * exactFps) - 2);
  
  let spineClips = '';
  let timelineOffsetFrames = 0;

  keptSegments.forEach((seg, idx) => {
    let startFrames = Math.round(seg.start * exactFps);
    let durationFrames = Math.max(1, Math.round(seg.duration * exactFps));

    // Clamp the individual clip so it never asks for a frame past the safe file bounds
    if (startFrames >= safeTotalFrames) return; 
    if (startFrames + durationFrames > safeTotalFrames) {
      durationFrames = safeTotalFrames - startFrames;
    }
    if (durationFrames <= 0) return;

    const clipName = `${escapeXml(file.name)} - Cut ${idx + 1}`;
    
    // FCP strongly prefers "0s" instead of "0/30000s"
    const startStr = startFrames === 0 ? "0s" : `${startFrames * tb.num}/${tb.den}s`;
    const offsetStr = timelineOffsetFrames === 0 ? "0s" : `${timelineOffsetFrames * tb.num}/${tb.den}s`;
    const durationStr = `${durationFrames * tb.num}/${tb.den}s`;

    spineClips += `
                    <asset-clip name="${clipName}" ref="r1" offset="${offsetStr}" duration="${durationStr}" start="${startStr}" format="r0" tcFormat="NDF" />`;

    timelineOffsetFrames += durationFrames;
  });

  const safeFileName = encodeURI(file.name).replace(/#/g, '%23').replace(/\?/g, '%3F');
  const hasVideoAttr = isVideo ? 'hasVideo="1"' : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
    <resources>
        <format id="r0" name="FFVideoFormat1080p${tb.fpsName}" frameDuration="${tb.frameDuration}" width="1920" height="1080" />
        <!-- RESTORED duration and format attributes so FCP can build the "Offline" clip. 
             KEPT start="0s" to override DJI timecode. -->
        <asset id="r1" name="${escapeXml(file.name)}" start="0s" duration="${safeTotalFrames * tb.num}/${tb.den}s" format="r0" ${hasVideoAttr} hasAudio="1">
            <media-rep kind="original-media" src="file:///Users/Shared/${safeFileName}" />
        </asset>
    </resources>
    <library>
        <event name="AutoEdit Export">
            <project name="${escapeXml(file.name)} (Silence Removed)">
                <sequence format="r0" duration="${timelineOffsetFrames * tb.num}/${tb.den}s" tcStart="0s" tcFormat="NDF">
                    <spine>${spineClips}</spine>
                </sequence>
            </project>
        </event>
    </library>
</fcpxml>`;
}

/**
 * Generates Adobe Premiere Pro compatible XML (Final Cut Pro 7 XML standard).
 */
export function generatePremiereXml(file: ProcessedFile, fps: number = 30): string {
  const keptSegments = file.segments.filter((s) => s.keep);
  const totalFrames = Math.round(file.newDuration * fps);
  
  const roundedFps = Math.round(fps);
  const isNtsc = roundedFps !== fps;

  let trackClips = '';
  let currentIn = 0;

  keptSegments.forEach((seg, idx) => {
    const inFrame = Math.round(seg.start * fps);
    const outFrame = Math.round(seg.end * fps);
    const durationFrames = Math.round(seg.duration * fps);
    const trackStart = currentIn;
    const trackEnd = currentIn + durationFrames;

    trackClips += `
            <clipitem id="clipitem-${idx}">
                <name>${file.name} [Cut ${idx + 1}]</name>
                <duration>${Math.round(file.originalDuration * fps)}</duration>
                <rate>
                    <timebase>${roundedFps}</timebase>
                    <ntsc>${isNtsc ? 'TRUE' : 'FALSE'}</ntsc>
                </rate>
                <start>${trackStart}</start>
                <end>${trackEnd}</end>
                <in>${inFrame}</in>
                <out>${outFrame}</out>
                <file id="file-1">
                    <name>${file.name}</name>
                    <pathurl>${file.name}</pathurl>
                    <rate>
                        <timebase>${roundedFps}</timebase>
                    </rate>
                    <duration>${Math.round(file.originalDuration * fps)}</duration>
                </file>
            </clipitem>`;

    currentIn += durationFrames;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
    <sequence id="sequence-1">
        <name>${file.name} - AutoEdit Jumpcut</name>
        <duration>${totalFrames}</duration>
        <rate>
            <timebase>${roundedFps}</timebase>
            <ntsc>${isNtsc ? 'TRUE' : 'FALSE'}</ntsc>
        </rate>
        <media>
            <video>
                <format>
                    <samplecharacteristics>
                        <width>1920</width>
                        <height>1080</height>
                        <rate>
                            <timebase>${roundedFps}</timebase>
                        </rate>
                    </samplecharacteristics>
                </format>
                <track>${trackClips}</track>
            </video>
            <audio>
                <track>${trackClips}</track>
            </audio>
        </media>
    </sequence>
</xmeml>`;
}

/**
 * Generates standard CMX 3600 EDL for DaVinci Resolve or Avid.
 */
export function generateEdl(file: ProcessedFile, fps: number = 30): string {
  const keptSegments = file.segments.filter((s) => s.keep);
  let edlText = `TITLE: ${file.name.replace(/\.[^/.]+$/, '')}_AUTOEDIT\nFCM: NON-DROP FRAME\n\n`;

  let recordStart = 0;

  keptSegments.forEach((seg, idx) => {
    const editNum = String(idx + 1).padStart(3, '0');
    const sourceIn = formatTimecode(seg.start, fps);
    const sourceOut = formatTimecode(seg.end, fps);
    const recordIn = formatTimecode(recordStart, fps);
    const recordOut = formatTimecode(recordStart + seg.duration, fps);

    edlText += `${editNum}  AX       V     C        ${sourceIn} ${sourceOut} ${recordIn} ${recordOut}\n`;
    edlText += `* FROM CLIP NAME: ${file.name}\n\n`;

    recordStart += seg.duration;
  });

  return edlText;
}

/**
 * Generates JSON cut list format.
 */
export function generateJsonCutList(file: ProcessedFile): string {
  const data = {
    file: file.name,
    originalDuration: file.originalDuration,
    newDuration: file.newDuration,
    timeSavedSeconds: file.originalDuration - file.newDuration,
    timeSavedPercentage: file.timeSavedPercentage,
    cutsCount: file.cutsCount,
    keptIntervals: file.segments
      .filter((s) => s.keep)
      .map((s) => ({
        start: Number(s.start.toFixed(3)),
        end: Number(s.end.toFixed(3)),
        duration: Number(s.duration.toFixed(3)),
      })),
    cutSilenceIntervals: file.segments
      .filter((s) => !s.keep)
      .map((s) => ({
        start: Number(s.start.toFixed(3)),
        end: Number(s.end.toFixed(3)),
        duration: Number(s.duration.toFixed(3)),
        avgDb: s.avgDb,
      })),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Triggers browser download for any text or blob file.
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string = 'text/plain') {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ExportProgress {
  percent: number; 
  currentStep: string;
  timeRemainingSec?: number;
}

export async function renderAndExportCutVideo(
  file: ProcessedFile,
  options: VideoExportOptions,
  onProgress?: (p: ExportProgress) => void
): Promise<void> {
  const keptSegments = file.segments.filter((s) => s.keep);
  if (keptSegments.length === 0) {
    throw new Error('No kept segments to export.');
  }

  onProgress?.({ percent: 5, currentStep: 'Initializing hardware encoder & canvas pipeline...' });

  const video = document.createElement('video');
  video.src = file.url;
  video.muted = false;
  video.crossOrigin = 'anonymous';
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video metadata for export'));
  });

  const { width: targetWidth, height: targetHeight } = resolveResolutionDimensions(
    options.resolution,
    video.videoWidth || 1920,
    video.videoHeight || 1080
  );

  const targetFps = options.frameRate === 'source' ? 30 : options.frameRate;
  const videoBitrate = Math.round(options.bitrateMbps * 1_000_000);
  const audioBitrate = Math.round(options.audioBitrateKbps * 1_000);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: options.audioSampleRate || 48000,
  });

  const sourceNode = audioCtx.createMediaElementSource(video);
  const destNode = audioCtx.createMediaStreamDestination();
  sourceNode.connect(destNode);

  const canvasStream = canvas.captureStream(targetFps);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destNode.stream.getAudioTracks(),
  ]);

  let mimeType = 'video/webm';
  if (options.format === 'mp4') {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.4d401f,mp4a.40.2')) {
      mimeType = 'video/mp4;codecs=avc1.4d401f,mp4a.40.2';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
      mimeType = 'video/webm;codecs=h264,opus';
    } else {
      mimeType = 'video/webm;codecs=vp9,opus';
    }
  } else if (options.format === 'mov') {
    if (MediaRecorder.isTypeSupported('video/quicktime')) {
      mimeType = 'video/quicktime';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else {
      mimeType = 'video/webm';
    }
  } else {
    mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';
  }

  const recorderOptions: MediaRecorderOptions = {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
    videoBitsPerSecond: videoBitrate,
    audioBitsPerSecond: audioBitrate,
  };

  const recorder = new MediaRecorder(combinedStream, recorderOptions);
  const recordedChunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const completionPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const outputMime =
        options.format === 'mp4' ? 'video/mp4'
          : options.format === 'mov' ? 'video/quicktime'
          : 'video/webm';
      resolve(new Blob(recordedChunks, { type: outputMime }));
    };
  });

  recorder.start(100);

  const totalKeptDuration = keptSegments.reduce((sum, s) => sum + s.duration, 0);
  let renderedKeptDuration = 0;

  for (let i = 0; i < keptSegments.length; i++) {
    const seg = keptSegments[i];
    const segDuration = seg.duration;

    onProgress?.({
      percent: Math.min(95, Math.round((renderedKeptDuration / totalKeptDuration) * 90) + 5),
      currentStep: `Rendering speech segment ${i + 1} of ${keptSegments.length} (${segDuration.toFixed(1)}s)...`,
      timeRemainingSec: Math.max(1, Math.round((totalKeptDuration - renderedKeptDuration) * 0.8)),
    });

    video.currentTime = seg.start;
    await new Promise<void>((r) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        r();
      };
      video.addEventListener('seeked', onSeeked);
    });

    await new Promise<void>((resolveSegment) => {
      let isSegDone = false;
      video.play().catch(() => {});

      const checkSegmentProgress = () => {
        if (isSegDone) return;
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        if (video.currentTime >= seg.end || video.paused || video.ended) {
          isSegDone = true;
          video.pause();
          resolveSegment();
        } else {
          requestAnimationFrame(checkSegmentProgress);
        }
      };

      requestAnimationFrame(checkSegmentProgress);
    });

    renderedKeptDuration += segDuration;
  }

  onProgress?.({ percent: 98, currentStep: 'Finalizing container header & muxing media...' });

  recorder.stop();
  const finalBlob = await completionPromise;

  if (audioCtx.state !== 'closed') {
    audioCtx.close().catch(() => {});
  }

  onProgress?.({ percent: 100, currentStep: 'Export complete! Downloading file...' });

  const cleanName = file.name.replace(/\.[^/.]+$/, '');
  const extension = options.format;
  downloadFile(finalBlob, `${cleanName}_Jumpcut_${options.resolution}_${targetFps}fps.${extension}`, finalBlob.type);
}

export async function renderAndExportCutAudio(
  file: ProcessedFile,
  options: AudioExportOptions,
  onProgress?: (p: ExportProgress) => void
): Promise<void> {
  if (!file.audioBuffer) {
    throw new Error('AudioBuffer not available for direct audio rendering');
  }

  onProgress?.({ percent: 10, currentStep: 'Resampling & slicing audio segments...' });

  const keptSegments = file.segments.filter((s) => s.keep);
  if (keptSegments.length === 0) {
    throw new Error('No kept audio segments to export.');
  }

  const srcBuffer = file.audioBuffer;
  const targetSampleRate = options.sampleRate || 48000;
  const numChannels = options.channels === 'mono' ? 1 : Math.min(2, srcBuffer.numberOfChannels);

  const totalKeptDuration = keptSegments.reduce((sum, s) => sum + s.duration, 0);
  const totalOutputSamples = Math.ceil(totalKeptDuration * targetSampleRate);

  const offlineCtx = new OfflineAudioContext(numChannels, totalOutputSamples, targetSampleRate);

  onProgress?.({ percent: 30, currentStep: `Scheduling ${keptSegments.length} speech chunks at ${targetSampleRate / 1000} kHz...` });

  let timelineOffset = 0;
  for (const seg of keptSegments) {
    const sourceNode = offlineCtx.createBufferSource();
    sourceNode.buffer = srcBuffer;
    sourceNode.connect(offlineCtx.destination);
    sourceNode.start(timelineOffset, seg.start, seg.duration);
    timelineOffset += seg.duration;
  }

  onProgress?.({ percent: 60, currentStep: 'Rendering resampled audio buffer...' });
  const renderedBuffer = await offlineCtx.startRendering();

  onProgress?.({ percent: 85, currentStep: `Encoding to ${options.format.toUpperCase()} format...` });

  const cleanName = file.name.replace(/\.[^/.]+$/, '');

  if (options.format === 'wav') {
    const wavBlob = encodeWavBuffer(renderedBuffer, options.bitDepth || 16);
    onProgress?.({ percent: 100, currentStep: 'WAV generation complete! Downloading...' });
    downloadFile(
      wavBlob,
      `${cleanName}_Jumpcut_${targetSampleRate / 1000}kHz_${options.bitDepth}bit.wav`,
      'audio/wav'
    );
  } else {
    const encodedBlob = await encodeCompressedAudio(renderedBuffer, options);
    onProgress?.({ percent: 100, currentStep: `${options.format.toUpperCase()} complete! Downloading...` });
    downloadFile(
      encodedBlob,
      `${cleanName}_Jumpcut_${options.bitrateKbps}kbps.${options.format}`,
      encodedBlob.type
    );
  }
}

function encodeWavBuffer(buffer: AudioBuffer, bitDepth: 16 | 24 = 16): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = bitDepth / 8;
  const numSamples = buffer.length;

  const dataLength = numSamples * numChannels * bytesPerSample;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  if (bitDepth === 16) {
    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
        const val = s < 0 ? s * 0x8000 : s * 0x7fff;
        view.setInt16(offset, val, true);
        offset += 2;
      }
    }
  } else {
    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
        const val = Math.floor(s < 0 ? s * 0x800000 : s * 0x7fffff);
        view.setUint8(offset, val & 0xff);
        view.setUint8(offset + 1, (val >> 8) & 0xff);
        view.setUint8(offset + 2, (val >> 16) & 0xff);
        offset += 3;
      }
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function encodeCompressedAudio(
  buffer: AudioBuffer,
  options: AudioExportOptions
): Promise<Blob> {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: buffer.sampleRate,
  });

  const sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = buffer;
  const destNode = audioCtx.createMediaStreamDestination();
  sourceNode.connect(destNode);

  let mimeType = 'audio/webm;codecs=opus';
  if (options.format === 'mp3') {
    if (MediaRecorder.isTypeSupported('audio/mpeg')) mimeType = 'audio/mpeg';
    else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
    else mimeType = 'audio/webm;codecs=opus';
  } else if (options.format === 'm4a') {
    if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2')) mimeType = 'audio/mp4;codecs=mp4a.40.2';
    else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
    else mimeType = 'audio/webm';
  } else if (options.format === 'ogg') {
    if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) mimeType = 'audio/ogg;codecs=opus';
    else mimeType = 'audio/webm';
  }

  const recorderOptions: MediaRecorderOptions = {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
    audioBitsPerSecond: options.bitrateKbps * 1000,
  };

  const recorder = new MediaRecorder(destNode.stream, recorderOptions);
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const outputMime =
    options.format === 'mp3' ? 'audio/mpeg'
      : options.format === 'm4a' ? 'audio/mp4'
      : options.format === 'ogg' ? 'audio/ogg'
      : 'audio/wav';

  const recordPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: outputMime }));
  });

  recorder.start();
  sourceNode.start();

  await new Promise<void>((resolve) => {
    sourceNode.onended = () => {
      recorder.stop();
      resolve();
    };
  });

  const blob = await recordPromise;
  if (audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
  return blob;
}