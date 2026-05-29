import { homeAssistantService } from '@/app/services/home-assistant.service';
import type { HomeAssistantPanelHass } from '@/app/services/home-assistant-panel-adapter';

export type { HomeAssistantPanelHass };

export function callHomeAssistantService(
  domain: string,
  service: string,
  serviceData: Record<string, unknown> = {},
  target?:
    | {
        entity_id?: string | string[];
        area_id?: string | string[];
        device_id?: string | string[];
      }
    | undefined
) {
  return homeAssistantService.callService(domain, service, serviceData, target);
}

export function signHomeAssistantPath(path: string, expiresSeconds?: number) {
  return homeAssistantService.signPath(path, expiresSeconds);
}

export function getHomeAssistantCameraStreamUrl(entityId: string, format: 'hls' | 'web_rtc') {
  return homeAssistantService.getCameraStreamUrl(entityId, format);
}

export function addHomeAssistantListener(
  event: 'entities' | 'registries' | 'connection',
  listener: () => void
) {
  return homeAssistantService.addListener(event, listener);
}

export function isHomeAssistantConnected() {
  return homeAssistantService.isConnected();
}

export function getHomeAssistantPanelHass() {
  return homeAssistantService.getPanelHass();
}
