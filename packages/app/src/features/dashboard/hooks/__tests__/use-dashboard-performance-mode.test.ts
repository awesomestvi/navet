import type { DeviceWithType } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import {
  countHeavyDashboardDevices,
  resolveDashboardPerformanceProfile,
  resolveDenseDashboardPerformanceMode,
  supportsDashboardOffscreenPaintOptimization,
} from '../use-dashboard-performance-mode';

function createDevice(id: string, type: DeviceWithType['type'] = 'lights'): DeviceWithType {
  return {
    id,
    name: id,
    room: 'Kitchen',
    size: 'small',
    type,
    state: true,
    brightness: 100,
    temp: 3200,
  } as DeviceWithType;
}

describe('useDashboardPerformanceMode helpers', () => {
  it('avoids off-screen paint optimization in Safari', () => {
    expect(
      supportsDashboardOffscreenPaintOptimization(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
      )
    ).toBe(false);
    expect(
      supportsDashboardOffscreenPaintOptimization(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36'
      )
    ).toBe(true);
  });

  it('keeps reduced-effects batching without Safari content visibility', () => {
    expect(
      resolveDashboardPerformanceProfile({
        activeSection: 'home',
        deviceTier: 'low',
        effectsQuality: 'low',
        isEditMode: false,
        lowPowerMode: true,
        supportsOffscreenPaintOptimization: false,
        visibleCardCount: 20,
        visibleDevices: [createDevice('light.kitchen', 'lights')],
      })
    ).toMatchObject({
      batchHeavyCards: true,
      optimizeOffscreenPaint: false,
      progressiveBatchInitialCount: 2,
    });
  });

  it('counts only heavy dashboard device types', () => {
    expect(
      countHeavyDashboardDevices([
        createDevice('light.kitchen', 'lights'),
        createDevice('camera.door', 'cameras'),
        createDevice('sensor.temp', 'sensors'),
      ])
    ).toBe(2);
  });

  it('forces dense performance mode when low-power rendering is already enabled', () => {
    expect(
      resolveDenseDashboardPerformanceMode({
        activeSection: 'home',
        deviceTier: 'high',
        effectsQuality: 'high',
        isEditMode: false,
        lowPowerMode: true,
        visibleCardCount: 2,
        visibleDevices: [createDevice('light.kitchen', 'lights')],
      })
    ).toBe(true);
  });

  it('resolves effective low quality when low-power mode overrides a high requested quality', () => {
    expect(
      resolveDashboardPerformanceProfile({
        activeSection: 'home',
        deviceTier: 'high',
        effectsQuality: 'high',
        isEditMode: false,
        lowPowerMode: true,
        visibleCardCount: 2,
        visibleDevices: [createDevice('light.kitchen', 'lights')],
      })
    ).toMatchObject({
      requestedEffectsQuality: 'high',
      resolvedEffectsQuality: 'low',
      effectiveEffectsQuality: 'low',
      reducePolling: true,
      allowBackdropBlur: false,
      optimizeOffscreenPaint: true,
      progressiveBatchInitialCount: 2,
      progressiveBatchSize: 2,
    });
  });

  it('resolves effective low quality when reduced effects are forced without low-power mode', () => {
    expect(
      resolveDashboardPerformanceProfile({
        activeSection: 'home',
        deviceTier: 'high',
        effectsQuality: 'high',
        isEditMode: false,
        lowPowerMode: false,
        reducedEffectsEnabled: true,
        visibleCardCount: 2,
        visibleDevices: [createDevice('light.kitchen', 'lights')],
      })
    ).toMatchObject({
      requestedEffectsQuality: 'high',
      resolvedEffectsQuality: 'low',
      effectiveEffectsQuality: 'low',
      reducePolling: true,
      allowBackdropBlur: false,
    });
  });

  it('enables dense performance mode for heavy card-dense pages', () => {
    expect(
      resolveDenseDashboardPerformanceMode({
        activeSection: 'lights',
        deviceTier: 'medium',
        effectsQuality: 'high',
        isEditMode: false,
        lowPowerMode: false,
        visibleCardCount: 12,
        visibleDevices: Array.from({ length: 6 }, (_, index) =>
          createDevice(`light.${index}`, 'lights')
        ),
      })
    ).toBe(true);
  });

  it('keeps dense performance mode off on high-tier hardware with full effects', () => {
    expect(
      resolveDenseDashboardPerformanceMode({
        activeSection: 'lights',
        deviceTier: 'high',
        effectsQuality: 'high',
        isEditMode: false,
        lowPowerMode: false,
        visibleCardCount: 20,
        visibleDevices: Array.from({ length: 12 }, (_, index) =>
          createDevice(`light.${index}`, 'lights')
        ),
      })
    ).toBe(false);
  });

  it('keeps edit mode out of dense performance mode', () => {
    expect(
      resolveDashboardPerformanceProfile({
        activeSection: 'lights',
        deviceTier: 'low',
        effectsQuality: 'low',
        isEditMode: true,
        lowPowerMode: true,
        visibleCardCount: 30,
        visibleDevices: Array.from({ length: 12 }, (_, index) =>
          createDevice(`light.${index}`, 'lights')
        ),
      })
    ).toMatchObject({
      densePerformanceMode: false,
      optimizeOffscreenPaint: false,
    });
  });

  it('keeps premium visual features on high-tier hardware with full effects', () => {
    expect(
      resolveDashboardPerformanceProfile({
        activeSection: 'home',
        deviceTier: 'high',
        effectsQuality: 'high',
        isEditMode: false,
        lowPowerMode: false,
        visibleCardCount: 6,
        visibleDevices: [createDevice('light.kitchen', 'lights')],
      })
    ).toMatchObject({
      effectiveEffectsQuality: 'high',
      allowAmbientBleed: true,
      allowBackdropBlur: true,
      allowAnimatedGradients: true,
      densePerformanceMode: false,
    });
  });

  it('pushes medium-tier dashboards into reduced batching and paint policy', () => {
    expect(
      resolveDashboardPerformanceProfile({
        activeSection: 'lights',
        deviceTier: 'medium',
        effectsQuality: 'medium',
        isEditMode: false,
        lowPowerMode: false,
        visibleCardCount: 12,
        visibleDevices: Array.from({ length: 8 }, (_, index) =>
          createDevice(`light.${index}`, 'lights')
        ),
      })
    ).toMatchObject({
      effectiveEffectsQuality: 'low',
      optimizeOffscreenPaint: true,
      batchHeavyCards: true,
      reducePolling: true,
      densePerformanceModeReason: 'card-density',
    });
  });
});
