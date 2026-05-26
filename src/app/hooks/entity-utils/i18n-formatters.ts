/**
 * i18n-dependent entity formatters
 */

import type { TranslationKey } from '@/app/i18n/index';

type TFunc = (key: TranslationKey, values?: Record<string, string | number>) => string;

export function formatEntityType(deviceClass: unknown, fallback: string, t: TFunc): string {
  if (typeof deviceClass === 'string' && deviceClass.trim()) {
    const normalized = deviceClass.trim().toLowerCase();
    if (normalized === 'outlet') return t('lighting.type.outlet');
    if (normalized === 'switch') return t('lighting.type.switch');
    return deviceClass
      .trim()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return fallback;
}

export function formatMediaEntityType(deviceClass: unknown, t: TFunc): string {
  if (typeof deviceClass !== 'string' || !deviceClass.trim()) return t('media.type.player');
  const normalized = deviceClass.trim().toLowerCase();
  switch (normalized) {
    case 'tv':
    case 'television':
      return t('media.type.tv');
    case 'speaker':
      return t('media.type.speaker');
    case 'receiver':
      return t('media.type.receiver');
    case 'set_top_box':
      return t('media.type.setTopBox');
    case 'streaming_box':
      return t('media.type.streamingBox');
    case 'soundbar':
      return t('media.type.soundbar');
    default:
      return deviceClass
        .trim()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

export function helperLabelForDomain(domain: string, t: TFunc): string {
  switch (domain) {
    case 'script':
      return t('deviceType.script');
    case 'input_boolean':
      return t('deviceType.helper');
    case 'input_number':
    case 'input_select':
    case 'input_text':
    case 'input_datetime':
    case 'button':
    case 'input_button':
      return t('deviceType.helper');
    default:
      return t('deviceType.sensor');
  }
}
