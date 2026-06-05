import { describe, expect, it } from 'vitest';
import { resolveMediaPlayerName } from '../resolve-media-player-name';

describe('resolveMediaPlayerName', () => {
  it('keeps explicit non-entity-id names', () => {
    expect(
      resolveMediaPlayerName({
        entityId: 'media_player.living_room_speaker',
        entityName: 'Living Room Speaker',
        room: 'Living Room',
        entityType: 'Speaker',
      })
    ).toBe('Living Room Speaker');
  });

  it('humanizes raw media player ids into a readable player name', () => {
    expect(
      resolveMediaPlayerName({
        entityId: 'media_player.bathroom',
        entityName: 'media_player.bathroom',
        room: 'Bathroom',
        entityType: 'Speaker',
      })
    ).toBe('Bathroom Speaker');
  });

  it('falls back to a humanized object id when the room does not match', () => {
    expect(
      resolveMediaPlayerName({
        entityId: 'media_player.sonos_move_gen_2',
        entityName: 'media_player.sonos_move_gen_2',
        room: 'Bathroom',
        entityType: 'Speaker',
      })
    ).toBe('Sonos Move Gen 2');
  });
});
