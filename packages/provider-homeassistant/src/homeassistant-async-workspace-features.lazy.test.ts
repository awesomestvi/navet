import { beforeEach, expect, it, vi } from 'vitest';

const { loaded, conversation, notifications, dispose, session } = vi.hoisted(() => ({
  loaded: vi.fn(),
  dispose: vi.fn(),
  session: { callWS: vi.fn() },
  conversation: {
    getPipelines: vi.fn(),
    startTextConversation: vi.fn(),
    startVoiceConversation: vi.fn(),
  },
  notifications: {
    getSnapshot: vi.fn(),
    subscribePersistentNotifications: vi.fn(),
    dismissPersistentNotification: vi.fn(),
    installUpdate: vi.fn(),
    restartSystem: vi.fn(),
    getDeliveryTargets: vi.fn(),
    sendNotification: vi.fn(),
  },
}));
vi.mock('./homeassistant-service-bridge', () => ({
  getHomeAssistantPanelHass: () => ({ callWS: session.callWS }),
  getHomeAssistantConnection: () => null,
}));
vi.mock('./homeassistant-conversation-feature.service', () => {
  loaded('conversation');
  return { homeAssistantConversationFeatureService: conversation };
});
vi.mock('./homeassistant-notification-feature.service', () => {
  loaded('notifications');
  return { homeAssistantNotificationFeatureService: notifications };
});
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  session.callWS = vi.fn();
});

it('defers conversation implementation and preserves requests, listeners and run handles', async () => {
  const { lazyHomeAssistantConversationFeatureService: proxy } = await import(
    './homeassistant-conversation-feature.service.lazy'
  );
  expect(loaded).not.toHaveBeenCalled();
  const pipelines = { pipelines: [], preferredPipelineId: null };
  conversation.getPipelines.mockResolvedValueOnce(pipelines);
  expect(await proxy.getPipelines()).toBe(pipelines);
  const handle = { cancel: vi.fn() };
  const listener = vi.fn();
  const text = { text: 'Hello' };
  const voice = { sampleRate: 16000 };
  conversation.startTextConversation.mockResolvedValueOnce(handle);
  conversation.startVoiceConversation.mockResolvedValueOnce(handle);
  expect(await proxy.startTextConversation(text, listener)).toBe(handle);
  expect(conversation.startTextConversation).toHaveBeenCalledWith(text, listener);
  expect(await proxy.startVoiceConversation(voice, listener)).toBe(handle);
  expect(conversation.startVoiceConversation).toHaveBeenCalledWith(voice, listener);
  expect(loaded).toHaveBeenCalledTimes(1);
});

it('defers notifications and preserves every API argument, response and unsubscribe', async () => {
  const { lazyHomeAssistantNotificationFeatureService: proxy } = await import(
    './homeassistant-notification-feature.service.lazy'
  );
  expect(loaded).not.toHaveBeenCalled();
  const options = {};
  const snapshot = { persistentNotifications: [], repairIssues: [] };
  notifications.getSnapshot.mockResolvedValueOnce(snapshot);
  expect(await proxy.getSnapshot(options)).toBe(snapshot);
  expect(notifications.getSnapshot).toHaveBeenCalledWith(options);
  const listener = vi.fn();
  notifications.subscribePersistentNotifications.mockResolvedValueOnce(dispose);
  const unsubscribe = await proxy.subscribePersistentNotifications(listener, options);
  expect(notifications.subscribePersistentNotifications).toHaveBeenCalledWith(listener, options);
  unsubscribe();
  expect(dispose).toHaveBeenCalledOnce();
  await proxy.dismissPersistentNotification('notification-1');
  expect(notifications.dismissPersistentNotification).toHaveBeenCalledWith('notification-1');
  await proxy.installUpdate('update.navet');
  expect(notifications.installUpdate).toHaveBeenCalledWith('update.navet');
  await proxy.restartSystem();
  expect(notifications.restartSystem).toHaveBeenCalledOnce();
  const targets = [{ id: 'phone', label: 'Phone' }];
  notifications.getDeliveryTargets.mockResolvedValueOnce(targets);
  expect(await proxy.getDeliveryTargets?.(options)).toBe(targets);
  expect(notifications.getDeliveryTargets).toHaveBeenCalledWith(options);
  const request = { title: 'Chore due', message: 'Water the plants', target: 'phone' };
  await proxy.sendNotification?.(request);
  expect(notifications.sendNotification).toHaveBeenCalledWith(request);
  expect(loaded).toHaveBeenCalledTimes(1);
});

it('rejects delayed notification actions for a replacement household', async () => {
  const { lazyHomeAssistantNotificationFeatureService: proxy } = await import(
    './homeassistant-notification-feature.service.lazy'
  );
  const pending = proxy.restartSystem();
  session.callWS = vi.fn();
  await expect(pending).rejects.toThrow('Home Assistant session changed');
  expect(notifications.restartSystem).not.toHaveBeenCalled();
});
