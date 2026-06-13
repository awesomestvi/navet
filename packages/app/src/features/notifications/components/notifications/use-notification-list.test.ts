import { describe, expect, it } from 'vitest';
import { buildUpdateNotifications } from './use-notification-list';

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

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
