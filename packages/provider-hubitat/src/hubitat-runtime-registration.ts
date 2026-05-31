import type { ProviderContractRegistration } from '@navet/core/provider-runtime-types';
import { createPlannedProviderRuntimeRegistration } from './planned-provider-support';

export function createHubitatRuntimeRegistration(registration: ProviderContractRegistration) {
  return createPlannedProviderRuntimeRegistration(registration);
}
