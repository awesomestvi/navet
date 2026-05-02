// Shared Kelvin-to-color interpolation for light UI and device-editor controls.
const KELVIN_COLOR_STOPS = [
  { k: 2700, r: 0xff, g: 0xb3, b: 0x66 },
  { k: 4600, r: 0xff, g: 0xf4, b: 0xe6 },
  { k: 6500, r: 0xe6, g: 0xf2, b: 0xff },
] as const;

export function kelvinToColor(temp: number): string {
  const clamped = Math.max(2700, Math.min(6500, temp));

  for (let i = 0; i < KELVIN_COLOR_STOPS.length - 1; i += 1) {
    const start = KELVIN_COLOR_STOPS[i];
    const end = KELVIN_COLOR_STOPS[i + 1];

    if (clamped <= end.k) {
      const progress = (clamped - start.k) / (end.k - start.k);
      const red = Math.round(start.r + (end.r - start.r) * progress);
      const green = Math.round(start.g + (end.g - start.g) * progress);
      const blue = Math.round(start.b + (end.b - start.b) * progress);

      return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
    }
  }

  return '#e6f2ff';
}
