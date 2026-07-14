import { dispatchEntityCommand } from '@navet/app/commands';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setLightsBrightness, setLightsPower } from '../light-dashboard-actions';
import type { LightDashboardItem } from '../light-dashboard-model';

vi.mock('@navet/app/commands', () => ({ dispatchEntityCommand: vi.fn() }));

const commandMock = vi.mocked(dispatchEntityCommand);

function light(overrides: Partial<LightDashboardItem> = {}): LightDashboardItem {
  return {
    id: 'light.one',
    name: 'One',
    room: 'Kitchen',
    isOn: true,
    available: true,
    brightness: 50,
    supportsBrightness: true,
    supportsColorTemperature: false,
    supportsToggle: true,
    ...overrides,
  };
}

describe('light dashboard batch actions', () => {
  beforeEach(() => {
    commandMock.mockReset();
    commandMock.mockResolvedValue({ accepted: true, requiresEventConfirmation: true });
  });

  it('excludes unavailable lights from room power commands', async () => {
    const result = await setLightsPower(
      [light(), light({ id: 'light.unavailable', available: false })],
      'off'
    );

    expect(commandMock).toHaveBeenCalledTimes(1);
    expect(commandMock).toHaveBeenCalledWith(
      { type: 'turn_off', entityId: 'light.one' },
      undefined
    );
    expect(result).toEqual({ succeeded: 1, failed: 0, skippedUnavailable: 1 });
  });

  it('reports rejected commands as partial failures', async () => {
    commandMock
      .mockResolvedValueOnce({ accepted: true, requiresEventConfirmation: true })
      .mockResolvedValueOnce({
        accepted: false,
        requiresEventConfirmation: false,
        error: 'offline',
      });

    const result = await setLightsPower([light(), light({ id: 'light.two' })], 'off');

    expect(result).toEqual({ succeeded: 1, failed: 1, skippedUnavailable: 0 });
  });

  it('sends normalized brightness only to available dimmable lights', async () => {
    const result = await setLightsBrightness(
      [
        light(),
        light({ id: 'light.fixed', supportsBrightness: false }),
        light({ id: 'light.offline', available: false }),
      ],
      140
    );

    expect(commandMock).toHaveBeenCalledTimes(1);
    expect(commandMock).toHaveBeenCalledWith(
      { type: 'set_brightness', entityId: 'light.one', brightness: 100 },
      undefined
    );
    expect(result).toEqual({ succeeded: 1, failed: 0, skippedUnavailable: 1 });
  });
});
