import {
  createPlannedProviderContract,
  createPlannedProviderContractAdapter,
} from './internal-planned-provider';

export function createHubitatProviderContract() {
  return createPlannedProviderContract('hubitat');
}

export function createHubitatContractAdapter(
  contract = createHubitatProviderContract()
) {
  return createPlannedProviderContractAdapter('hubitat', contract);
}
