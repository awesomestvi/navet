import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { fanEntityFactory } from '@/test/fixtures/home-assistant/entities/fan';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { FanCard } from '..';

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    callService: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

vi.mock('@/app/services/integration-action.service', () => ({
  dispatchEntityCommand: async ({
    type,
    entityId,
    percentage,
  }: {
    type: 'turn_on' | 'turn_off' | 'set_fan_speed';
    entityId: string;
    percentage?: number;
  }) => {
    const domain = entityId.split('.', 1)[0] || 'fan';
    if (type === 'set_fan_speed') {
      await serviceMock.callService(
        'fan',
        'set_percentage',
        { percentage },
        { entity_id: entityId }
      );
    } else {
      await serviceMock.callService(domain, type, {}, { entity_id: entityId });
    }
    return {
      accepted: true,
      requiresEventConfirmation: true,
    };
  },
}));

function createFanEntity(percentage: number, state = 'on') {
  const entity = fanEntityFactory({
    friendly_name: 'Ceiling Fan',
    percentage,
  });
  entity.entity_id = 'fan.ceiling_fan';
  entity.state = state;
  return entity;
}

describe('FanCard', () => {
  beforeEach(async () => {
    await resetAppStores();
    vi.clearAllMocks();
  });

  it('uses card click for power and exposes a shared slider plus preset speed buttons', () => {
    homeAssistantStore.setState({
      entities: {
        'fan.ceiling_fan': createFanEntity(66),
      },
    });

    renderWithProviders(
      <FanCard
        id="fan.ceiling_fan"
        name="Ceiling Fan"
        room="Bedroom"
        initialState
        initialPercentage={66}
        size="small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Fan Medium' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('slider', { name: 'Fan Speed' })).toHaveAttribute(
      'aria-valuenow',
      '66'
    );
    expect(screen.queryByRole('button', { name: 'Fan Off' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open settings for Ceiling Fan' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fan High' }));
    expect(serviceMock.callService).toHaveBeenCalledWith(
      'fan',
      'set_percentage',
      { percentage: 100 },
      { entity_id: 'fan.ceiling_fan' }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ceiling Fan' }));
    expect(serviceMock.callService).toHaveBeenCalledWith(
      'fan',
      'turn_off',
      {},
      { entity_id: 'fan.ceiling_fan' }
    );
  });
});
