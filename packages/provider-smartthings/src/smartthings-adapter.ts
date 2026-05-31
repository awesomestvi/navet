import {
  createPlannedProviderContract,
  createPlannedProviderContractAdapter,
} from './internal-planned-provider';

export function createSmartThingsProviderContract() {
  return createPlannedProviderContract('smartthings');
}

export function createSmartThingsContractAdapter(
  contract = createSmartThingsProviderContract(),
  options: Parameters<typeof createPlannedProviderContractAdapter>[2] = {}
) {
  return createPlannedProviderContractAdapter('smartthings', contract, options);
}
