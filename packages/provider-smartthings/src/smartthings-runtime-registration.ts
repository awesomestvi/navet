import type { ProviderContractRegistration } from '@navet/app/provider-registration-types';
import { createPlannedProviderRuntimeRegistration } from './internal-planned-provider';

export function createSmartThingsRuntimeRegistration(registration: ProviderContractRegistration) {
  return createPlannedProviderRuntimeRegistration(registration);
}
