import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detectDeviceTier } from '../detect-device-tier';

describe('detectDeviceTier', () => {
  const originalHardwareConcurrency = navigator.hardwareConcurrency;
  const originalDeviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  beforeEach(() => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(1);
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      value: 8,
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: 8,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      value: originalHardwareConcurrency,
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: originalDeviceMemory,
    });
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
});
