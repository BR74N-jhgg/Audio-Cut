import { ProcessingSettings, PresetType } from '../types';

export interface PresetConfig {
  id: PresetType;
  title: string;
  subtitle: string;
  description: string;
  settings: ProcessingSettings;
}

export const PRESET_CONFIGS: Record<PresetType, PresetConfig> = {
  vlog: {
    id: 'vlog',
    title: 'Vlog',
    subtitle: 'Fast-paced, dynamic cuts',
    description: 'Aggressive cuts for punchy, high-energy YouTube and TikTok vlogs. Trims micro-pauses.',
    settings: {
      preset: 'vlog',
      thresholdDb: -32,
      sensitivityMode: 'auto',
      sensitivityLevel: 'aggressive',
      padBefore: 0.12,
      padAfter: 0.12,
      minSilenceDuration: 0.35,
      minSpeechDuration: 0.18,
      whiteCutsOut: 'all',
    },
  },
  youtube: {
    id: 'youtube',
    title: 'YouTube',
    subtitle: 'Standard engaging cadence',
    description: 'Balanced silence reduction. Keeps natural breathing while eliminating awkward hesitations.',
    settings: {
      preset: 'youtube',
      thresholdDb: -35,
      sensitivityMode: 'auto',
      sensitivityLevel: 'moderate',
      padBefore: 0.18,
      padAfter: 0.18,
      minSilenceDuration: 0.45,
      minSpeechDuration: 0.22,
      whiteCutsOut: 'all',
    },
  },
  course: {
    id: 'course',
    title: 'Course',
    subtitle: 'Clear, lecture-style pacing',
    description: 'Polished educational pacing. Leaves brief thought pauses so students can absorb concepts.',
    settings: {
      preset: 'course',
      thresholdDb: -38,
      sensitivityMode: 'auto',
      sensitivityLevel: 'conservative',
      padBefore: 0.22,
      padAfter: 0.22,
      minSilenceDuration: 0.55,
      minSpeechDuration: 0.25,
      whiteCutsOut: 'all',
    },
  },
  podcast: {
    id: 'podcast',
    title: 'Podcast',
    subtitle: 'Natural conversational flow',
    description: 'Gentle editing designed for multi-speaker or long-form dialogue without choppy artifacts.',
    settings: {
      preset: 'podcast',
      thresholdDb: -40,
      sensitivityMode: 'auto',
      sensitivityLevel: 'conservative',
      padBefore: 0.28,
      padAfter: 0.28,
      minSilenceDuration: 0.70,
      minSpeechDuration: 0.30,
      whiteCutsOut: 'inbetween',
    },
  },
  custom: {
    id: 'custom',
    title: 'Custom',
    subtitle: 'User fine-tuned configuration',
    description: 'Full manual control over decibel thresholds, speech pads, and silence filters.',
    settings: {
      preset: 'custom',
      thresholdDb: -35,
      sensitivityMode: 'manual',
      sensitivityLevel: 'moderate',
      padBefore: 0.15,
      padAfter: 0.15,
      minSilenceDuration: 0.40,
      minSpeechDuration: 0.20,
      whiteCutsOut: 'all',
    },
  },
};

export const DEFAULT_SETTINGS: ProcessingSettings = { ...PRESET_CONFIGS.vlog.settings };
