import {
  augmentConfigWithLivePowerEntities,
  getEnergyPrefs,
  type HaEnergyEntityMap,
  type HaEnergyEntityRegistryEntry,
  mapPrefsToConfig,
} from '@/app/features/energy/services/energy-ha-service';
import type { EnergySourceConfig } from '@/app/features/energy/types/energy.types';
import type { PlatformMessageClient } from '@/app/platform/provider-feature-models';
import type { ProviderEnergyFeatureService } from '@/app/platform/provider-feature-services';

export const homeAssistantEnergyFeatureService: ProviderEnergyFeatureService = {
  async getSourceConfig(messageClient: PlatformMessageClient): Promise<EnergySourceConfig> {
    const prefs = await getEnergyPrefs(messageClient);
    return mapPrefsToConfig(prefs);
  },

  augmentSourceConfig(
    config: EnergySourceConfig,
    entities: HaEnergyEntityMap,
    entityRegistry: HaEnergyEntityRegistryEntry[] = []
  ): EnergySourceConfig {
    return augmentConfigWithLivePowerEntities(config, entities, entityRegistry);
  },
};
