import type { NavetProviderContract } from '@navet/app/internal/compat';
import type { ProviderContractRegistration } from '@navet/app/provider-registration-types';
import type { SmartHomeProviderAdapter } from '@navet/core/provider-contract';
import {
  createHomeAssistantContractAdapter,
  createHomeAssistantProviderContract,
} from '@navet/provider-homeassistant/homeassistant-adapter';
import {
  createHomeyContractAdapter,
  createHomeyProviderContract,
} from '@navet/provider-homey/homey-adapter';
import {
  createHubitatContractAdapter,
  createHubitatProviderContract,
} from '@navet/provider-hubitat/hubitat-adapter';
import {
  createOpenHABContractAdapter,
  createOpenHABProviderContract,
} from '@navet/provider-openhab/openhab-adapter';
import {
  createSmartThingsContractAdapter,
  createSmartThingsProviderContract,
} from '@navet/provider-smartthings/smartthings-adapter';
import type { IntegrationProviderId } from '@/app/types/provider';

const providerContractRegistrationFactories: Record<
  IntegrationProviderId,
  () => ProviderContractRegistration
> = {
  home_assistant: () => {
    const contract = createHomeAssistantProviderContract();

    return {
      contract,
      providerContractAdapter: createHomeAssistantContractAdapter(contract),
    };
  },
  homey: () => {
    const contract = createHomeyProviderContract();

    return {
      contract,
      providerContractAdapter: createHomeyContractAdapter(contract),
    };
  },
  openhab: () => {
    const contract = createOpenHABProviderContract();

    return {
      contract,
      providerContractAdapter: createOpenHABContractAdapter(contract),
    };
  },
  hubitat: () => {
    const contract = createHubitatProviderContract();

    return {
      contract,
      providerContractAdapter: createHubitatContractAdapter(contract),
    };
  },
  smartthings: () => {
    const contract = createSmartThingsProviderContract();

    return {
      contract,
      providerContractAdapter: createSmartThingsContractAdapter(contract),
    };
  },
};

var providerContractRegistrations:
  | Partial<Record<IntegrationProviderId, ProviderContractRegistration>>
  | undefined;

export function getProviderContractRegistration(
  providerId: IntegrationProviderId
): ProviderContractRegistration {
  if (!providerContractRegistrations) {
    providerContractRegistrations = {};
  }

  const existing = providerContractRegistrations[providerId];
  if (existing) {
    return existing;
  }

  const registration = providerContractRegistrationFactories[providerId]();
  providerContractRegistrations[providerId] = registration;
  return registration;
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
