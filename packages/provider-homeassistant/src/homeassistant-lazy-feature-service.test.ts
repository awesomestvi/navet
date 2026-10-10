import { beforeEach, expect, it, vi } from 'vitest';
import { createSessionBoundFeatureLoader } from './homeassistant-lazy-feature-service';

const session = vi.hoisted(() => ({ callWS: vi.fn() }));
vi.mock('./homeassistant-service-bridge', () => ({
  getHomeAssistantPanelHass: () => ({ callWS: session.callWS }),
  getHomeAssistantConnection: () => null,
}));

beforeEach(() => {
  session.callWS = vi.fn();
});

it('rejects a delayed load for a replaced household before invoking its action', async () => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const action = vi.fn();
  const withService = createSessionBoundFeatureLoader(async () => {
    await gate;
    return {};
  });
  const pending = withService(action);
  session.callWS = vi.fn();
  release();
  await expect(pending).rejects.toThrow('Home Assistant session changed');
  expect(action).not.toHaveBeenCalled();
});

it('permits replacement hass wrappers with the same authenticated callWS transport', async () => {
  const result = {};
  const action = vi.fn(() => result);
  const withService = createSessionBoundFeatureLoader(async () => ({}));
  await expect(withService(action)).resolves.toBe(result);
  expect(action).toHaveBeenCalledOnce();
});
