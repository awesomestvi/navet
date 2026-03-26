import type { HassEntity } from 'home-assistant-js-websocket';

export function getBrightnessPercent(entity: HassEntity): number {
  const brightnessPct = parseNumberish(entity.attributes?.brightness_pct);
  if (brightnessPct !== null) {
    return clampPercentage(brightnessPct);
  }

  const brightness = parseNumberish(entity.attributes?.brightness);
  if (brightness !== null) {
    if (brightness >= 0 && brightness <= 1) {
      return clampPercentage(brightness * 100);
    }
    return clampPercentage((Math.max(0, Math.min(255, brightness)) / 255) * 100);
  }

  return entity.state === 'on' ? 100 : 0;
}

export function clampPercentage(value: number, min = 0): number {
  return Math.max(min, Math.min(100, Math.round(value)));
}

export function clampKelvin(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, roundKelvin(value)));
}

export function getReportedColorTempKelvin(entity: HassEntity): number | null {
  const kelvin = parseNumberish(entity.attributes?.color_temp_kelvin);
  if (kelvin !== null) {
    return roundKelvin(kelvin);
  }

  const mired = parseNumberish(entity.attributes?.color_temp);
  if (mired !== null && mired > 0) {
    return roundKelvin(1000000 / mired);
  }

  return null;
}

export function getReportedColorHex(entity: HassEntity): string | null {
  const activeColorMode = entity.attributes?.color_mode;
  if (
    typeof activeColorMode === 'string' &&
    !['hs', 'rgb', 'rgbw', 'rgbww', 'xy'].includes(activeColorMode)
  ) {
    return null;
  }

  const rgbColor = entity.attributes?.rgb_color;
  if (
    Array.isArray(rgbColor) &&
    rgbColor.length >= 3 &&
    rgbColor.every((value) => typeof value === 'number' && Number.isFinite(value))
  ) {
    return rgbToHex(rgbColor[0], rgbColor[1], rgbColor[2]);
  }

  const hsColor = entity.attributes?.hs_color;
  if (
    Array.isArray(hsColor) &&
    hsColor.length >= 2 &&
    hsColor.every((value) => typeof value === 'number' && Number.isFinite(value)) &&
    hsColor[1] > 0
  ) {
    return hsToHex(hsColor[0], hsColor[1]);
  }

  const xyColor = entity.attributes?.xy_color;
  if (
    Array.isArray(xyColor) &&
    xyColor.length >= 2 &&
    xyColor.every((value) => typeof value === 'number' && Number.isFinite(value))
  ) {
    const brightnessRaw = parseNumberish(entity.attributes?.brightness);
    const brightnessPctRaw = parseNumberish(entity.attributes?.brightness_pct);
    const brightness =
      brightnessRaw !== null
        ? brightnessRaw <= 1
          ? brightnessRaw * 255
          : brightnessRaw
        : brightnessPctRaw !== null
          ? (brightnessPctRaw / 100) * 255
          : undefined;
    return xyToHex(xyColor[0], xyColor[1], brightness);
  }

  return null;
}

// Absolute Kelvin → hex color using physical anchor points.
// 2700K = warm amber, 4600K = neutral white, 6500K = cool blue-white.
const KELVIN_COLOR_STOPS = [
  { k: 2700, r: 0xff, g: 0xb3, b: 0x66 },
  { k: 4600, r: 0xff, g: 0xf4, b: 0xe6 },
  { k: 6500, r: 0xe6, g: 0xf2, b: 0xff },
] as const;

export function kelvinToColor(temp: number): string {
  const clamped = Math.max(2700, Math.min(6500, temp));
  for (let i = 0; i < KELVIN_COLOR_STOPS.length - 1; i++) {
    const a = KELVIN_COLOR_STOPS[i];
    const b = KELVIN_COLOR_STOPS[i + 1];
    if (clamped <= b.k) {
      const t = (clamped - a.k) / (b.k - a.k);
      const r = Math.round(a.r + (b.r - a.r) * t);
      const g = Math.round(a.g + (b.g - a.g) * t);
      const bl = Math.round(a.b + (b.b - a.b) * t);
      return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    }
  }
  return '#e6f2ff';
}

export function roundKelvin(value: number): number {
  return Math.round(value / 100) * 100;
}

export function supportsColorTemperatureControl(entity?: HassEntity): boolean {
  if (!entity) {
    return true;
  }

  const colorModes = getSupportedColorModes(entity);
  return (
    colorModes.has('color_temp') ||
    typeof entity.attributes?.color_temp_kelvin === 'number' ||
    typeof entity.attributes?.color_temp === 'number'
  );
}

export function supportsColorSelection(entity?: HassEntity): boolean {
  if (!entity) {
    return true;
  }

  const colorModes = getSupportedColorModes(entity);
  return ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'].some((mode) => colorModes.has(mode));
}

