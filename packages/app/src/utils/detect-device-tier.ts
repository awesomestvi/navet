import type { EffectsQuality } from '@navet/app/stores/settings-store';

let cachedDeviceTier: EffectsQuality | null = null;
let highEntropyDeviceTierPromise: Promise<EffectsQuality> | null = null;

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    platform?: string;
    getHighEntropyValues?: (
      hints: string[]
    ) => Promise<{ architecture?: string; platform?: string }>;
  };
};

function isArmLinuxIdentity(identity: string) {
  return (
    /\blinux\b/i.test(identity) &&
    /\b(?:aarch64|arm64|armv\d+l?|arm)\b/i.test(identity) &&
    !/\bandroid\b/i.test(identity)
  );
}

function isArmLinuxBrowser() {
  const navigatorWithUserAgentData = navigator as NavigatorWithUserAgentData;
  const identity = [
    navigatorWithUserAgentData.userAgentData?.platform,
    navigator.platform,
    navigator.userAgent,
  ]
    .filter(Boolean)
    .join(' ');

  return isArmLinuxIdentity(identity);
}

/**
 * Estimates the device's rendering tier synchronously using platform, hardware, and CPU signals.
 * The settings store uses this baseline immediately; `detectDeviceTierWithHighEntropy` refines it
 * before the first app render when Chromium has reduced the visible architecture.
 *
 * Tiers:
 *   low    — ARM Linux wall panels / RPi-class or very constrained devices
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

  // Raspberry Pi 5 has enough CPU cores and memory to look like a high-end device to generic
  // heuristics, while Chromium's compositor still struggles with Navet's stacked backdrop
  // filters. ARM Linux is therefore a rendering constraint, not a CPU benchmark result. Users can
  // still opt back into richer effects from Appearance settings.
  if (isArmLinuxBrowser()) {
    cachedDeviceTier = 'low';
    return cachedDeviceTier;
  }

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

/**
 * Refines the synchronous result with Chromium's high-entropy architecture hint. Modern Chromium
 * reduces desktop Linux user-agent surfaces to x86_64 even on ARM, so Raspberry Pi detection
 * cannot rely on `navigator.platform` alone.
 */
export function detectDeviceTierWithHighEntropy(): Promise<EffectsQuality> {
  const synchronousTier = detectDeviceTier();
  if (synchronousTier === 'low' || typeof navigator === 'undefined') {
    return Promise.resolve(synchronousTier);
  }

  const userAgentData = (navigator as NavigatorWithUserAgentData).userAgentData;
  if (typeof userAgentData?.getHighEntropyValues !== 'function') {
    return Promise.resolve(synchronousTier);
  }

  highEntropyDeviceTierPromise ??= Promise.resolve()
    .then(() => userAgentData.getHighEntropyValues?.(['architecture', 'platform']))
    .then((values) => {
      if (!values) {
        return synchronousTier;
      }
      const identity = [
        values.platform,
        userAgentData.platform,
        values.architecture,
        navigator.userAgent,
      ]
        .filter(Boolean)
        .join(' ');
      if (isArmLinuxIdentity(identity)) {
        cachedDeviceTier = 'low';
      }
      return cachedDeviceTier ?? synchronousTier;
    })
    .catch(() => synchronousTier);

  return highEntropyDeviceTierPromise;
}

export function resetDetectedDeviceTierCache() {
  cachedDeviceTier = null;
  highEntropyDeviceTierPromise = null;
}
