import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectDeviceTier,
  detectDeviceTierWithHighEntropy,
  resetDetectedDeviceTierCache,
} from '../detect-device-tier';

describe('detectDeviceTier', () => {
  const originalHardwareConcurrency = navigator.hardwareConcurrency;
  const originalDeviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const originalPlatform = navigator.platform;
  const originalUserAgent = navigator.userAgent;
  const originalUserAgentData = Object.getOwnPropertyDescriptor(navigator, 'userAgentData');

  beforeEach(() => {
    resetDetectedDeviceTierCache();
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(1);
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      value: 8,
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: 8,
    });
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    });
  });

  afterEach(() => {
    resetDetectedDeviceTierCache();
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      value: originalHardwareConcurrency,
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: originalDeviceMemory,
    });
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: originalPlatform,
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });
    if (originalUserAgentData) {
      Object.defineProperty(navigator, 'userAgentData', originalUserAgentData);
    } else {
      Reflect.deleteProperty(navigator, 'userAgentData');
    }
  });

  it('returns high for fast devices with enough resources', () => {
    expect(detectDeviceTier()).toBe('high');
  });

  it('returns medium when device memory is constrained', () => {
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: 2,
    });

    expect(detectDeviceTier()).toBe('medium');
  });

  it('returns low when CPU cores are very limited', () => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      value: 2,
    });

    expect(detectDeviceTier()).toBe('low');
  });

  it('returns low when the benchmark is slow', () => {
    vi.mocked(performance.now).mockReset();
    vi.mocked(performance.now).mockReturnValueOnce(0).mockReturnValueOnce(10);

    expect(detectDeviceTier()).toBe('low');
  });

  it('returns low for Raspberry Pi-class ARM Linux browsers despite fast CPU signals', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Linux aarch64',
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
    });

    expect(detectDeviceTier()).toBe('low');
  });

  it('uses high-entropy architecture to detect ARM Linux under Chromium UA reduction', async () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Linux x86_64',
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
    });
    Object.defineProperty(navigator, 'userAgentData', {
      configurable: true,
      value: {
        platform: 'Linux',
        getHighEntropyValues: vi.fn().mockResolvedValue({
          architecture: 'arm',
          platform: 'Linux',
        }),
      },
    });

    expect(detectDeviceTier()).toBe('high');
    await expect(detectDeviceTierWithHighEntropy()).resolves.toBe('low');
    expect(detectDeviceTier()).toBe('low');
  });

  it('keeps the synchronous tier when a UA-CH implementation throws', async () => {
    Object.defineProperty(navigator, 'userAgentData', {
      configurable: true,
      value: {
        platform: 'Linux',
        getHighEntropyValues: vi.fn(() => {
          throw new Error('UA-CH unavailable');
        }),
      },
    });

    await expect(detectDeviceTierWithHighEntropy()).resolves.toBe('high');
  });

  it.each(['Linux armv7l', 'Linux armv8l'])(
    'recognizes legacy Raspberry Pi platform token %s',
    (platform) => {
      Object.defineProperty(navigator, 'platform', {
        configurable: true,
        value: platform,
      });
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value: `Mozilla/5.0 (X11; ${platform}) AppleWebKit/537.36 Chrome/140.0.0.0`,
      });

      expect(detectDeviceTier()).toBe('low');
    }
  );

  it('does not classify Android devices as Raspberry Pi-class Linux panels', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Linux armv8l',
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 15; Pixel Tablet) AppleWebKit/537.36 Chrome/140.0.0.0',
    });

    expect(detectDeviceTier()).toBe('high');
  });
});
