import { renderHookWithProviders } from '@navet/app/test/render';
import { describe, expect, it, vi } from 'vitest';
import {
  buildPersistentNotifications,
  buildUpdateNotifications,
  useNotificationList,
} from './use-notification-list';

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('buildPersistentNotifications', () => {
  it('keeps notifications without provider IDs stable when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', { randomUUID: undefined });
    try {
      const missingId = {
        title: 'Backup complete',
        message: 'Your backup is ready.',
        created_at: '2026-09-15T10:00:00.000Z',
      };
      const providerId = { notification_id: 'homey:notice', title: 'Door open' };
      const first = buildPersistentNotifications([missingId, providerId], []);
      const reordered = buildPersistentNotifications([providerId, missingId], [first[0].id]);

      expect(first[0].id).toMatch(/^persistent_notification:missing_[a-z0-9]+_1$/);
      expect(reordered[1].id).toBe(first[0].id);
      expect(reordered[1].read).toBe(true);
      expect(first[1].notificationId).toBe('homey:notice');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('gives identical notifications without IDs distinct local identities', () => {
    const notification = { title: 'Backup complete', message: 'Your backup is ready.' };
    const notifications = buildPersistentNotifications([notification, notification], []);

    expect(notifications[0].id).not.toBe(notifications[1].id);
  });

  it('treats a malformed provider ID as missing', () => {
    const notification = {
      notification_id: 123 as unknown as string,
      title: 'Backup complete',
    };

    expect(buildPersistentNotifications([notification], [])[0].id).toMatch(
      /^persistent_notification:missing_/
    );
  });
});

describe('useNotificationList', () => {
  it('renders a provider notification without an ID in an insecure browser context', () => {
    vi.stubGlobal('crypto', { randomUUID: undefined });
    try {
      const { result } = renderHookWithProviders(() =>
        useNotificationList({
          entitiesHydrated: true,
          persistentNotifications: [{ title: 'Backup complete', message: 'Your backup is ready.' }],
          repairIssues: [],
          updateCandidates: [],
          readNotifications: [],
          hiddenNotifications: [],
          pendingUpdateInstalls: [],
        })
      );

      expect(result.current).toEqual([
        expect.objectContaining({
          id: expect.stringMatching(/^persistent_notification:missing_/),
          title: 'Backup complete',
        }),
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('buildUpdateNotifications', () => {
  it('maps provider update candidates into provider-owned notifications', () => {
    const notifications = buildUpdateNotifications({
      pendingUpdateInstalls: ['update.router'],
      readNotifications: [],
      t,
      updateCandidates: [
        {
          entityId: 'update.router',
          state: 'off',
          friendlyName: 'Router firmware',
          installedVersion: '1.0.0',
          latestVersion: '1.1.0',
          releaseSummary: 'Stability fixes',
          releaseNotes: null,
          detailsUrl: 'https://example.com/release',
          progress: 50,
          inProgress: false,
          lastChanged: '2026-05-28T10:00:00.000Z',
        },
        {
          entityId: 'update.speaker',
          state: 'on',
          friendlyName: 'Speaker update',
          installedVersion: '2.0.0',
          latestVersion: '2.1.0',
          releaseSummary: null,
          releaseNotes: 'Adds AirPlay fixes',
          detailsUrl: null,
          progress: null,
          inProgress: true,
          lastUpdated: '2026-05-28T09:00:00.000Z',
        },
      ],
    });

    expect(notifications).toEqual([
      expect.objectContaining({
        id: 'update.router',
        title: 'Router firmware',
        requiresRestart: true,
        statusLabel: 'notifications.update.restartToFinish',
        detailsUrl: 'https://example.com/release',
      }),
      expect.objectContaining({
        id: 'update.speaker',
        title: 'Speaker update',
        isBusy: true,
        statusLabel: 'notifications.update.installing',
        message:
          'notifications.update.availableFromTo:{"from":"2.0.0","to":"2.1.0"}\n\nAdds AirPlay fixes',
      }),
    ]);
  });

  it('shows restart-required update candidates even when the entity still reports on', () => {
    const notifications = buildUpdateNotifications({
      pendingUpdateInstalls: [],
      readNotifications: [],
      t,
      updateCandidates: [
        {
          entityId: 'update.navet_dashboard',
          state: 'on',
          friendlyName: 'Navet Dashboard',
          installedVersion: '4862fcb',
          latestVersion: 'ee8ccc9',
          releaseNotes: 'Restart of Home Assistant required',
          detailsUrl: null,
          progress: null,
          inProgress: false,
          requiresRestart: true,
          lastChanged: '2026-05-29T10:00:00.000Z',
        },
      ],
    });

    expect(notifications).toEqual([
      expect.objectContaining({
        id: 'update.navet_dashboard',
        isBusy: true,
        requiresRestart: true,
        statusLabel: 'notifications.update.restartToFinish',
      }),
    ]);
  });
});
