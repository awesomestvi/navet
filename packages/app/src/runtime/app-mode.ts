import { getRuntimeContext } from '@navet/app/infrastructure/home-assistant/runtime/runtime-detector';

declare global {
  interface Window {
    __NAVET_PANEL__?: boolean;
  }
}

export function isHomeAssistantPanelMode(): boolean {
  return getRuntimeContext().kind === 'ha_panel';
}

export function isHomeAssistantAddonMode(): boolean {
  return getRuntimeContext().kind === 'ha_ingress';
}

export function isStandaloneMode(): boolean {
  return getRuntimeContext().kind === 'standalone';
}
