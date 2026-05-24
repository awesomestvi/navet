import { describe, expect, it } from 'vitest';
import {
  getTvRemoteCommand,
  resolveTvRemoteProfile,
  supportsTvRemotePlaybackCommand,
  type TvRemoteAction,
} from '../tv-remote-commands';

describe('getTvRemoteCommand', () => {
  it('returns Android TV Remote commands for navigation and playback', () => {
    const expectedCommands: Record<TvRemoteAction, string> = {
      up: 'DPAD_UP',
      home: 'HOME',
      left: 'DPAD_LEFT',
      select: 'DPAD_CENTER',
      right: 'DPAD_RIGHT',
      menu: 'MENU',
      down: 'DPAD_DOWN',
      back: 'BACK',
      channelUp: 'CHANNEL_UP',
      channelDown: 'CHANNEL_DOWN',
      playPause: 'MEDIA_PLAY_PAUSE',
    };

    for (const [action, command] of Object.entries(expectedCommands)) {
      expect(getTvRemoteCommand('androidtv_remote', action as TvRemoteAction)).toBe(command);
    }
  });

  it('returns Samsung TV commands for Samsung remote entities', () => {
    expect(getTvRemoteCommand('samsungtv', 'up')).toBe('KEY_UP');
    expect(getTvRemoteCommand('samsungtv', 'select')).toBe('KEY_ENTER');
    expect(getTvRemoteCommand('samsungtv', 'back')).toBe('KEY_RETURN');
    expect(getTvRemoteCommand('samsungtv', 'channelUp')).toBe('KEY_CHUP');
  });
});

describe('resolveTvRemoteProfile', () => {
  it('prefers Home Assistant registry platforms over names', () => {
    expect(
      resolveTvRemoteProfile({
        remotePlatform: 'samsungtv',
        remoteEntityId: 'remote.living_room',
        remoteFriendlyName: 'Living Room',
      })
    ).toBe('samsungtv');

    expect(
      resolveTvRemoteProfile({
        remotePlatform: 'androidtv_remote',
        remoteEntityId: 'remote.samsung_google_tv',
        remoteFriendlyName: 'Samsung Google TV',
      })
    ).toBe('androidtv_remote');
  });

  it('falls back to Android TV Remote unless only a Samsung name hint is available', () => {
    expect(resolveTvRemoteProfile({ remoteEntityId: 'remote.kitchen' })).toBe('androidtv_remote');
    expect(resolveTvRemoteProfile({ remoteEntityId: 'remote.samsung_the_frame' })).toBe(
      'samsungtv'
    );
  });
});

describe('supportsTvRemotePlaybackCommand', () => {
  it('uses remote play-pause only for profiles with a combined playback command', () => {
    expect(supportsTvRemotePlaybackCommand('androidtv_remote')).toBe(true);
    expect(supportsTvRemotePlaybackCommand('samsungtv')).toBe(false);
  });
});
