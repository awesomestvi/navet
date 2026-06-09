import { getEntityTypeLabel } from '@navet/app/utils/entity-type-label';
import { describe, expect, it } from 'vitest';

describe('getEntityTypeLabel', () => {
  it('returns a formatted Home Assistant domain label for entity ids', () => {
    expect(getEntityTypeLabel('media_player.living_room_tv')).toBe('Media Player');
  });

  it('returns a formatted domain label for provider-scoped entity ids', () => {
    expect(getEntityTypeLabel('home_assistant:climate.hallway')).toBe('Climate');
    expect(getEntityTypeLabel('home_assistant:media_player.living_room_tv')).toBe('Media Player');
  });

  it('returns an empty label for provider-native ids without a domain prefix', () => {
    expect(getEntityTypeLabel('52ea53e0-bdf6-4d73-989f-110469c41efc')).toBe('');
  });
});
