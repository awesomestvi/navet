import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { renderHookWithProviders } from '@navet/app/test/render';
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

  it('recovers from stale stored metric labels when live switch metrics are available', async () => {
    localStorage.setItem(
      `${STORAGE_KEYS.switchCardMetricPreferences}:switch.espresso_machine`,
      JSON.stringify(['Current draw', 'Daily usage'])
    );

    const { result } = renderHookWithProviders(() =>
      useSwitchMetricState({
        id: 'switch.espresso_machine',
        size: 'small',
        power: 1140,
        energy: 2.6,
      })
    );

    await waitFor(() => expect(result.current.selectedMetricLabels).toEqual(['Power', 'Energy']));
    expect(result.current.selectedMetrics.map((metric) => metric.label)).toEqual([
      'Power',
      'Energy',
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
