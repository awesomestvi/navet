import { createHomeAssistantSessionRuntimeRegistration } from '@navet/provider-homeassistant/homeassistant-session-runtime';
import type { IntegrationSessionRuntimeRegistration } from './session-runtime-types';

let registration: IntegrationSessionRuntimeRegistration | null = null;

export function getIntegrationSessionRuntimeRegistration(): IntegrationSessionRuntimeRegistration {
  if (registration) {
    return registration;
  }

  registration = createHomeAssistantSessionRuntimeRegistration();
  return registration;
}
