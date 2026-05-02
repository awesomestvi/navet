import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  BRIGHTNESS_PRESET_DEFINITIONS,
  type BrightnessPresetKey,
} from '@/app/constants/light-constants';

export type { BrightnessPresetKey } from '@/app/constants/light-constants';

type BrightnessPresetValues = Record<BrightnessPresetKey, number>;

interface LightPresetConfig {
  brightnessPresetOrder?: BrightnessPresetKey[];
  brightnessPresetValues?: Partial<BrightnessPresetValues>;
}

interface LightPresetState {
  globalBrightnessPresetValues: BrightnessPresetValues;
  globalBrightnessPresetOrder: BrightnessPresetKey[];
  lightPresetConfigs: Record<string, LightPresetConfig>;
  replacePresetState: (state: {
    globalBrightnessPresetValues: BrightnessPresetValues;
    globalBrightnessPresetOrder: BrightnessPresetKey[];
    lightPresetConfigs: Record<string, LightPresetConfig>;
  }) => void;
  setBrightnessPresetValue: (
    lightId: string,
    key: BrightnessPresetKey,
    value: number,
    applyToAll?: boolean
  ) => void;
  setBrightnessPresetOrder: (
    lightId: string,
    order: BrightnessPresetKey[],
    applyToAll?: boolean
  ) => void;
  getResolvedPresetConfig: (lightId: string) => {
    brightnessPresetOrder: BrightnessPresetKey[];
    brightnessPresetValues: BrightnessPresetValues;
  };
  resetBrightnessPresetValues: () => void;
}

interface LegacyLightPresetState {
  brightnessPresetOrder?: unknown;
  brightnessPresetValues?: unknown;
}

const defaultBrightnessPresetValues = BRIGHTNESS_PRESET_DEFINITIONS.reduce<BrightnessPresetValues>(
  (result, preset) => {
    result[preset.key] = preset.defaultBrightness;
    return result;
  },
  {} as BrightnessPresetValues
);
const defaultBrightnessPresetOrder = BRIGHTNESS_PRESET_DEFINITIONS.map((preset) => preset.key);
const presetKeySet = new Set<BrightnessPresetKey>(defaultBrightnessPresetOrder);

const normalizePresetOrder = (value: unknown): BrightnessPresetKey[] => {
  if (!Array.isArray(value)) {
    return defaultBrightnessPresetOrder;
  }

  const validKeys = value.filter(
    (item): item is BrightnessPresetKey =>
      typeof item === 'string' && presetKeySet.has(item as BrightnessPresetKey)
  );

  const missingKeys = defaultBrightnessPresetOrder.filter((key) => !validKeys.includes(key));
  return [...validKeys, ...missingKeys];
};

const normalizePresetValues = (value: unknown): BrightnessPresetValues => {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Partial<Record<BrightnessPresetKey, unknown>>)
      : {};

  return BRIGHTNESS_PRESET_DEFINITIONS.reduce<BrightnessPresetValues>((result, preset) => {
    const rawValue = source[preset.key];
    const parsedValue =
      typeof rawValue === 'number'
        ? rawValue
        : typeof rawValue === 'string'
          ? Number.parseFloat(rawValue)
          : Number.NaN;

    result[preset.key] = Number.isFinite(parsedValue)
      ? Math.max(1, Math.min(100, Math.round(parsedValue)))
      : preset.defaultBrightness;
    return result;
  }, {} as BrightnessPresetValues);
};

const normalizeLightPresetConfigs = (value: unknown): Record<string, LightPresetConfig> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, LightPresetConfig>>(
    (result, [lightId, config]) => {
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return result;
      }

      const typedConfig = config as {
        brightnessPresetOrder?: unknown;
        brightnessPresetValues?: unknown;
      };

      result[lightId] = {
        brightnessPresetOrder: normalizePresetOrder(typedConfig.brightnessPresetOrder),
        brightnessPresetValues: normalizePresetValues(typedConfig.brightnessPresetValues),
      };
      return result;
    },
    {}
  );
};

export const useLightPresetStore = create<LightPresetState>()(
  persist(
    (set, get) => ({
      globalBrightnessPresetValues: defaultBrightnessPresetValues,
      globalBrightnessPresetOrder: defaultBrightnessPresetOrder,
      lightPresetConfigs: {},
      replacePresetState: ({
        globalBrightnessPresetValues,
        globalBrightnessPresetOrder,
        lightPresetConfigs,
      }) =>
        set({
          globalBrightnessPresetValues,
          globalBrightnessPresetOrder,
          lightPresetConfigs,
        }),
      setBrightnessPresetValue: (lightId, key, value, applyToAll = false) =>
        set((state) => {
          const normalizedValue = Math.max(1, Math.min(100, Math.round(value)));
          if (applyToAll) {
            return {
              globalBrightnessPresetValues: {
                ...state.globalBrightnessPresetValues,
                [key]: normalizedValue,
              },
            };
          }

          return {
            lightPresetConfigs: {
              ...state.lightPresetConfigs,
              [lightId]: {
                ...state.lightPresetConfigs[lightId],
                brightnessPresetValues: {
                  ...state.lightPresetConfigs[lightId]?.brightnessPresetValues,
                  [key]: normalizedValue,
                },
              },
            },
          };
        }),
      setBrightnessPresetOrder: (lightId, order, applyToAll = false) =>
        set((state) => {
          if (applyToAll) {
            return {
              globalBrightnessPresetOrder: order,
            };
          }

          return {
            lightPresetConfigs: {
              ...state.lightPresetConfigs,
              [lightId]: {
                ...state.lightPresetConfigs[lightId],
                brightnessPresetOrder: order,
              },
            },
          };
        }),
      getResolvedPresetConfig: (lightId) => {
        const state = get();
        const lightConfig = state.lightPresetConfigs[lightId];
        return {
          brightnessPresetOrder:
            lightConfig?.brightnessPresetOrder ?? state.globalBrightnessPresetOrder,
          brightnessPresetValues: {
            ...state.globalBrightnessPresetValues,
            ...lightConfig?.brightnessPresetValues,
          },
        };
      },
      resetBrightnessPresetValues: () =>
        set({
          globalBrightnessPresetValues: defaultBrightnessPresetValues,
          globalBrightnessPresetOrder: defaultBrightnessPresetOrder,
          lightPresetConfigs: {},
        }),
    }),
    {
      name: 'ha-dashboard-light-preset-settings',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<LightPresetState> & LegacyLightPresetState;
        return {
          globalBrightnessPresetValues: normalizePresetValues(
            state.globalBrightnessPresetValues ?? state.brightnessPresetValues
          ),
          globalBrightnessPresetOrder: normalizePresetOrder(
            state.globalBrightnessPresetOrder ?? state.brightnessPresetOrder
          ),
          lightPresetConfigs: normalizeLightPresetConfigs(state.lightPresetConfigs),
        };
      },
    }
  )
);
