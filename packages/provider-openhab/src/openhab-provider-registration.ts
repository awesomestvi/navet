import type { NavetProviderSessionInput } from '@navet/core/provider-contract';
import type {
  ProviderContractRegistration,
  ProviderPackageRegistration,
} from '@navet/core/provider-runtime-types';
import { createOpenHABContractAdapter, createOpenHABProviderContract } from './openhab-adapter';
import { createOpenHABRuntimeRegistration } from './openhab-runtime-registration';

export interface CreateOpenHABProviderPackageRegistrationOptions {
  getSession?: () => NavetProviderSessionInput | null | undefined;
}

export function createOpenHABProviderContractRegistration(
  options: CreateOpenHABProviderPackageRegistrationOptions = {}
): ProviderContractRegistration {
  const contract = createOpenHABProviderContract();

  return {
    contract,
    providerContractAdapter: createOpenHABContractAdapter(contract, {
      getSession: options.getSession,
    }),
  };
}

export function createOpenHABProviderPackageRegistration(
  options: CreateOpenHABProviderPackageRegistrationOptions = {}
): ProviderPackageRegistration {
  const contractRegistration = createOpenHABProviderContractRegistration(options);

  return {
    ...contractRegistration,
    runtimeRegistration: createOpenHABRuntimeRegistration(contractRegistration),
  };
}
