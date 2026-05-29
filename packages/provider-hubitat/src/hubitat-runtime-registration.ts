import type { ProviderContractRegistration } from '@navet/app/provider-registration-types';
import { createPlannedProviderRuntimeRegistration } from './internal-planned-provider';

export function createHubitatRuntimeRegistration(registration: ProviderContractRegistration) {
  return createPlannedProviderRuntimeRegistration(registration);
}
