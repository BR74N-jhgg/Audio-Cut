/**
 * Synthesizes realistic audio/video sample footage directly in the browser using Web Audio API
 * and HTML5 Canvas, so users can test silence detection and jumpcutting immediately without uploading.
 */

export interface SampleFootageItem {
  id: string;
  name: string;
  mediaType: 'video' | 'audio';
  duration: number; // seconds
  description: string;
  generate: () => Promise<{ file: File; buffer: AudioBuffer; url: string }>;
}

export const SAMPLE_FOOTAGES: SampleFootageItem[] = [
  {
    id: 'vlog-sample',
    name: 'Vlog_B-Roll_A-Roll_Raw.mp4',
    mediaType: 'video',
    duration: 18,
    description: 'Tech Vlog take with awkward pauses, thinking gaps, and note-checking dead air.',
    generate: () => generateSyntheticMedia('video', 18, 'vlog', 'Tech Vlog Take 1 (Raw)'),
  },
  {
    id: 'course-sample',
    name: 'Lecture_Module3_ReactHooks.mp4',
    mediaType: 'video',
    duration: 24,
    description: 'Coding tutorial with long keyboard typing silences and teacher thinking pauses.',
    generate: () => generateSyntheticMedia('video', 24, 'course', 'Coding Tutorial Lecture'),
  },
  {
    id: 'podcast-sample',
    name: 'Podcast_Ep84_AudioTrack.wav',
    mediaType: 'audio',
    duration: 20,
    description: 'Podcast interview segment with conversational pauses and breath stops.',
    generate: () => generateSyntheticMedia('audio', 20, 'podcast', 'Podcast Studio Mic 1'),
  },
];

/**
 * Generates an AudioBuffer with speech bursts and silences.
 */
function createSpeechPatternAudioBuffer(
  audioCtx: AudioContext,
  duration: number,
  style: 'vlog' | 'course' | 'podcast'
): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  const numSamples = Math.floor(sampleRate * duration);
  const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  // Define speech vs silence time intervals (in seconds)
  let speechIntervals: Array<[number, number]>;

  if (style === 'vlog') {
    // Fast bursts with 2-3s dead silences
    speechIntervals = [
      [0.5, 3.2],
      // silence 3.2 -> 5.5 (2.3s)
      [5.5, 8.8],
      // silence 8.8 -> 12.0 (3.2s)
      [12.0, 14.5],
      // silence 14.5 -> 16.0 (1.5s)
      [16.0, 17.8],
    ];
  } else if (style === 'course') {
    // Explanations with longer typing gaps
    speechIntervals = [
      [0.8, 4.5],
      // silence 4.5 -> 8.0 (3.5s typing gap)
      [8.0, 13.2],
      // silence 13.2 -> 16.5 (3.3s gap)
      [16.5, 20.0],
      // silence 20.0 -> 22.5 (2.5s gap)
      [22.5, 23.6],
    ];
  } else {
    // Podcast conversational rhythm
    speechIntervals = [
      [0.4, 4.0],
      // silence 4.0 -> 6.5 (2.5s pause)
      [6.5, 10.2],
      // silence 10.2 -> 13.0 (2.8s pause)
      [13.0, 16.5],
      // silence 16.5 -> 18.2 (1.7s pause)
      [18.2, 19.6],
    ];
  }

  // Fill buffer with speech-like harmonic modulation in speech intervals, subtle room tone in silence
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // Check if in speech interval
    let isSpeaking = false;
    for (const [start, end] of speechIntervals) {
      if (t >= start && t <= end) {
        isSpeaking = true;
        break;
      }
    }

    if (isSpeaking) {
      // Modulated speech harmonics (fundamental ~140Hz + formants)
      const f0 = 140 + 20 * Math.sin(2 * Math.PI * 1.5 * t);
      const sylMod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4.2 * t); // syllable envelope
      const wave1 = Math.sin(2 * Math.PI * f0 * t);
      const wave2 = 0.5 * Math.sin(2 * Math.PI * f0 * 2.5 * t);
      const wave3 = 0.3 * Math.sin(2 * Math.PI * f0 * 4.8 * t);
      const breath = 0.08 * (Math.random() * 2 - 1);

      channelData[i] = (wave1 + wave2 + wave3 + breath) * sylMod * 0.45;
    } else {
      // Room noise floor ~ -58 dB
      const noise = (Math.random() * 2 - 1) * 0.003;
      channelData[i] = noise;
    }
  }

  return audioBuffer;
}

