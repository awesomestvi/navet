import type { NavetProviderSessionInput } from '@navet/core/provider-contract';
import type {
  ProviderContractRegistration,
  ProviderPackageRegistration,
} from '@navet/core/provider-runtime-types';
import {
  createSmartThingsContractAdapter,
  createSmartThingsProviderContract,
} from './smartthings-adapter';
import { createSmartThingsRuntimeRegistration } from './smartthings-runtime-registration';

export interface CreateSmartThingsProviderPackageRegistrationOptions {
  getSession?: () => NavetProviderSessionInput | null | undefined;
}

export function createSmartThingsProviderContractRegistration(
  options: CreateSmartThingsProviderPackageRegistrationOptions = {}
): ProviderContractRegistration {
  const contract = createSmartThingsProviderContract();

  return {
    contract,
    providerContractAdapter: createSmartThingsContractAdapter(contract, {
      getSession: options.getSession,
    }),
  };
}

export function createSmartThingsProviderPackageRegistration(
  options: CreateSmartThingsProviderPackageRegistrationOptions = {}
): ProviderPackageRegistration {
  const contractRegistration = createSmartThingsProviderContractRegistration(options);

  return {
    ...contractRegistration,
    runtimeRegistration: createSmartThingsRuntimeRegistration(contractRegistration),
  };
}
