import type {
  IntegrationProviderFeature,
  IntegrationProviderFeatureMatrix,
} from '@navet/app/provider-runtime-types';
import { expect } from 'vitest';
import type { IntegrationProviderAdapter } from '@/app/services/integration-registry.service';
import { hasIntegrationProviderFeature } from '@/app/services/integration-registry.service';

export function expectProviderFeatureMatrixSubset(
  matrix: IntegrationProviderFeatureMatrix,
  expected: Partial<IntegrationProviderFeatureMatrix>
) {
  expect(matrix).toMatchObject(expected);
}

export function expectProviderFeatureClaims(
  adapter: IntegrationProviderAdapter,
  expected: {
    supported?: IntegrationProviderFeature[];
    unsupported?: IntegrationProviderFeature[];
  }
) {
  for (const feature of expected.supported ?? []) {
    expect(hasIntegrationProviderFeature(adapter, feature)).toBe(true);
  }

  for (const feature of expected.unsupported ?? []) {
    expect(hasIntegrationProviderFeature(adapter, feature)).toBe(false);
  }
}
