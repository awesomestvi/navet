import type { ProviderContractRegistration } from '@navet/app/provider-registration-types';
import type { SmartHomeProviderAdapter } from '@navet/core/provider-contract';
import type { NavetProviderContract } from './provider-contract';
import { getProviderPackageRegistration } from './provider-package-registry';
import type { IntegrationProviderId } from './types/provider';

export function getProviderContractRegistration(
  providerId: IntegrationProviderId
): ProviderContractRegistration {
  return getProviderPackageRegistration(providerId);
}

export function getRegisteredProviderContract(
  providerId: IntegrationProviderId
): NavetProviderContract {
  return getProviderContractRegistration(providerId).contract;
}

export function getRegisteredSmartHomeProviderAdapter(
  providerId: IntegrationProviderId
): SmartHomeProviderAdapter {
  return getProviderContractRegistration(providerId).providerContractAdapter;
}
