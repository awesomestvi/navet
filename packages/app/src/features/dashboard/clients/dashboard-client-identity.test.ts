import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDashboardClientIdentity,
  inferDashboardClientKind,
  renameDashboardClient,
} from './dashboard-client-identity';

describe('dashboard client identity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates and retains a stable browser-local identity', () => {
    const first = getDashboardClientIdentity({
      environment: { userAgent: 'Mozilla/5.0 (iPhone; Mobile)' },
      now: () => new Date('2026-07-25T08:00:00.000Z'),
      randomUUID: () => '12345678-1234-1234-1234-123456785555',
    });
    const second = getDashboardClientIdentity({
      environment: { userAgent: 'Mozilla/5.0 (iPhone; Mobile)' },
      now: () => new Date('2026-07-25T09:00:00.000Z'),
    });

    expect(first).toMatchObject({
      id: '12345678_1234_1234_1234_123456785555',
      kind: 'phone',
      name: 'Phone 5555',
    });
    expect(second).toEqual(first);
  });

  it('converts a generated identity to a wall panel without replacing its id', () => {
    const first = getDashboardClientIdentity({
      environment: { userAgent: 'Mozilla/5.0 (iPad)' },
      randomUUID: () => '12345678-1234-1234-1234-123456781234',
    });
    const wallPanel = getDashboardClientIdentity({
      environment: { userAgent: 'Mozilla/5.0 (iPad)' },
      profileMode: 'wall_display',
    });

    expect(wallPanel).toMatchObject({
      id: first.id,
      kind: 'wall_panel',
      name: 'Wall panel 1234',
    });
  });

  it('preserves a custom name and emits an identity update', () => {
    const listener = vi.fn();
    window.addEventListener('navet:dashboard-client-identity', listener);
    getDashboardClientIdentity({
      environment: { userAgent: 'Mozilla/5.0 (iPad)' },
      randomUUID: () => '12345678-1234-1234-1234-123456781234',
    });

    const renamed = renameDashboardClient('  Kitchen panel\u0000  ', {
      now: () => new Date('2026-07-25T10:00:00.000Z'),
      profileMode: 'wall_display',
    });

    expect(renamed.name).toBe('Kitchen panel');
    expect(renamed.nameSource).toBe('custom');
    expect(listener).toHaveBeenCalledOnce();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.dashboardClientIdentity) ?? '{}')).toEqual(
      renamed
    );
    window.removeEventListener('navet:dashboard-client-identity', listener);
  });

  it('recognizes phone, tablet, desktop, and wall-panel environments', () => {
    expect(inferDashboardClientKind({ userAgent: 'iPhone Mobile' })).toBe('phone');
    expect(inferDashboardClientKind({ userAgent: 'iPad' })).toBe('tablet');
    expect(inferDashboardClientKind({ userAgent: 'Mozilla/5.0 (Macintosh)' })).toBe('desktop');
    expect(inferDashboardClientKind({}, 'bedside')).toBe('wall_panel');
  });

  it('rejects persisted attacker-controlled identities', () => {
    localStorage.setItem(
      STORAGE_KEYS.dashboardClientIdentity,
      JSON.stringify({
        id: '../../victim',
        name: 'Victim',
        kind: 'phone',
        nameSource: 'custom',
        createdAt: '2026-07-25T08:00:00.000Z',
        updatedAt: '2026-07-25T08:00:00.000Z',
      })
    );

    const identity = getDashboardClientIdentity({
      environment: { userAgent: 'Mozilla/5.0 (Macintosh)' },
      randomUUID: () => '12345678-1234-1234-1234-123456781234',
    });
    expect(identity.id).toBe('12345678_1234_1234_1234_123456781234');
  });
});
