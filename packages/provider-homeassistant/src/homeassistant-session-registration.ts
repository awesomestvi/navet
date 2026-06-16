import type { IntegrationSessionRuntimeRegistration } from '@navet/core/session-runtime-types';
import {
  configureHomeAssistantSessionBridge,
  type HomeAssistantSessionRuntimeBridge,
} from './homeassistant-session-bridge';
import { createHomeAssistantSessionRuntimeRegistration } from './homeassistant-session-runtime';

export interface CreateHomeAssistantSessionRegistrationOptions {
  bridge: HomeAssistantSessionRuntimeBridge;
}

export function createHomeAssistantSessionRegistration(
  options: CreateHomeAssistantSessionRegistrationOptions
): IntegrationSessionRuntimeRegistration {
  configureHomeAssistantSessionBridge(options.bridge);
  return createHomeAssistantSessionRuntimeRegistration();
}
