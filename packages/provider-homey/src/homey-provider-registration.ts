import type { NavetProviderSessionInput } from '@navet/core/provider-contract';
import type {
  ProviderContractRegistration,
  ProviderPackageRegistration,
} from '@navet/core/provider-runtime-types';
import { createHomeyContractAdapter, createHomeyProviderContract } from './homey-adapter';
import { configureHomeyBridge, type HomeyBridge } from './homey-bridge';
import { createHomeyRuntimeRegistration } from './homey-runtime-registration';

export interface HomeyProviderDependencies {
  ensureHomeyApiClientConfigured: () => void;
  homeyService: {
    getSnapshot: HomeyBridge['getSnapshot'];
    loadSnapshot: HomeyBridge['loadSnapshot'];
    replaceSnapshot: HomeyBridge['replaceSnapshot'];
    resetSnapshot: HomeyBridge['resetSnapshot'];
    subscribe: (listener: () => void) => () => void;
    callService: HomeyBridge['callService'];
    executeCommand: HomeyBridge['executeCommand'];
  };
  entityRuntimeService: HomeyBridge['entityRuntimeService'];
}

function createHomeyBridgeFromDependencies(dependencies: HomeyProviderDependencies): HomeyBridge {
  return {
    ensureConfigured: dependencies.ensureHomeyApiClientConfigured,
    getSnapshot: () => dependencies.homeyService.getSnapshot(),
    loadSnapshot: () => dependencies.homeyService.loadSnapshot(),
    replaceSnapshot: (snapshot) => dependencies.homeyService.replaceSnapshot(snapshot),
    resetSnapshot: () => dependencies.homeyService.resetSnapshot(),
    subscribe: (listener) => dependencies.homeyService.subscribe(() => listener()),
    callService: (domain, service, serviceData, target) =>
      dependencies.homeyService.callService(domain, service, serviceData, target),
    executeCommand: (entity, command) => dependencies.homeyService.executeCommand(entity, command),
    entityRuntimeService: dependencies.entityRuntimeService,
  };
}

export interface CreateHomeyProviderPackageRegistrationOptions {
  bridge?: HomeyBridge;
  dependencies?: HomeyProviderDependencies;
  getSession?: () => NavetProviderSessionInput | null | undefined;
}

export function createHomeyProviderContractRegistration(
  options: CreateHomeyProviderPackageRegistrationOptions = {}
): ProviderContractRegistration {
  if (options.dependencies) {
    configureHomeyBridge(createHomeyBridgeFromDependencies(options.dependencies));
  } else if (options.bridge) {
    configureHomeyBridge(options.bridge);
  }

  const contract = createHomeyProviderContract();

  return {
    contract,
    providerContractAdapter: createHomeyContractAdapter(contract, {
      getSession: options.getSession,
    }),
  };
}

export function createHomeyProviderPackageRegistration(
  options: CreateHomeyProviderPackageRegistrationOptions = {}
): ProviderPackageRegistration {
  const contractRegistration = createHomeyProviderContractRegistration(options);

  return {
    ...contractRegistration,
    runtimeRegistration: createHomeyRuntimeRegistration(contractRegistration, () => {
      const session = options.getSession?.();
      const user = session?.user as { name?: string; email?: string } | undefined;
      const homeys = session?.availableHomeys as { id: string; name: string }[] | undefined;
      return {
        profile: user?.name ? { name: user.name, email: user.email } : undefined,
        installations: (homeys ?? []).map((homey) => ({
          id: `homey:${homey.id}`,
          name: homey.name,
          current: homey.id === session?.selectedHomeyId,
          available: true,
        })),
      };
    }),
  };
}
