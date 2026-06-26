import { integrationStore } from '@navet/app/stores/integration-store';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderHookWithProviders, renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderCard, useAvailabilityEntitiesForCard } from '../card-renderer';

vi.mock('@navet/app/features/security', () => ({
  CameraCard: ({ id }: { id: string }) => <div data-testid="camera-card">{id}</div>,
  SecurityPanelCard: ({
    alarms,
    size,
  }: {
    alarms: Array<{ id: string; name: string }>;
    size: string;
  }) => (
    <div data-testid="security-panel-card">
      {alarms[0]?.id}:{alarms[0]?.name}:{size}
    </div>
  ),
}));

vi.mock('@navet/app/features/lighting', () => ({
  LightCard: ({ id }: { id: string }) => <div data-testid="light-card">{id}</div>,
  FanCard: () => null,
  SwitchCard: () => null,
}));

describe('card availability lookup', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('does not rerender for unrelated provider entity updates', () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'home_assistant',
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        home_assistant: {
          'home_assistant:camera.front_door': {
            id: 'home_assistant:camera.front_door',
            canonicalId: 'home_assistant:camera.front_door',
            providerId: 'home_assistant',
            externalId: 'camera.front_door',
            type: 'camera',
            name: 'Front Door',
            room: 'Entry',
            primaryState: 'unavailable',
            availability: 'available',
            capabilities: [],
            attributes: {},
          },
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        home_assistant: {
          'camera.front_door': 'home_assistant:camera.front_door',
          'home_assistant:camera.front_door': 'home_assistant:camera.front_door',
        },
      },
    });

    let renderCount = 0;
    const { result } = renderHookWithProviders(() => {
      renderCount += 1;
      return useAvailabilityEntitiesForCard(['camera.front_door'], 'home_assistant');
    });

    const initialEntity = result.current['camera.front_door'];
    expect(initialEntity?.canonicalId).toBe('home_assistant:camera.front_door');

    integrationStore.setState({
      ...integrationStore.getState(),
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        home_assistant: {
          ...(integrationStore.getState().providerEntitiesByProviderId.home_assistant ?? {}),
          'home_assistant:light.kitchen': {
            id: 'home_assistant:light.kitchen',
            canonicalId: 'home_assistant:light.kitchen',
            providerId: 'home_assistant',
            externalId: 'light.kitchen',
            type: 'light',
            name: 'Kitchen Light',
            room: 'Kitchen',
            primaryState: 'on',
            availability: 'available',
            capabilities: [],
            attributes: {},
          },
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        home_assistant: {
          ...(integrationStore.getState().providerEntityLookupByProviderId.home_assistant ?? {}),
          'light.kitchen': 'home_assistant:light.kitchen',
          'home_assistant:light.kitchen': 'home_assistant:light.kitchen',
        },
      },
    });

    expect(renderCount).toBe(1);
    expect(result.current['camera.front_door']).toBe(initialEntity);
  });

  it('renders alarm control panel sensors with the security panel card', async () => {
    const card = renderCard({
      device: {
        id: 'home_assistant:alarm_control_panel.home',
        name: 'Home Alarm',
        room: 'Hall',
        type: 'sensors',
        value: 'Disarmed',
        unit: '',
        securityKind: 'alarm',
        deviceClass: 'alarm_control_panel',
        alarmState: 'disarmed',
        alarmSupportedActions: ['arm_away', 'disarm'],
        alarmCodeFormat: 'none',
        providerId: 'home_assistant',
        availability: 'available',
      },
      size: 'large',
      handleSizeChange: () => undefined,
      isEditMode: false,
    });

    expect(card).not.toBeNull();
    if (!card) {
      throw new Error('Expected renderCard to return a security panel card');
    }

    renderWithProviders(card);

    expect(await screen.findByTestId('security-panel-card')).toHaveTextContent(
      'home_assistant:alarm_control_panel.home:Home Alarm:large'
    );
  });

  it('uses a compact unavailable overlay pill on tiny cards', async () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'home_assistant',
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        home_assistant: {
          'home_assistant:light.kitchen': {
            id: 'home_assistant:light.kitchen',
            canonicalId: 'home_assistant:light.kitchen',
            providerId: 'home_assistant',
            externalId: 'light.kitchen',
            type: 'light',
            name: 'Kitchen Light',
            room: 'Kitchen',
            primaryState: 'unavailable',
            availability: 'unavailable',
            capabilities: [],
            attributes: {},
          },
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        home_assistant: {
          'light.kitchen': 'home_assistant:light.kitchen',
          'home_assistant:light.kitchen': 'home_assistant:light.kitchen',
        },
      },
    });

    const card = renderCard({
      device: {
        id: 'light.kitchen',
        name: 'Kitchen Light',
        room: 'Kitchen',
        type: 'lights',
        state: false,
      },
      size: 'tiny',
      handleSizeChange: () => undefined,
      isEditMode: false,
    });

    expect(card).not.toBeNull();
    if (!card) {
      throw new Error('Expected renderCard to return a light card');
    }

    renderWithProviders(card);

    const unavailablePill = await screen.findByText('Unavailable');
    expect(unavailablePill).toHaveClass(
      'max-w-[calc(100%-1rem)]',
      'px-1.5',
      'py-0.5',
      'text-[10px]'
    );
    expect(unavailablePill).not.toHaveClass('uppercase');
  });

  it('does not add the generic unavailable overlay pill on camera cards', async () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'home_assistant',
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        home_assistant: {
          'home_assistant:camera.front_door': {
            id: 'home_assistant:camera.front_door',
            canonicalId: 'home_assistant:camera.front_door',
            providerId: 'home_assistant',
            externalId: 'camera.front_door',
            type: 'camera',
            name: 'Front Door',
            room: 'Entry',
            primaryState: 'unavailable',
            availability: 'unavailable',
            capabilities: [],
            attributes: {},
          },
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        home_assistant: {
          'camera.front_door': 'home_assistant:camera.front_door',
          'home_assistant:camera.front_door': 'home_assistant:camera.front_door',
        },
      },
    });

    const card = renderCard({
      device: {
        id: 'camera.front_door',
        name: 'Front Door',
        room: 'Entry',
        type: 'cameras',
        state: 'unavailable',
      },
      size: 'small',
      handleSizeChange: () => undefined,
      isEditMode: false,
    });

    expect(card).not.toBeNull();
    if (!card) {
      throw new Error('Expected renderCard to return a camera card');
    }

    renderWithProviders(card);

    expect(await screen.findByTestId('camera-card')).toHaveTextContent('camera.front_door');
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
  });

  it('skips extra unavailable blur and saturation when low-power mode forces effective low quality', async () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'home_assistant',
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        home_assistant: {
          'home_assistant:light.kitchen': {
            id: 'home_assistant:light.kitchen',
            canonicalId: 'home_assistant:light.kitchen',
            providerId: 'home_assistant',
            externalId: 'light.kitchen',
            type: 'light',
            name: 'Kitchen Light',
            room: 'Kitchen',
            primaryState: 'unavailable',
            availability: 'unavailable',
            capabilities: [],
            attributes: {},
          },
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        home_assistant: {
          'light.kitchen': 'home_assistant:light.kitchen',
          'home_assistant:light.kitchen': 'home_assistant:light.kitchen',
        },
      },
    });
    useSettingsStore.getState().updateSettings({
      effectsQuality: 'high',
      lowPowerMode: true,
    });

    const card = renderCard({
      device: {
        id: 'light.kitchen',
        name: 'Kitchen Light',
        room: 'Kitchen',
        type: 'lights',
        state: false,
      },
      size: 'small',
      handleSizeChange: () => undefined,
      isEditMode: false,
    });

    expect(card).not.toBeNull();
    if (!card) {
      throw new Error('Expected renderCard to return a light card');
    }

    const { container } = renderWithProviders(card);

    await screen.findByText('Unavailable');

    expect(container.innerHTML).not.toContain('saturate-50');
    expect(container.innerHTML).not.toContain('backdrop-blur-[1px]');
  });
});
