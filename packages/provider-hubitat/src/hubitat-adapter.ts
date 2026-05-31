import {
  createPlannedProviderContract,
  createPlannedProviderContractAdapter,
} from './planned-provider-support';

export function createHubitatProviderContract() {
  return createPlannedProviderContract('hubitat');
}

export function createHubitatContractAdapter(
  contract = createHubitatProviderContract(),
  options: Parameters<typeof createPlannedProviderContractAdapter>[2] = {}
) {
  return createPlannedProviderContractAdapter('hubitat', contract, options);
}