/**
 * Encodes an AudioBuffer into a WAV Blob.
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const channelData = buffer.getChannelData(0);
  const numSamples = channelData.length;

  const dataLength = numSamples * numChannels * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Generates synthetic video or audio with playable media.
 */
async function generateSyntheticMedia(
  type: 'video' | 'audio',
  duration: number,
  style: 'vlog' | 'course' | 'podcast',
  label: string
): Promise<{ file: File; buffer: AudioBuffer; url: string }> {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 44100,
  });

  const buffer = createSpeechPatternAudioBuffer(audioCtx, duration, style);
  const wavBlob = audioBufferToWav(buffer);

  if (type === 'audio') {
    const file = new File([wavBlob], `${label.replace(/\s+/g, '_')}.wav`, { type: 'audio/wav' });
    const url = URL.createObjectURL(file);
    return { file, buffer, url };
  }

  // For video, generate a clean animated video using Canvas + MediaRecorder
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;

    const canvasStream = canvas.captureStream(24);

    // Create audio source node
    const sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = buffer;
    const destNode = audioCtx.createMediaStreamDestination();
    sourceNode.connect(destNode);

    // Combine canvas video + synthesized audio
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...destNode.stream.getAudioTracks(),
    ]);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recordPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };
    });

    recorder.start();
    sourceNode.start();

    // Render 24 fps animation
    let startTime = performance.now();
    const renderDurationMs = duration * 1000;

    const animInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / renderDurationMs);
      const currentTimeSec = (progress * duration).toFixed(1);

      // Draw modern dark macOS / video interface
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle gradient vignette
      const grad = ctx.createRadialGradient(320, 180, 50, 320, 180, 300);
      grad.addColorStop(0, '#1c1917');
      grad.addColorStop(1, '#09090b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Visual title card
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 320, 130);

      // Subtitle
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Style: ${style.toUpperCase()} • Contains speech bursts & silent pauses`, 320, 165);

      // Animated waveform preview
      ctx.fillStyle = '#ef4444';
      const waveWidth = 400;
      const waveX = (canvas.width - waveWidth) / 2;
      for (let b = 0; b < 40; b++) {
        const barX = waveX + b * 10;
        const barH = 10 + 35 * Math.abs(Math.sin((elapsed / 150) + b * 0.4));
        ctx.fillRect(barX, 220 - barH / 2, 6, barH);
      }

      // Timecode
      ctx.fillStyle = '#71717a';
      ctx.font = '12px monospace';
      ctx.fillText(`${currentTimeSec}s / ${duration}s`, 320, 280);

      if (elapsed >= renderDurationMs) {
        clearInterval(animInterval);
        try {
          sourceNode.stop();
        } catch (e) {}
        recorder.stop();
      }
    }, 1000 / 24);

    const videoBlob = await recordPromise;
    const file = new File([videoBlob], `${label.replace(/\s+/g, '_')}.mp4`, { type: 'video/mp4' });
    const url = URL.createObjectURL(videoBlob);
    return { file, buffer, url };
  } catch (err) {
    // Fallback to audio WAV if video encoding isn't supported in browser environment
    console.warn('Canvas video capture fallback to audio WAV:', err);
    const file = new File([wavBlob], `${label.replace(/\s+/g, '_')}.wav`, { type: 'audio/wav' });
    const url = URL.createObjectURL(file);
    return { file, buffer, url };
  }
}
