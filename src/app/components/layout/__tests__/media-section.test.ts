import { describe, expect, it } from 'vitest';
import type { MediaDevice } from '@/app/types/device.types';
import { buildMediaSections } from '../media-section';

function createMediaDevice(overrides: Partial<MediaDevice> = {}): MediaDevice & { type: 'media' } {
  return {
    id: overrides.id ?? 'media_player.device',
    name: overrides.name ?? 'Media Device',
    room: overrides.room ?? 'Living Room',
    size: overrides.size ?? 'medium',
    title: overrides.title ?? 'Nothing Playing',
    artist: overrides.artist ?? 'Ready to play',
    state: overrides.state ?? 'off',
    volume: overrides.volume ?? 0,
    isMuted: overrides.isMuted ?? false,
    entityType: overrides.entityType,
    deviceClass: overrides.deviceClass,
    type: 'media',
  };
}

const labels = {
  audioTitle: 'Players & speakers',
  audioSingular: 'player & speaker',
  audioPlural: 'players & speakers',
  tvTitle: 'TVs',
  tvSingular: 'tv',
  tvPlural: 'tvs',
  typeLabels: {
    'media.type.player': 'Player',
    'media.type.tv': 'TV',
    'media.type.speaker': 'Speaker',
    'media.type.receiver': 'Receiver',
    'media.type.setTopBox': 'Set-top box',
    'media.type.streamingBox': 'Streaming box',
    'media.type.soundbar': 'Soundbar',
  },
} as const;

describe('buildMediaSections', () => {
  it('keeps TVs separate from players and speakers based on semantic media type', () => {
    const sections = buildMediaSections(
      [
        createMediaDevice({
          id: 'media_player.living_room_tv',
          name: 'Living Room TV',
          entityType: 'Media Player',
          deviceClass: 'tv',
        }),
        createMediaDevice({
          id: 'media_player.kitchen_speaker',
          name: 'Kitchen Speaker',
          entityType: 'Speaker',
          deviceClass: 'speaker',
        }),
      ],
      labels
    );

    expect(sections.map((section) => section.key)).toEqual(['audio', 'tv']);
    expect(sections[0]?.devices.map((device) => device.id)).toEqual([
      'media_player.kitchen_speaker',
    ]);
    expect(sections[1]?.devices.map((device) => device.id)).toEqual([
      'media_player.living_room_tv',
    ]);
  });
});
