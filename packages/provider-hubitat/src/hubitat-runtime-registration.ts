import type { ProviderContractRegistration } from '@navet/core/provider-runtime-types';
import { createPlannedProviderRuntimeRegistration } from './internal-planned-provider';

export function createHubitatRuntimeRegistration(registration: ProviderContractRegistration) {
  return createPlannedProviderRuntimeRegistration(registration);
}
