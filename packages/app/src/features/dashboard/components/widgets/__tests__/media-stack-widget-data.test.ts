import type { MediaDevice } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { normalizeMediaStackWidgetData, selectMediaStackDevice } from '../media-stack-widget-data';

function mediaDevice(
  overrides: Partial<MediaDevice> & Pick<MediaDevice, 'id' | 'name'>
): MediaDevice {
  return {
    ...overrides,
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Living Room',
    size: overrides.size ?? 'medium',
    title: overrides.title ?? 'Nothing playing',
    artist: overrides.artist ?? 'Ready to play',
    state: overrides.state ?? 'off',
    volume: overrides.volume ?? 0,
    isMuted: overrides.isMuted ?? false,
  };
}

describe('media-stack-widget-data', () => {
  it('normalizes entity ids, priority order, and idle behavior', () => {
    expect(
      normalizeMediaStackWidgetData({
        entityIds: ['media_player.tv', 42, 'media_player.speaker'],
        priorityOrder: ['media_player.speaker', 'missing', 'media_player.tv'],
        idleBehavior: 'compact',
      })
    ).toEqual({
      entityIds: ['media_player.tv', 'media_player.speaker'],
      priorityOrder: ['media_player.speaker', 'media_player.tv'],
      idleBehavior: 'compact',
    });
  });

  it('prefers active playback states over idle and off', () => {
    const result = selectMediaStackDevice(
      [
        mediaDevice({ id: 'media_player.tv', name: 'TV', state: 'idle' }),
        mediaDevice({ id: 'media_player.speaker', name: 'Speaker', state: 'playing' }),
      ],
      {
        entityIds: ['media_player.tv', 'media_player.speaker'],
        priorityOrder: ['media_player.tv', 'media_player.speaker'],
        idleBehavior: 'compact',
      }
    );

    expect(result?.device.id).toBe('media_player.speaker');
    expect(result?.isFallback).toBe(false);
  });

  it('uses manual order to break ties between active players', () => {
    const result = selectMediaStackDevice(
      [
        mediaDevice({ id: 'media_player.tv', name: 'TV', state: 'paused' }),
        mediaDevice({ id: 'media_player.speaker', name: 'Speaker', state: 'paused' }),
      ],
      {
        entityIds: ['media_player.tv', 'media_player.speaker'],
        priorityOrder: ['media_player.speaker', 'media_player.tv'],
        idleBehavior: 'compact',
      }
    );

    expect(result?.device.id).toBe('media_player.speaker');
  });

  it('keeps a stable fallback when nothing is active', () => {
    const result = selectMediaStackDevice(
      [
        mediaDevice({ id: 'media_player.tv', name: 'TV', state: 'off' }),
        mediaDevice({ id: 'media_player.speaker', name: 'Speaker', state: 'idle' }),
      ],
      {
        entityIds: ['media_player.tv', 'media_player.speaker'],
        priorityOrder: ['media_player.tv', 'media_player.speaker'],
        idleBehavior: 'compact',
      }
    );

    expect(result?.device.id).toBe('media_player.tv');
    expect(result?.isFallback).toBe(true);
  });

  it('returns null for hidden idle behavior when no player is active', () => {
    expect(
      selectMediaStackDevice([mediaDevice({ id: 'media_player.tv', name: 'TV', state: 'off' })], {
        entityIds: ['media_player.tv'],
        priorityOrder: ['media_player.tv'],
        idleBehavior: 'hidden',
      })
    ).toBeNull();
  });
});
