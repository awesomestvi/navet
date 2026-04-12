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
  | 'channelDown';

type TvRemoteProfile = 'samsung' | 'default';

const SAMSUNG_COMMANDS: Record<TvRemoteAction, string> = {
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
};

const DEFAULT_COMMANDS: Record<TvRemoteAction, string> = {
  up: 'up',
  home: 'home',
  left: 'left',
  select: 'select',
  right: 'right',
  menu: 'menu',
  down: 'down',
  back: 'back',
  channelUp: 'channel_up',
  channelDown: 'channel_down',
};

function isSamsungRemote(remoteEntityId: string, friendlyName?: string): boolean {
  const haystack = `${remoteEntityId} ${friendlyName ?? ''}`.toLowerCase();
  return haystack.includes('samsung');
}

export function getTvRemoteProfile(remoteEntityId: string, friendlyName?: string): TvRemoteProfile {
  return isSamsungRemote(remoteEntityId, friendlyName) ? 'samsung' : 'default';
}

export function getTvRemoteCommand(
  profile: TvRemoteProfile,
  action: TvRemoteAction
): string | string[] {
  return profile === 'samsung' ? SAMSUNG_COMMANDS[action] : DEFAULT_COMMANDS[action];
}
