import type { NavetProviderContract } from '@navet/app/internal/compat';
import type { SmartHomeProviderAdapter } from './core/provider-contract';

export interface ProviderContractRegistration {
  contract: NavetProviderContract;
  providerContractAdapter: SmartHomeProviderAdapter;
}
