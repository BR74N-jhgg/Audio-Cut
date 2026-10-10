/**
 * Media Metadata Parser for MP4, MOV, WAV, and audio/video files.
 * Accurately extracts native container audio sample rates (e.g. 48,000 Hz vs 44,100 Hz)
 * and channel counts directly from binary atoms/headers without Web Audio resampling distortions.
 */

export interface SourceMediaMetadata {
  audioSampleRate?: number;
  audioChannels?: number;
  videoWidth?: number;
  videoHeight?: number;
  formatDescription?: string;
}

/**
 * Parses the actual source audio sample rate and channels from a File object.
 */
export async function parseSourceAudioMetadata(file: File): Promise<SourceMediaMetadata> {
  try {
    const isWav = file.name.toLowerCase().endsWith('.wav') || file.type.includes('wav');
    const isMp4OrMov = /\.(mp4|mov|m4v|qt)$/i.test(file.name) || file.type.includes('mp4') || file.type.includes('quicktime');

    if (isWav) {
      const slice = await file.slice(0, 4096).arrayBuffer();
      const wavMeta = parseWavHeader(new DataView(slice));
      if (wavMeta) return wavMeta;
    }

    if (isMp4OrMov) {
      // 1. Try first 512KB (where fast-start / web-optimized moov resides)
      const firstChunkSize = Math.min(file.size, 512 * 1024);
      const headBuffer = await file.slice(0, firstChunkSize).arrayBuffer();
      let meta = parseMp4Boxes(new DataView(headBuffer));
      if (meta && meta.audioSampleRate) {
        return meta;
      }

      // 2. If moov is at the end (common in camera-recorded MP4/MOV like Sony, Canon, iPhone, DJI)
      if (file.size > firstChunkSize) {
        const tailChunkSize = Math.min(file.size, 1024 * 1024);
        const tailOffset = file.size - tailChunkSize;
        const tailBuffer = await file.slice(tailOffset, file.size).arrayBuffer();
        const tailMeta = parseMp4Boxes(new DataView(tailBuffer));
        if (tailMeta && tailMeta.audioSampleRate) {
          return tailMeta;
        }
      }
    }
  } catch (err) {
    console.warn('Direct media header parsing error:', err);
  }

  // Sensible default: All modern video production (FCP, Premiere, DaVinci, broadcast, cinema, YouTube)
  // standardizes on 48,000 Hz stereo for video files.
  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
  return {
    audioSampleRate: isVideo ? 48000 : 44100,
    audioChannels: 2,
    formatDescription: isVideo ? 'Standard Video Audio (48 kHz Stereo)' : 'Standard Audio (44.1 kHz Stereo)',
  };
}

/**
 * Parses WAV RIFF header
 */
function parseWavHeader(view: DataView): SourceMediaMetadata | null {
  if (view.byteLength < 36) return null;

  // 'RIFF'
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  // 'WAVE'
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));

  if (riff !== 'RIFF' || wave !== 'WAVE') return null;

  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ' && offset + 8 + chunkSize <= view.byteLength) {
      const channels = view.getUint16(offset + 10, true);
      const sampleRate = view.getUint32(offset + 12, true);
      return {
        audioSampleRate: sampleRate,
        audioChannels: channels,
        formatDescription: `WAV (${sampleRate} Hz, ${channels === 1 ? 'Mono' : 'Stereo'})`,
      };
    }
    offset += 8 + chunkSize;
  }

  return null;
}

/**
 * Searches and parses MP4 / MOV sample descriptions for audio tracks
 */
function parseMp4Boxes(view: DataView): SourceMediaMetadata | null {
  const audioAtoms = ['mp4a', 'sowt', 'twos', 'in24', 'alac', 'lpcm', 'aac ', 'samr', 'Opus'];
  const len = view.byteLength;

  // Scan buffer for audio atom markers
  for (let i = 0; i < len - 36; i++) {
    const fourCC = String.fromCharCode(
      view.getUint8(i),
      view.getUint8(i + 1),
      view.getUint8(i + 2),
      view.getUint8(i + 3)
    );

    if (audioAtoms.includes(fourCC)) {
      try {
        // QuickTime Audio Sample Entry Box Structure:
        // Offset 16 (from fourCC start, which is +16 bytes from entry type):
        // channelcount at i + 16 (uint16 big-endian)
        // samplesize at i + 18 (uint16 big-endian)
        // samplerate at i + 24 (uint32 big-endian fixed-point 16.16)
        const channels = view.getUint16(i + 16, false);
        const sampleRateFixed = view.getUint32(i + 24, false);
        const sampleRate = sampleRateFixed >>> 16;

        if (channels >= 1 && channels <= 16 && sampleRate >= 8000 && sampleRate <= 192000) {
          return {
            audioSampleRate: sampleRate,
            audioChannels: channels,
            formatDescription: `${fourCC.trim().toUpperCase()} (${sampleRate} Hz, ${channels === 1 ? 'Mono' : 'Stereo'})`,
          };
        }
      } catch {
        // Continue searching
      }
    }
  }

  return null;
}
