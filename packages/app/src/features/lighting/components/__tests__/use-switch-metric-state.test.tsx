import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { renderHookWithProviders } from '@navet/app/test/render';
import type { DeviceMetric } from '@navet/app/types/device.types';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSwitchMetricState } from '../use-switch-metric-state';

const electricalMetrics: DeviceMetric[] = [
  { label: 'Power', value: 0, unit: 'W', icon: 'zap', category: 'measurement' },
  { label: 'Voltage', value: 230, unit: 'V', icon: 'gauge', category: 'measurement' },
  { label: 'Current', value: 0, unit: 'A', icon: 'activity', category: 'measurement' },
  { label: 'Energy', value: 12.45, unit: 'kWh', icon: 'activity', category: 'measurement' },
];

describe('useSwitchMetricState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('automatically adds readings that arrive after loading and after a remount', () => {
    const key = `${STORAGE_KEYS.switchCardMetricPreferences}:homey:socket`;
    const { result, rerender, unmount } = renderHookWithProviders(
      ({ metrics }: { metrics: DeviceMetric[] }) =>
        useSwitchMetricState({ id: 'homey:socket', size: 'small', metrics }),
      { initialProps: { metrics: [] as DeviceMetric[] } }
    );
    expect(result.current.selectedMetrics).toEqual([]);
    expect(localStorage.getItem(key)).toBeNull();
    rerender({ metrics: electricalMetrics.slice(0, 1) });
    expect(result.current.selectedMetricLabels).toEqual(['Power']);
    rerender({ metrics: electricalMetrics });
    expect(result.current.selectedMetricLabels).toEqual(['Power', 'Voltage', 'Current', 'Energy']);
    expect(localStorage.getItem(key)).toBeNull();
    unmount();
    const remounted = renderHookWithProviders(() =>
      useSwitchMetricState({ id: 'homey:socket', size: 'small', metrics: electricalMetrics })
    );
    expect(remounted.result.current.selectedMetrics).toEqual(electricalMetrics);
  });

  it('restores automatic readings from older empty defaults', () => {
    localStorage.setItem(`${STORAGE_KEYS.switchCardMetricPreferences}:openhab:socket`, '[]');
    const { result } = renderHookWithProviders(() =>
      useSwitchMetricState({ id: 'openhab:socket', size: 'small', metrics: electricalMetrics })
    );
    expect(result.current.selectedMetrics).toEqual(electricalMetrics);
  });

  it('keeps removals scoped to their provider and card when the card identity changes', () => {
    const homeyKey = `${STORAGE_KEYS.switchCardMetricPreferences}:homey:socket`;
    const openhabKey = `${STORAGE_KEYS.switchCardMetricPreferences}:openhab:socket`;
    const { result, rerender } = renderHookWithProviders(
      ({ id }: { id: string }) =>
        useSwitchMetricState({ id, size: 'small', metrics: electricalMetrics }),
      { initialProps: { id: 'homey:socket' } }
    );
    act(() => result.current.handleMetricToggle('Power'));
    rerender({ id: 'openhab:socket' });
    expect(result.current.selectedMetrics).toEqual(electricalMetrics);
    expect(localStorage.getItem(openhabKey)).toBeNull();
    act(() => result.current.handleMetricToggle('Energy'));
    expect(JSON.parse(localStorage.getItem(homeyKey)!)).toEqual({
      version: 1,
      hiddenLabels: ['Power'],
    });
    expect(JSON.parse(localStorage.getItem(openhabKey)!)).toEqual({
      version: 1,
      hiddenLabels: ['Energy'],
    });
  });

  it('remembers an explicit removal while other new readings are added automatically', () => {
    const key = `${STORAGE_KEYS.switchCardMetricPreferences}:homey:socket`;
    const { result, rerender, unmount } = renderHookWithProviders(
      ({ metrics }: { metrics: DeviceMetric[] }) =>
        useSwitchMetricState({ id: 'homey:socket', size: 'small', metrics }),
      { initialProps: { metrics: electricalMetrics.slice(0, 2) } }
    );
    act(() => result.current.handleMetricToggle('Power'));
    expect(result.current.selectedMetricLabels).toEqual(['Voltage']);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ version: 1, hiddenLabels: ['Power'] });
    rerender({ metrics: [] });
    expect(result.current.selectedMetrics).toEqual([]);
    rerender({ metrics: electricalMetrics });
    expect(result.current.selectedMetricLabels).toEqual(['Voltage', 'Current', 'Energy']);
    unmount();
    const remounted = renderHookWithProviders(() =>
      useSwitchMetricState({ id: 'homey:socket', size: 'small', metrics: electricalMetrics })
    );
    expect(remounted.result.current.selectedMetricLabels).toEqual(['Voltage', 'Current', 'Energy']);
    act(() => remounted.result.current.handleMetricToggle('Power'));
    expect(remounted.result.current.selectedMetrics).toEqual(electricalMetrics);
  });

  it('keeps every reading removed by the user hidden after a remount', () => {
    const { result, unmount } = renderHookWithProviders(() =>
      useSwitchMetricState({ id: 'homey:socket', size: 'small', metrics: electricalMetrics })
    );
    act(() => {
      for (const metric of electricalMetrics) result.current.handleMetricToggle(metric.label);
    });
    expect(result.current.selectedMetrics).toEqual([]);
    unmount();
    const remounted = renderHookWithProviders(() =>
      useSwitchMetricState({ id: 'homey:socket', size: 'small', metrics: electricalMetrics })
    );
    expect(remounted.result.current.selectedMetrics).toEqual([]);
  });

  it('automatically fits readings to card size without treating overflow as user removals', () => {
    const { result, rerender } = renderHookWithProviders(
      ({ size }: { size: 'tiny' | 'small' }) =>
        useSwitchMetricState({ id: 'homey:socket', size, metrics: electricalMetrics }),
      { initialProps: { size: 'tiny' } }
    );
    expect(result.current.selectedMetricLabels).toEqual(['Power']);
    rerender({ size: 'small' });
    expect(result.current.selectedMetrics).toEqual(electricalMetrics);
    rerender({ size: 'tiny' });
    act(() => result.current.handleMetricToggle('Energy'));
    expect(result.current.selectedMetricLabels).toEqual(['Energy']);
    // Choosing an overflowing reading replaces the last visible reading. Other
    // eligible metrics return automatically when more space is available.
    rerender({ size: 'small' });
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual([
      'Voltage',
      'Current',
      'Energy',
    ]);
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
