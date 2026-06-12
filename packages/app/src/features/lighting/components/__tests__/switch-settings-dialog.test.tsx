import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SwitchSettingsDialog } from '../switch-settings-dialog';

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    callService: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@navet/app/commands', () => ({
  dispatchEntityCommand: async ({
    type,
    entityId,
  }: {
    type: 'turn_on' | 'turn_off';
    entityId: string;
  }) => {
    const nativeEntityId = entityId.replace(/^[^:]+:/, '');
    const domain = nativeEntityId.includes('.')
      ? nativeEntityId.split('.', 1)[0] || 'switch'
      : 'switch';
    await serviceMock.callService(domain, type, {}, { entity_id: nativeEntityId });
    return {
      accepted: true,
      requiresEventConfirmation: true,
    };
  },
}));

describe('SwitchSettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles sibling controls through the generic command path', () => {
    renderWithProviders(
      <SwitchSettingsDialog
        entityId="switch.kitchen"
        isOpen
        onOpenChange={vi.fn()}
        name="Pax Calima Boost mode"
        entityType="Switch"
        isOn
        metricSectionTitle="Metrics"
        metricSectionDescription="Metrics description"
        metricLimit={2}
        availableMetrics={[]}
        selectedMetricLabels={[]}
        getMetricLabel={(metric) => metric.label}
        onMetricToggle={vi.fn()}
        selectedIcon="ToggleLeft"
        onIconChange={vi.fn()}
        siblingEntities={[
          {
            id: 'switch.coffee',
            entity: {
              entityId: 'switch.coffee',
              state: 'on',
              attributes: {
                friendly_name: 'Pax Calima Power-on behaviour',
              },
              lastChanged: '2026-05-17T00:00:00.000Z',
              lastUpdated: '2026-05-17T00:00:00.000Z',
            },
          },
          {
            id: 'switch.weekend',
            entity: {
              entityId: 'switch.weekend',
              state: 'off',
              attributes: {
                friendly_name: 'Pax Calima TrickleDays Weekends',
              },
              lastChanged: '2026-05-17T00:00:00.000Z',
              lastUpdated: '2026-05-17T00:00:00.000Z',
            },
          },
        ]}
        tintColor=""
        onTintColorChange={vi.fn()}
      />
    );

    expect(screen.getByText('Power-on behaviour')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Power-on behaviour/i }));

    expect(serviceMock.callService).toHaveBeenCalledWith(
      'switch',
      'turn_off',
      {},
      { entity_id: 'switch.coffee' }
    );
  });
});
