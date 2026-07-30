import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDashboardClientIdentity,
  inferDashboardClientKind,
  renameDashboardClient,
  rotateDashboardClientIdentity,
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

  it('rotates a server-rejected client ID while preserving the dashboard name', () => {
    getDashboardClientIdentity({
      environment: { userAgent: 'Mozilla/5.0 (iPad)' },
      randomUUID: () => '12345678-1234-1234-1234-123456781234',
    });
    renameDashboardClient('Kitchen panel', {
      now: () => new Date('2026-07-25T09:00:00.000Z'),
    });
    const listener = vi.fn();
    window.addEventListener('navet:dashboard-client-identity', listener);

    const rotated = rotateDashboardClientIdentity({
      now: () => new Date('2026-07-25T10:00:00.000Z'),
      randomUUID: () => '87654321-4321-4321-4321-876543218765',
    });

    expect(rotated).toMatchObject({
      id: '87654321_4321_4321_4321_876543218765',
      name: 'Kitchen panel',
      nameSource: 'custom',
      createdAt: '2026-07-25T10:00:00.000Z',
      updatedAt: '2026-07-25T10:00:00.000Z',
    });
    expect(listener).toHaveBeenCalledOnce();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.dashboardClientIdentity) ?? '{}')).toEqual(
      rotated
    );
    window.removeEventListener('navet:dashboard-client-identity', listener);
  });

  it('reuses a concurrent recovery instead of rotating the client ID twice', () => {
    const original = getDashboardClientIdentity({
      environment: { userAgent: 'Mozilla/5.0 (iPad)' },
      randomUUID: () => '12345678-1234-1234-1234-123456781234',
    });
    const recovered = rotateDashboardClientIdentity({
      dispatchEvent: false,
      expectedCurrentId: original.id,
      randomUUID: () => '87654321-4321-4321-4321-876543218765',
    });
    const unusedRandomUUID = vi.fn(() => '99999999-9999-9999-9999-999999999999');

    const reused = rotateDashboardClientIdentity({
      expectedCurrentId: original.id,
      randomUUID: unusedRandomUUID,
    });

    expect(reused).toEqual(recovered);
    expect(unusedRandomUUID).not.toHaveBeenCalled();
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

  it('keeps a stable tab identity when local storage is unavailable', () => {
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function getItem(
      this: Storage,
      key
    ) {
      if (key === STORAGE_KEYS.dashboardClientIdentity) {
        throw new DOMException('Storage access denied', 'SecurityError');
      }
      return originalGetItem.call(this, key);
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(
      this: Storage,
      key,
      value
    ) {
      if (key === STORAGE_KEYS.dashboardClientIdentity) {
        throw new DOMException('Storage access denied', 'SecurityError');
      }
      return originalSetItem.call(this, key, value);
    });
    const unusedRandomUUID = vi.fn(() => '99999999-9999-9999-9999-999999999999');

    try {
      const first = getDashboardClientIdentity({
        environment: { userAgent: 'Mozilla/5.0 (iPhone; Mobile)' },
        randomUUID: () => '12345678-1234-1234-1234-123456781234',
      });
      const second = getDashboardClientIdentity({
        environment: { userAgent: 'Mozilla/5.0 (iPhone; Mobile)' },
        randomUUID: unusedRandomUUID,
      });

      expect(second).toEqual(first);
      expect(unusedRandomUUID).not.toHaveBeenCalled();
    } finally {
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    }
  });
});
