import { fireEvent, screen } from '@testing-library/react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { useSettingsStore } from '@/app/stores/settings-store';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { LightCard } from '..';

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    updateLight: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

function createLightEntity(state: 'on' | 'off' = 'on'): HassEntity {
  return {
    entity_id: 'light.desk_lamp',
    state,
    attributes: {
      brightness: 166,
      friendly_name: 'Desk Lamp',
      supported_color_modes: ['brightness'],
    },
    last_changed: '2026-05-25T00:00:00.000Z',
    last_updated: '2026-05-25T00:00:00.000Z',
    context: { id: 'ctx', parent_id: null, user_id: null },
  } as HassEntity;
}

function createEffectLightEntity(effect?: string): HassEntity {
  return {
    entity_id: 'light.desk_lamp',
    state: 'on',
    attributes: {
      brightness: 166,
      friendly_name: 'Desk Lamp',
      supported_color_modes: ['brightness'],
      effect_list: ['Rainbow', 'Fire'],
      effect,
    },
    last_changed: '2026-05-25T00:00:00.000Z',
    last_updated: '2026-05-25T00:00:00.000Z',
    context: { id: 'ctx', parent_id: null, user_id: null },
  } as HassEntity;
}

describe('LightCard', () => {
  beforeEach(async () => {
    await resetAppStores();
    vi.clearAllMocks();
  });

  it('keeps the extra-small icon as a toggle when card taps open controls', () => {
    homeAssistantStore.setState({
      connection: {} as never,
      entities: {
        'light.desk_lamp': createLightEntity('on'),
      },
    });
    useSettingsStore.getState().updateSettings({ entityInteractionMode: 'control-first' });

    renderWithProviders(
      <LightCard
        id="light.desk_lamp"
        name="Desk Lamp"
        room="Office"
        initialState
        initialBrightness={65}
        initialTemp={3000}
        size="extra-small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    const card = screen.getByRole('button', { name: 'Desk Lamp' });
    const toggleButton = screen.getByRole('button', { name: 'Toggle Desk Lamp' });

    fireEvent.click(toggleButton);

    expect(serviceMock.updateLight).toHaveBeenCalledWith('light.desk_lamp', { state: 'off' });
    expect(card).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Controls')).not.toBeInTheDocument();

    fireEvent.click(card);

    expect(serviceMock.updateLight).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Controls')).toBeInTheDocument();
  });

  it('shows the effect picker on medium cards and sends effect selections to Home Assistant', async () => {
    homeAssistantStore.setState({
      connection: {} as never,
      entities: {
        'light.desk_lamp': createEffectLightEntity('Rainbow'),
      },
    });

    renderWithProviders(
      <LightCard
        id="light.desk_lamp"
        name="Desk Lamp"
        room="Office"
        initialState
        initialBrightness={65}
        initialTemp={3000}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Choose light effect' }));
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Fire' }));

    expect(serviceMock.updateLight).toHaveBeenCalledWith('light.desk_lamp', {
      state: 'on',
      effect: 'Fire',
    });
  });

  it('keeps effect selection out of the extra-small quick actions', () => {
    homeAssistantStore.setState({
      connection: {} as never,
      entities: {
        'light.desk_lamp': createEffectLightEntity(),
      },
    });

    renderWithProviders(
      <LightCard
        id="light.desk_lamp"
        name="Desk Lamp"
        room="Office"
        initialState
        initialBrightness={65}
        initialTemp={3000}
        size="extra-small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.queryByRole('button', { name: 'Choose light effect' })).not.toBeInTheDocument();
  });
});
