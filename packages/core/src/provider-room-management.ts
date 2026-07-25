import { createProviderScopedId, parseProviderScopedId } from './ids';
import type { IntegrationProviderId } from './integration-providers';
import type {
  PlatformRoomMutationPlan,
  PlatformRoomMutationStep,
  PlatformRoomReference,
  ProviderRoomManagementCapabilities,
} from './provider-feature-models';

type ProviderRoomManagementCapabilityOverrides = Partial<
  Omit<ProviderRoomManagementCapabilities, 'providerId'>
>;

export function createProviderRoomManagementCapabilities(
  providerId: IntegrationProviderId,
  overrides: ProviderRoomManagementCapabilityOverrides = {}
): ProviderRoomManagementCapabilities {
  return {
    providerId,
    discover: false,
    create: false,
    rename: false,
    assign: false,
    unassign: false,
    delete: false,
    ...overrides,
  };
}

export function createPlatformRoomReference(
  providerId: IntegrationProviderId,
  nativeId: string,
  name: string
): PlatformRoomReference {
  return {
    id: createProviderScopedId(providerId, nativeId),
    name,
    providerId,
  };
}

export function parsePlatformRoomReference(
  roomId: string
): { providerId: IntegrationProviderId; nativeId: string } | null {
  return parseProviderScopedId(roomId);
}

function clonePlatformRoomMutationStep(step: PlatformRoomMutationStep): PlatformRoomMutationStep {
  const stepId = step.stepId.trim();
  const dependsOn = step.dependsOn?.map((dependencyId) => dependencyId.trim());

  switch (step.operation) {
    case 'create':
      return { ...step, stepId, name: step.name.trim(), dependsOn };
    case 'rename':
      return { ...step, stepId, name: step.name.trim(), dependsOn };
    case 'assign':
    case 'unassign':
    case 'delete':
      return { ...step, stepId, dependsOn };
  }
}

export function createPlatformRoomMutationPlan(
  providerId: IntegrationProviderId,
  steps: PlatformRoomMutationStep[]
): PlatformRoomMutationPlan {
  if (steps.length === 0) {
    throw new Error('Room mutation plan requires at least one step');
  }

  const precedingStepIds = new Set<string>();

  for (const step of steps) {
    const stepId = step.stepId.trim();
    if (!stepId) {
      throw new Error('Room mutation step id is required');
    }
    if (precedingStepIds.has(stepId)) {
      throw new Error(`Room mutation step id must be unique: ${stepId}`);
    }
    if ('name' in step && !step.name.trim()) {
      throw new Error(`Room mutation ${step.operation} name is required`);
    }

    const normalizedDependencies = (step.dependsOn ?? []).map((dependencyId) =>
      dependencyId.trim()
    );
    if (normalizedDependencies.some((dependencyId) => !dependencyId)) {
      throw new Error(`Room mutation step ${stepId} has an empty dependency id`);
    }
    const dependencies = new Set(normalizedDependencies);
    if (dependencies.size !== normalizedDependencies.length) {
      throw new Error(`Room mutation step ${stepId} has duplicate dependencies`);
    }
    for (const dependencyId of dependencies) {
      if (!precedingStepIds.has(dependencyId)) {
        throw new Error(
          `Room mutation step ${stepId} depends on a missing or later step: ${dependencyId}`
        );
      }
    }

    precedingStepIds.add(stepId);
  }

  return {
    providerId,
    steps: steps.map(clonePlatformRoomMutationStep),
  };
}
