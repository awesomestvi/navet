import {
  createPlannedProviderContract,
  createPlannedProviderContractAdapter,
} from './internal-planned-provider';

export function createSmartThingsProviderContract() {
  return createPlannedProviderContract('smartthings');
}

export function createSmartThingsContractAdapter(
  contract = createSmartThingsProviderContract()
) {
  return createPlannedProviderContractAdapter('smartthings', contract);
}
