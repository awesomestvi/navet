import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { useSettingsStore } from '@/app/stores/settings-store';
import { lightEntityFactory } from '@/test/fixtures/home-assistant/entities/light';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { LightCard } from '..';

const { toastErrorMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
}));

const { advancedLightServiceMock } = vi.hoisted(() => ({
  advancedLightServiceMock: {
    updateLight: vi.fn().mockResolvedValue(undefined),
  },
}));

const { dispatchEntityCommandMock } = vi.hoisted(() => ({
  dispatchEntityCommandMock: vi.fn().mockResolvedValue({
    accepted: true,
    requiresEventConfirmation: true,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}));

vi.mock('@/app/services/integration-light-feature.service', () => ({
  hasIntegrationLightFeatureService: vi.fn(
    (entityId: string) => entityId.startsWith('light.') || entityId.startsWith('home_assistant:')
  ),
  integrationLightFeatureService: {
    applyBasicLightUpdate: async (entityId: string, options: Record<string, unknown>) => {
      if (options.state === 'off') {
        await dispatchEntityCommandMock({ type: 'turn_off', entityId });
        return;
      }

      if (
        options.state === 'on' &&
        typeof options.brightnessPct !== 'number' &&
        typeof options.kelvin !== 'number'
      ) {
        await dispatchEntityCommandMock({ type: 'turn_on', entityId });
      }

      if (typeof options.brightnessPct === 'number') {
        await dispatchEntityCommandMock({
          type: 'set_brightness',
          entityId,
          brightness: options.brightnessPct,
        });
      }

      if (typeof options.kelvin === 'number') {
        await dispatchEntityCommandMock({
          type: 'set_color_temperature',
          entityId,
          kelvin: options.kelvin,
        });
      }
    },
    updateLight: advancedLightServiceMock.updateLight,
  },
}));

vi.mock('@/app/services/integration-action.service', () => ({
  dispatchEntityCommand: dispatchEntityCommandMock,
}));

function createLightEntity(state: 'on' | 'off' = 'on') {
  const entity = lightEntityFactory({
    friendly_name: 'Desk Lamp',
    brightness: 166,
    supported_color_modes: ['brightness'],
    color_temp_kelvin: undefined,
    color_temp: undefined,
  });
  entity.entity_id = 'light.desk_lamp';
  entity.state = state;
  return entity;
}

function createEffectLightEntity(effect?: string) {
  const entity = lightEntityFactory({
    friendly_name: 'Desk Lamp',
    brightness: 166,
    supported_color_modes: ['brightness'],
    effect_list: ['Rainbow', 'Fire'],
    effect,
  });
  entity.entity_id = 'light.desk_lamp';
  entity.state = 'on';
  return entity;
}

function createOnOffLightEntity(state: 'on' | 'off' = 'on') {
  const entity = lightEntityFactory({
    friendly_name: 'Porch Light',
    supported_color_modes: ['onoff'],
    brightness: undefined,
    color_temp_kelvin: undefined,
    color_temp: undefined,
  });
  entity.entity_id = 'light.porch_light';
  entity.state = state;
  return entity;
}

describe('LightCard', () => {
  beforeEach(async () => {
    await resetAppStores();
    vi.clearAllMocks();
  });

  it('keeps the extra-small icon as a toggle when card taps open controls', () => {
    homeAssistantStore.setState({
      connected: true,
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

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      type: 'turn_off',
      entityId: 'light.desk_lamp',
    });
    expect(card).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Controls')).not.toBeInTheDocument();

    fireEvent.click(card);

    expect(dispatchEntityCommandMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Controls')).toBeInTheDocument();
  });

  it('shows the effect picker on medium cards and sends effect selections to Home Assistant', async () => {
    homeAssistantStore.setState({
      connected: true,
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

    expect(advancedLightServiceMock.updateLight).toHaveBeenCalledWith('light.desk_lamp', {
      state: 'on',
      effect: 'Fire',
    });
  });

  it('keeps effect selection out of the extra-small quick actions', () => {
    homeAssistantStore.setState({
      connected: true,
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

  it('routes Homey light toggles through the integration action dispatcher', () => {
    renderWithProviders(
      <LightCard
        id="homey:light_1"
        name="Desk Lamp"
        room="Office"
        providerId="homey"
        initialState={true}
        initialBrightness={65}
        initialTemp={3000}
        size="extra-small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Desk Lamp' }));

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      type: 'turn_off',
      entityId: 'homey:light_1',
    });
    expect(advancedLightServiceMock.updateLight).not.toHaveBeenCalled();
  });

  it('turns on a brightness-only Home Assistant light without sending an unsupported kelvin update', async () => {
    dispatchEntityCommandMock.mockImplementation(async (command: { type: string }) => {
      if (command.type === 'set_color_temperature') {
        throw new Error('Color temperature is not supported');
      }

      return {
        accepted: true,
        requiresEventConfirmation: true,
      };
    });
    homeAssistantStore.setState({
      connected: true,
      connection: {} as never,
      entities: {
        'light.desk_lamp': createLightEntity('off'),
      },
    });

    renderWithProviders(
      <LightCard
        id="light.desk_lamp"
        name="Desk Lamp"
        room="Office"
        initialState={false}
        initialBrightness={65}
        initialTemp={3000}
        size="extra-small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Desk Lamp' }));

    await waitFor(() =>
      expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
        type: 'set_brightness',
        entityId: 'light.desk_lamp',
        brightness: 65,
      })
    );
    expect(dispatchEntityCommandMock).not.toHaveBeenCalledWith({
      type: 'set_color_temperature',
      entityId: 'light.desk_lamp',
      kelvin: 3000,
    });
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('turns on a Homey light without assuming color temperature support from initial temp alone', async () => {
    renderWithProviders(
      <LightCard
        id="homey:light_1"
        name="Desk Lamp"
        room="Office"
        providerId="homey"
        initialState={false}
        initialBrightness={65}
        initialTemp={3000}
        size="extra-small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Desk Lamp' }));

    await waitFor(() =>
      expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
        type: 'set_brightness',
        entityId: 'homey:light_1',
        brightness: 65,
      })
    );
    expect(dispatchEntityCommandMock).not.toHaveBeenCalledWith({
      type: 'set_color_temperature',
      entityId: 'homey:light_1',
      kelvin: 3000,
    });
  });

  it('hides brightness sliders and presets for a non-dimmable light entity', () => {
    homeAssistantStore.setState({
      connected: true,
      connection: {} as never,
      entities: {
        'light.porch_light': createOnOffLightEntity('on'),
      },
    });

    renderWithProviders(
      <LightCard
        id="light.porch_light"
        name="Porch Light"
        room="Outside"
        initialState
        initialBrightness={65}
        initialTemp={3000}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.queryByRole('slider', { name: 'Brightness' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Brightness presets')).not.toBeInTheDocument();
  });

  it('collapses the brightness slider to zero when turned off and restores it when turned back on', async () => {
    homeAssistantStore.setState({
      connected: true,
      connection: {} as never,
      entities: {
        'light.desk_lamp': createLightEntity('on'),
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

    const toggleButton = screen.getByRole('button', { name: 'Toggle Desk Lamp' });
    const brightnessSlider = screen.getByRole('slider', { name: 'Brightness' });

    expect(brightnessSlider).toHaveAttribute('aria-valuenow', '65');

    fireEvent.click(toggleButton);

    await waitFor(() => expect(brightnessSlider).toHaveAttribute('aria-valuenow', '0'));

    fireEvent.click(toggleButton);

    await waitFor(() => expect(brightnessSlider).toHaveAttribute('aria-valuenow', '65'));
  });
});
