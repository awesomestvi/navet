import type { NavetProviderSessionInput } from '@navet/core/provider-contract';
import type {
  ProviderContractRegistration,
  ProviderPackageRegistration,
} from '@navet/core/provider-runtime-types';
import { createHubitatContractAdapter, createHubitatProviderContract } from './hubitat-adapter';
import { createHubitatRuntimeRegistration } from './hubitat-runtime-registration';

export interface CreateHubitatProviderPackageRegistrationOptions {
  getSession?: () => NavetProviderSessionInput | null | undefined;
}

export function createHubitatProviderContractRegistration(
  options: CreateHubitatProviderPackageRegistrationOptions = {}
): ProviderContractRegistration {
  const contract = createHubitatProviderContract();

  return {
    contract,
    providerContractAdapter: createHubitatContractAdapter(contract, {
      getSession: options.getSession,
    }),
  };
}

export function createHubitatProviderPackageRegistration(
  options: CreateHubitatProviderPackageRegistrationOptions = {}
): ProviderPackageRegistration {
  const contractRegistration = createHubitatProviderContractRegistration(options);

  return {
    ...contractRegistration,
    runtimeRegistration: createHubitatRuntimeRegistration(contractRegistration),
  };
}
