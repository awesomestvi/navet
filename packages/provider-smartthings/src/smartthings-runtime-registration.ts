import type { ProviderContractRegistration } from '@navet/core/provider-runtime-types';
import { createPlannedProviderRuntimeRegistration } from './planned-provider-support';

export function createSmartThingsRuntimeRegistration(registration: ProviderContractRegistration) {
  return createPlannedProviderRuntimeRegistration(registration);
}
