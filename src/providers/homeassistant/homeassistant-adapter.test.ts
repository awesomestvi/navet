import { createProviderScopedId } from '@navet/core/ids';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lightEntityFactory } from '@/test/fixtures/home-assistant/entities/light';
import { createHomeAssistantContractAdapter } from './homeassistant-adapter';

const { callHomeAssistantServiceMock } = vi.hoisted(() => ({
  callHomeAssistantServiceMock: vi.fn(),
}));

vi.mock('@/app/stores/home-assistant-store', () => ({
  homeAssistantStore: {
    getState: () => ({
      connected: true,
      entities: {
        'light.kitchen': lightEntityFactory(),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
      syncPanelHass: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock('./homeassistant-service-bridge', () => ({
  addHomeAssistantListener: vi.fn(() => () => {}),
  callHomeAssistantService: callHomeAssistantServiceMock,
  isHomeAssistantConnected: vi.fn(() => true),
}));

describe('homeassistant-adapter', () => {
  beforeEach(() => {
    callHomeAssistantServiceMock.mockReset();
  });

  it('maps provider-neutral color temperature commands to color_temp_kelvin', async () => {
    const adapter = createHomeAssistantContractAdapter();

    await adapter.execute({
      type: 'set_color_temperature',
      entityId: createProviderScopedId('home_assistant', 'light.kitchen'),
      kelvin: 3200,
    });

    expect(callHomeAssistantServiceMock).toHaveBeenCalledWith(
      'light',
      'turn_on',
      { color_temp_kelvin: 3200 },
      { entity_id: 'light.kitchen' }
    );
  });
});
