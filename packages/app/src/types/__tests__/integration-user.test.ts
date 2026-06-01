import { describe, expect, it } from 'vitest';

import { fromHassUser } from '../integration-user';

describe('fromHassUser', () => {
  it('preserves a direct avatarUrl field from the Home Assistant user payload', () => {
    expect(
      fromHassUser({
        id: 'user-1',
        name: 'Vishal',
        is_admin: true,
        is_owner: false,
        avatarUrl: 'https://images.example.com/avatar.png',
      })
    ).toEqual({
      id: 'user-1',
      name: 'Vishal',
      is_admin: true,
      is_owner: false,
      avatarUrl: 'https://images.example.com/avatar.png',
    });
  });

  it('falls back to common Home Assistant avatar field aliases', () => {
    expect(
      fromHassUser({
        id: 'user-2',
        name: 'Vishal',
        avatar_url: 'https://images.example.com/avatar-url.png',
      })?.avatarUrl
    ).toBe('https://images.example.com/avatar-url.png');

    expect(
      fromHassUser({
        id: 'user-3',
        name: 'Vishal',
        picture: 'https://images.example.com/picture.png',
      })?.avatarUrl
    ).toBe('https://images.example.com/picture.png');
  });

  it('returns null when the user is missing a name', () => {
    expect(fromHassUser({ id: 'user-4', avatarUrl: 'https://images.example.com/avatar.png' })).toBe(
      null
    );
  });
});
