export type TvRemoteAction =
  | 'up'
  | 'home'
  | 'left'
  | 'select'
  | 'right'
  | 'menu'
  | 'down'
  | 'back'
  | 'channelUp'
  | 'channelDown'
  | 'playPause';

export type TvRemoteProfile = 'androidtv_remote' | 'samsungtv';

const ANDROID_TV_REMOTE_COMMANDS: Record<TvRemoteAction, string> = {
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

const SAMSUNG_TV_REMOTE_COMMANDS: Record<TvRemoteAction, string> = {
  up: 'KEY_UP',
  home: 'KEY_HOME',
  left: 'KEY_LEFT',
  select: 'KEY_ENTER',
  right: 'KEY_RIGHT',
  menu: 'KEY_MENU',
  down: 'KEY_DOWN',
  back: 'KEY_RETURN',
  channelUp: 'KEY_CHUP',
  channelDown: 'KEY_CHDOWN',
  playPause: 'KEY_PLAY',
};

interface ResolveTvRemoteProfileParams {
  remotePlatform?: string | null;
  mediaPlatform?: string | null;
  remoteEntityId?: string;
  remoteFriendlyName?: string;
}

function normalizePlatform(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

export function resolveTvRemoteProfile({
  remotePlatform,
  mediaPlatform,
  remoteEntityId,
  remoteFriendlyName,
}: ResolveTvRemoteProfileParams): TvRemoteProfile {
  const platforms = [remotePlatform, mediaPlatform].map(normalizePlatform);

  if (platforms.includes('samsungtv')) {
    return 'samsungtv';
  }

  if (platforms.includes('androidtv_remote') || platforms.includes('androidtv')) {
    return 'androidtv_remote';
  }

  const fallbackHaystack = `${remoteEntityId ?? ''} ${remoteFriendlyName ?? ''}`.toLowerCase();
  return fallbackHaystack.includes('samsung') ? 'samsungtv' : 'androidtv_remote';
}

export function supportsTvRemotePlaybackCommand(profile: TvRemoteProfile): boolean {
  return profile === 'androidtv_remote';
}

export function getTvRemoteCommand(profile: TvRemoteProfile, action: TvRemoteAction): string {
  return profile === 'samsungtv'
    ? SAMSUNG_TV_REMOTE_COMMANDS[action]
    : ANDROID_TV_REMOTE_COMMANDS[action];
}
