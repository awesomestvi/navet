import { describe, expect, it } from 'vitest';
import { getMockEnergyOverview } from '../../data/mock-energy-dashboard';
import {
  buildEnergyDashboardModel,
  getEnergyModeSummary,
  normalizeEnergyRange,
  shouldUseStaticEnergyBeams,
} from '../build-energy-dashboard-model';

describe('buildEnergyDashboardModel', () => {
  it('maps legacy ranges to current range ids', () => {
    expect(normalizeEnergyRange('live')).toBe('now');
    expect(normalizeEnergyRange('day')).toBe('today');
    expect(normalizeEnergyRange('week')).toBe('week');
  });

  it('derives export flow when the house is pushing back to the grid', () => {
    const overview = getMockEnergyOverview('today');
    overview.totals.importW = 0;
    overview.totals.exportW = 2600;
    overview.totals.exportTodayKWh = 11.4;

    const dashboard = buildEnergyDashboardModel({
      overview,
      range: 'today',
      trend: overview.trend,
      periodTotals: { today: 22.4, week: 154.1, month: 611.7 },
      sourceConfig: {
        solarPowerEntityId: 'sensor.solar_power',
        gridExportPowerEntityId: 'sensor.grid_export_power',
        gridImportPowerEntityId: 'sensor.grid_import_power',
        devices: [],
      },
    });

    expect(dashboard.flows.some((flow) => flow.id === 'home-grid' && flow.to === 'grid')).toBe(
      true
    );
  });

  it('keeps solar visible as idle when configured but not producing', () => {
    const overview = getMockEnergyOverview('today');
    overview.totals.solarW = 0;
    overview.totals.solarTodayKWh = 0;

    const dashboard = buildEnergyDashboardModel({
      overview,
      range: 'today',
      trend: overview.trend,
      periodTotals: { today: 14.2, week: 102.3, month: 441.2 },
      sourceConfig: {
        solarPowerEntityId: 'sensor.solar_power',
        devices: [],
      },
    });

    expect(dashboard.nodes.find((node) => node.id === 'solar')?.status).toBe('idle');
  });

  it('returns peak mode summary for heavy grid import', () => {
    const overview = getMockEnergyOverview('today');
    overview.totals.importW = 2200;

    const dashboard = buildEnergyDashboardModel({
      overview,
      range: 'today',
      trend: overview.trend,
      periodTotals: { today: 24.8, week: 166.5, month: 707.2 },
      sourceConfig: { gridImportPowerEntityId: 'sensor.grid_import_power', devices: [] },
    });

    expect(dashboard.mode).toBe('peak');
    expect(
      getEnergyModeSummary(dashboard.mode, overview, dashboard.totals.renewableSharePct)
    ).toContain('Grid import');
  });
});

describe('shouldUseStaticEnergyBeams', () => {
  it('uses static beams for reduced motion and low power settings', () => {
    expect(
      shouldUseStaticEnergyBeams({
        disableAnimations: false,
        lowPowerMode: false,
        effectsQuality: 'high',
        prefersReducedMotion: false,
      })
    ).toBe(false);

    expect(
      shouldUseStaticEnergyBeams({
        disableAnimations: false,
        lowPowerMode: true,
        effectsQuality: 'high',
        prefersReducedMotion: false,
      })
    ).toBe(true);
  });
});
