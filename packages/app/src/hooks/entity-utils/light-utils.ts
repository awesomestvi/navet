/**
 * Light attribute parsing utilities
 */

interface LightEntityLike {
  state: string;
  attributes?: Record<string, unknown>;
}

export function brightnessToPercent(entityId: string, entity: LightEntityLike): number {
  const brightnessPct = entity.attributes?.brightness_pct;
  if (typeof brightnessPct === 'number' && !Number.isNaN(brightnessPct)) {
    return Math.max(0, Math.min(100, Math.round(brightnessPct)));
  }

  const brightness = entity.attributes?.brightness;
  if (typeof brightness === 'number' && !Number.isNaN(brightness)) {
    return Math.max(0, Math.min(100, Math.round((brightness / 255) * 100)));
  }

  if (typeof brightnessPct === 'string') {
    const parsedBrightnessPct = Number.parseFloat(brightnessPct);
    if (!Number.isNaN(parsedBrightnessPct)) {
      return Math.max(0, Math.min(100, Math.round(parsedBrightnessPct)));
    }
  }

  if (typeof brightness === 'string') {
    const parsedBrightness = Number.parseFloat(brightness);
    if (!Number.isNaN(parsedBrightness)) {
      return Math.max(0, Math.min(100, Math.round((parsedBrightness / 255) * 100)));
    }
  }

  if (import.meta.env.DEV && entity.state === 'on') {
    console.debug('[Navet] Light missing brightness attributes', {
      entityId,
      attributes: entity.attributes,
    });
  }

  return entity.state === 'on' ? 100 : 0;
}

export function normalizeKelvin(entity: LightEntityLike): number {
  const kelvin = entity.attributes?.color_temp_kelvin;
  if (typeof kelvin === 'number' && !Number.isNaN(kelvin)) return Math.round(kelvin);
  const mired = entity.attributes?.color_temp;
  if (typeof mired === 'number' && mired > 0) return Math.round(1000000 / mired);
  return 4000;
}
