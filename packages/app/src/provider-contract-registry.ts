import { integrationSessionRuntime } from '@navet/app/integration-session-runtime';
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
import { configureAppProviderBridges } from './infrastructure/provider-bridge-config';
import type { NavetProviderContract } from './provider-contract';
import type { IntegrationProviderId } from './types/provider';

function getProviderSession(providerId: IntegrationProviderId) {
  return integrationSessionRuntime.getSnapshot().sessions[providerId];
}

function configureProviderBridges() {
  configureAppProviderBridges();
}

const providerContractRegistrationFactories: Record<
  IntegrationProviderId,
  () => ProviderContractRegistration
> = {
  home_assistant: () => {
    configureProviderBridges();
    const contract = createHomeAssistantProviderContract();

    return {
      contract,
      providerContractAdapter: createHomeAssistantContractAdapter(contract, {
        getSession: () => getProviderSession('home_assistant'),
      }),
    };
  },
  homey: () => {
    configureProviderBridges();
    const contract = createHomeyProviderContract();

    return {
      contract,
      providerContractAdapter: createHomeyContractAdapter(contract, {
        getSession: () => getProviderSession('homey'),
      }),
    };
  },
  openhab: () => {
    const contract = createOpenHABProviderContract();

    return {
      contract,
      providerContractAdapter: createOpenHABContractAdapter(contract, {
        getSession: () => getProviderSession('openhab'),
      }),
    };
  },
  hubitat: () => {
    const contract = createHubitatProviderContract();

    return {
      contract,
      providerContractAdapter: createHubitatContractAdapter(contract, {
        getSession: () => getProviderSession('hubitat'),
      }),
    };
  },
  smartthings: () => {
    const contract = createSmartThingsProviderContract();

    return {
      contract,
      providerContractAdapter: createSmartThingsContractAdapter(contract, {
        getSession: () => getProviderSession('smartthings'),
      }),
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