export function getSupportedColorTemperatureRange(entity?: HassEntity): {
  min: number;
  max: number;
} {
  if (!entity) {
    return { min: 2700, max: 6500 };
  }

  const minKelvin = parseNumberish(entity.attributes?.min_color_temp_kelvin);
  const maxKelvin = parseNumberish(entity.attributes?.max_color_temp_kelvin);
  if (minKelvin !== null && maxKelvin !== null && minKelvin < maxKelvin) {
    const normalizedMin = Math.ceil(minKelvin / 100) * 100;
    const normalizedMax = Math.floor(maxKelvin / 100) * 100;
    return {
      min: normalizedMin < normalizedMax ? normalizedMin : roundKelvin(minKelvin),
      max: normalizedMin < normalizedMax ? normalizedMax : roundKelvin(maxKelvin),
    };
  }

  const minMired = parseNumberish(entity.attributes?.min_mireds);
  const maxMired = parseNumberish(entity.attributes?.max_mireds);
  if (minMired !== null && maxMired !== null && minMired > 0 && maxMired > 0) {
    const derivedMaxKelvin = Math.round(1000000 / minMired);
    const derivedMinKelvin = Math.round(1000000 / maxMired);
    if (derivedMinKelvin < derivedMaxKelvin) {
      const normalizedMin = Math.ceil(derivedMinKelvin / 100) * 100;
      const normalizedMax = Math.floor(derivedMaxKelvin / 100) * 100;
      return {
        min: normalizedMin < normalizedMax ? normalizedMin : roundKelvin(derivedMinKelvin),
        max: normalizedMin < normalizedMax ? normalizedMax : roundKelvin(derivedMaxKelvin),
      };
    }
  }

  return { min: 2700, max: 6500 };
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

export function rgbToHs(rgb: [number, number, number]): [number, number] {
  const [rRaw, gRaw, bRaw] = rgb;
  const r = Math.max(0, Math.min(255, rRaw)) / 255;
  const g = Math.max(0, Math.min(255, gRaw)) / 255;
  const b = Math.max(0, Math.min(255, bRaw)) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const saturation = max === 0 ? 0 : (delta / max) * 100;
  return [Math.round(hue * 10) / 10, Math.round(saturation * 10) / 10];
}

export function rgbToXy(rgb: [number, number, number]): [number, number] {
  const gammaCorrect = (channel: number) => {
    const normalized = Math.max(0, Math.min(255, channel)) / 255;
    return normalized > 0.04045 ? ((normalized + 0.055) / 1.055) ** 2.4 : normalized / 12.92;
  };
  const r = gammaCorrect(rgb[0]);
  const g = gammaCorrect(rgb[1]);
  const b = gammaCorrect(rgb[2]);
  const X = r * 0.664511 + g * 0.154324 + b * 0.162028;
  const Y = r * 0.283881 + g * 0.668433 + b * 0.047685;
  const Z = r * 0.000088 + g * 0.07231 + b * 0.986039;
  const sum = X + Y + Z;
  if (sum <= 0) return [0.3127, 0.329];
  return [Math.round((X / sum) * 10000) / 10000, Math.round((Y / sum) * 10000) / 10000];
}

function parseNumberish(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

function hsToHex(hue: number, saturation: number): string {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = Math.max(0, Math.min(100, saturation)) / 100;
  const chroma = normalizedSaturation;
  const segment = normalizedHue / 60;
  const second = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = 1 - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = second;
  } else if (segment < 2) {
    red = second;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = second;
  } else if (segment < 4) {
    green = second;
    blue = chroma;
  } else if (segment < 5) {
    red = second;
    blue = chroma;
  } else {
    red = chroma;
    blue = second;
  }

  return rgbToHex((red + match) * 255, (green + match) * 255, (blue + match) * 255);
}

function xyToHex(x: number, y: number, brightness255?: number): string | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || y <= 0) {
    return null;
  }

  const safeX = Math.max(0, Math.min(1, x));
  const safeY = Math.max(0.0001, Math.min(1, y));
  const safeBrightness =
    typeof brightness255 === 'number' && Number.isFinite(brightness255)
      ? Math.max(1, Math.min(255, brightness255))
      : 255;
  const luminance = safeBrightness / 255;

  const X = (luminance / safeY) * safeX;
  const Y = luminance;
  const Z = (luminance / safeY) * (1 - safeX - safeY);

  let red = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
  let green = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
  let blue = X * 0.051713 - Y * 0.121364 + Z * 1.01153;

  red = Math.max(0, red);
  green = Math.max(0, green);
  blue = Math.max(0, blue);

  const maxChannel = Math.max(red, green, blue);
  if (maxChannel > 1) {
    red /= maxChannel;
    green /= maxChannel;
    blue /= maxChannel;
  }

  const gammaCorrect = (value: number) =>
    value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;

  return rgbToHex(gammaCorrect(red) * 255, gammaCorrect(green) * 255, gammaCorrect(blue) * 255);
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((value) =>
      Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

function getSupportedColorModes(entity: HassEntity): Set<string> {
  const modes = entity.attributes?.supported_color_modes;
  if (Array.isArray(modes)) {
    return new Set(modes.filter((mode): mode is string => typeof mode === 'string'));
  }

  const colorMode = entity.attributes?.color_mode;
  if (typeof colorMode === 'string') {
    return new Set([colorMode]);
  }

  return new Set();
}
