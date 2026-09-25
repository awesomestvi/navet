import type { MediaDevice } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import {
  getAvailableMediaDisplayGroupEntityIds,
  getMediaDisplayGroupMemberIds,
  isMediaDisplayGroupVisible,
  normalizeMediaDisplayGroups,
} from '../media-display-groups';

const player: MediaDevice = {
  id: 'home_assistant:media_player.playstation',
  name: 'PlayStation',
  room: 'Living room',
  size: 'medium',
  title: 'PlayStation',
  artist: '',
  state: 'idle',
  isPoweredOn: true,
  volume: 0,
  isMuted: false,
};

describe('media display groups', () => {
  it('keeps valid persisted groups and rejects malformed entries', () => {
    const groups = normalizeMediaDisplayGroups([
      {
        id: 'living-room',
        size: 'large',
        data: { entityIds: [player.id], idleBehavior: 'hidden' },
      },
      { id: 'living-room', data: { entityIds: [] } },
      { id: '', data: {} },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.size).toBe('large');
    expect(groups[0]?.data).toMatchObject({
      entityIds: [player.id],
      priorityOrder: [player.id],
      idleBehavior: 'hidden',
    });
    expect(getMediaDisplayGroupMemberIds(groups)).toEqual(new Set([player.id]));
  });

  it('defaults legacy groups to a medium card', () => {
    expect(normalizeMediaDisplayGroups([{ id: 'legacy', data: {} }])[0]?.size).toBe('medium');
  });

  it('shows a powered console and hides an idle group when configured', () => {
    const group = normalizeMediaDisplayGroups([
      { id: 'living-room', data: { entityIds: [player.id], idleBehavior: 'hidden' } },
    ])[0];
    if (!group) throw new Error('Expected a valid media group');

    expect(isMediaDisplayGroupVisible(group, [player])).toBe(true);
    expect(isMediaDisplayGroupVisible(group, [{ ...player, isPoweredOn: false }])).toBe(false);
  });

  it('does not offer players already selected by another display group', () => {
    const groups = normalizeMediaDisplayGroups([
      { id: 'living-room', data: { entityIds: [player.id] } },
      { id: 'bedroom', data: { entityIds: [] } },
    ]);

    expect(
      getAvailableMediaDisplayGroupEntityIds('bedroom', groups, [
        player.id,
        'home_assistant:media_player.bedroom',
      ])
    ).toEqual(['home_assistant:media_player.bedroom']);
  });
});
