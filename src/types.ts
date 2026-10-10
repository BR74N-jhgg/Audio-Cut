export type PresetType = 'vlog' | 'youtube' | 'course' | 'podcast' | 'custom';

export type SensitivityMode = 'auto' | 'manual';
export type SensitivityLevel = 'conservative' | 'moderate' | 'aggressive';
export type WhiteCutsOutMode = 'all' | 'inbetween' | 'off';

export interface ProcessingSettings {
  preset: PresetType;
  thresholdDb: number; // e.g. -35 dB
  sensitivityMode: SensitivityMode;
  sensitivityLevel: SensitivityLevel;
  padBefore: number; // seconds, e.g. 0.15
  padAfter: number; // seconds, e.g. 0.15
  minSilenceDuration: number; // seconds, e.g. 0.40
  minSpeechDuration: number; // seconds, e.g. 0.20
  whiteCutsOut: WhiteCutsOutMode;
}

export interface AudioSegment {
  id: string;
  start: number; // seconds
  end: number; // seconds
  duration: number; // seconds
  isSilent: boolean;
  keep: boolean; // true = keep, false = cut out
  avgDb: number;
  peakDb: number;
}

export interface ProcessedFile {
  id: string;
  name: string;
  file: File | null;
  url: string;
  mediaType: 'video' | 'audio';
  sizeFormatted: string;
  originalDuration: number;
  newDuration: number;
  timeSavedPercentage: number;
  cutsCount: number;
  status: 'idle' | 'analyzing' | 'done' | 'error';
  progress: number;
  errorMessage?: string;
  waveformPeaks: number[]; // normalized 0..1
  segments: AudioSegment[];
  audioBuffer?: AudioBuffer;
  videoWidth?: number;
  videoHeight?: number;
  audioChannels?: number;
  audioSampleRate?: number;
  originalFilePath?: string;
}

export type ThemeMode = 'dark' | 'light';

export type VideoFormat = 'mp4' | 'mov' | 'webm';
export type AudioFormat = 'wav' | 'mp3' | 'm4a' | 'ogg';

export type VideoResolutionPreset = 'source' | '4k' | '1440p' | '1080p' | '720p' | 'vertical_1080p' | '540p';
export type VideoFrameRate = 'source' | 60 | 59.94 | 50 | 30 | 29.97 | 25 | 24 | 23.976;

export interface VideoExportOptions {
  format: VideoFormat;
  resolution: VideoResolutionPreset;
  customWidth?: number;
  customHeight?: number;
  frameRate: VideoFrameRate;
  bitrateMbps: number; // e.g. 10 Mbps
  audioSampleRate: number; // e.g. 48000 Hz
  audioBitrateKbps: number; // e.g. 256 kbps
}

export interface AudioExportOptions {
  format: AudioFormat;
  sampleRate: number; // 48000, 44100, 96000, 32000
  bitrateKbps: number; // 320, 256, 192, 128, 96
  bitDepth: 16 | 24; // for WAV
  channels: 'stereo' | 'mono';
}
