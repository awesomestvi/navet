import type { EffectsQuality } from '@navet/app/stores/settings-store';

let cachedDeviceTier: EffectsQuality | null = null;

/**
 * Estimates the device's rendering tier using hardware signals and a
 * synchronous micro-benchmark. Runs once at store creation time (before
 * the first React render) so the correct quality is applied from the start.
 *
 * Tiers:
 *   low    — RPi-class or very constrained devices (benchmark ≥ 8 ms)
 *   medium — mid-range phones / low-end desktops (benchmark ≥ 2.5 ms)
 *   high   — modern tablets and computers
 */
export function detectDeviceTier(): EffectsQuality {
  if (cachedDeviceTier) {
    return cachedDeviceTier;
  }

  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return 'high';
  }

  const cores = navigator.hardwareConcurrency ?? 4;
  const memoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  // Synchronous micro-benchmark: ~0.2 ms on modern V8, ~8 ms on RPi 4 V8
  const t0 = performance.now();
  let x = 0;
  for (let i = 0; i < 20_000; i++) x += Math.sqrt(i);
  // Prevent dead-code elimination
  if (x < 0) return 'high';
  const benchMs = performance.now() - t0;

  if (benchMs >= 8 || cores <= 2 || (memoryGb !== undefined && memoryGb <= 1)) {
    cachedDeviceTier = 'low';
    return cachedDeviceTier;
  }
  if (benchMs >= 2.5 || (memoryGb !== undefined && memoryGb <= 2)) {
    cachedDeviceTier = 'medium';
    return cachedDeviceTier;
  }
  cachedDeviceTier = 'high';
  return cachedDeviceTier;
}

export function resetDetectedDeviceTierCache() {
  cachedDeviceTier = null;
}
