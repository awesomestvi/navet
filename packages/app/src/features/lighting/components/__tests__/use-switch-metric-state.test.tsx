import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { renderHookWithProviders } from '@navet/app/test/render';
import type { DeviceMetric } from '@navet/app/types/device.types';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSwitchMetricState } from '../use-switch-metric-state';

describe('useSwitchMetricState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('preserves explicit metric selections while the switch is off and restores them when it turns back on', async () => {
    localStorage.setItem(
      `${STORAGE_KEYS.switchCardMetricPreferences}:switch.espresso_machine`,
      JSON.stringify(['Power'])
    );

    const { result, rerender } = renderHookWithProviders(() =>
      useSwitchMetricState({
        id: 'switch.espresso_machine',
        size: 'small',
        power: 1140,
        voltage: 230,
        energy: 2.6,
      })
    );

    await waitFor(() => expect(result.current.selectedMetricLabels).toEqual(['Power']));
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual(['Power']);

    rerender();

    await waitFor(() => expect(result.current.selectedMetricLabels).toEqual(['Power']));
    expect(result.current.availableMetrics.map((metric) => metric.label)).toEqual([
      'Power',
      'Voltage',
      'Energy',
    ]);
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual(['Power']);

    rerender();

    await waitFor(() => expect(result.current.selectedMetricLabels).toEqual(['Power']));
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual(['Power']);
  });

  it('preserves an explicit metric selection when that metric temporarily disappears', async () => {
    localStorage.setItem(
      `${STORAGE_KEYS.switchCardMetricPreferences}:switch.espresso_machine`,
      JSON.stringify(['Current'])
    );

    const currentMetric = {
      label: 'Current',
      value: 0.43,
      unit: 'A',
      icon: 'activity' as const,
      category: 'measurement' as const,
    };
    const powerMetric = {
      label: 'Power',
      value: 1140,
      unit: 'W',
      icon: 'zap' as const,
      category: 'measurement' as const,
    };
    const energyMetric = {
      label: 'Energy',
      value: 2.6,
      unit: 'kWh',
      icon: 'activity' as const,
      category: 'measurement' as const,
    };

    const { result, rerender } = renderHookWithProviders(
      ({ metrics }: { metrics: DeviceMetric[] }) =>
        useSwitchMetricState({
          id: 'switch.espresso_machine',
          size: 'small',
          metrics,
        }),
      {
        initialProps: {
          metrics: [currentMetric, powerMetric, energyMetric],
        },
      }
    );

    await waitFor(() => expect(result.current.selectedMetricLabels).toEqual(['Current']));
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual(['Current']);

    rerender({ metrics: [powerMetric, energyMetric] });

    await waitFor(() => expect(result.current.selectedMetricLabels).toEqual(['Current']));
    expect(result.current.selectedMetrics).toEqual([]);
    expect(
      localStorage.getItem(`${STORAGE_KEYS.switchCardMetricPreferences}:switch.espresso_machine`)
    ).toBe(JSON.stringify(['Current']));

    rerender({ metrics: [currentMetric, powerMetric, energyMetric] });

    await waitFor(() => expect(result.current.selectedMetricLabels).toEqual(['Current']));
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual(['Current']);
  });

  it('preserves mixed explicit metric selections when one metric temporarily disappears', async () => {
    localStorage.setItem(
      `${STORAGE_KEYS.switchCardMetricPreferences}:switch.espresso_machine`,
      JSON.stringify(['Power', 'Current'])
    );

    const currentMetric = {
      label: 'Current',
      value: 0.43,
      unit: 'A',
      icon: 'activity' as const,
      category: 'measurement' as const,
    };
    const powerMetric = {
      label: 'Power',
      value: 1140,
      unit: 'W',
      icon: 'zap' as const,
      category: 'measurement' as const,
    };
    const energyMetric = {
      label: 'Energy',
      value: 2.6,
      unit: 'kWh',
      icon: 'activity' as const,
      category: 'measurement' as const,
    };

    const { result, rerender } = renderHookWithProviders(
      ({ metrics }: { metrics: DeviceMetric[] }) =>
        useSwitchMetricState({
          id: 'switch.espresso_machine',
          size: 'small',
          metrics,
        }),
      {
        initialProps: {
          metrics: [powerMetric, currentMetric, energyMetric],
        },
      }
    );

    await waitFor(() => expect(result.current.selectedMetricLabels).toEqual(['Power', 'Current']));
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual([
      'Power',
      'Current',
    ]);

    rerender({ metrics: [powerMetric, energyMetric] });

    await waitFor(() => expect(result.current.selectedMetricLabels).toEqual(['Power', 'Current']));
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual(['Power']);

    rerender({ metrics: [powerMetric, currentMetric, energyMetric] });

    await waitFor(() => expect(result.current.selectedMetricLabels).toEqual(['Power', 'Current']));
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual([
      'Power',
      'Current',
    ]);
  });

  it('defaults to visible measurement metrics even while the switch is off', async () => {
    const { result } = renderHookWithProviders(() =>
      useSwitchMetricState({
        id: 'switch.espresso_machine',
        size: 'small',
        power: 0,
        voltage: 230,
        energy: 2.6,
      })
    );

    await waitFor(() =>
      expect(result.current.selectedMetricLabels).toEqual(['Power', 'Voltage', 'Energy'])
    );
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual([
      'Power',
      'Voltage',
      'Energy',
    ]);
  });

  it('preserves a larger explicit metric selection across temporary resize to tiny', async () => {
    localStorage.setItem(
      `${STORAGE_KEYS.switchCardMetricPreferences}:switch.espresso_machine`,
      JSON.stringify(['Power', 'Voltage', 'Energy', 'Current'])
    );

    const metrics = [
      {
        label: 'Power',
        value: 1140,
        unit: 'W',
        icon: 'zap' as const,
        category: 'measurement' as const,
      },
      {
        label: 'Voltage',
        value: 230,
        unit: 'V',
        icon: 'gauge' as const,
        category: 'measurement' as const,
      },
      {
        label: 'Energy',
        value: 2.6,
        unit: 'kWh',
        icon: 'activity' as const,
        category: 'measurement' as const,
      },
      {
        label: 'Current',
        value: 0.43,
        unit: 'A',
        icon: 'activity' as const,
        category: 'measurement' as const,
      },
    ];

    const { result, rerender } = renderHookWithProviders(
      ({ size }: { size: 'tiny' | 'small' }) =>
        useSwitchMetricState({
          id: 'switch.espresso_machine',
          size,
          metrics,
        }),
      {
        initialProps: { size: 'small' },
      }
    );

    await waitFor(() =>
      expect(result.current.selectedMetricLabels).toEqual(['Power', 'Voltage', 'Energy', 'Current'])
    );
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual([
      'Power',
      'Voltage',
      'Energy',
      'Current',
    ]);

    rerender({ size: 'tiny' });

    await waitFor(() =>
      expect(result.current.selectedMetricLabels).toEqual(['Power', 'Voltage', 'Energy', 'Current'])
    );
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual(['Power']);

    rerender({ size: 'small' });

    await waitFor(() =>
      expect(result.current.selectedMetricLabels).toEqual(['Power', 'Voltage', 'Energy', 'Current'])
    );
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual([
      'Power',
      'Voltage',
      'Energy',
      'Current',
    ]);
  });
});
