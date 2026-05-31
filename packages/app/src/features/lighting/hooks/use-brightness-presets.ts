import { BRIGHTNESS_PRESET_DEFINITIONS } from '@navet/app/constants/light-constants';
import { useMemo } from 'react';
import { useLightPresetStore } from '../stores/light-preset-store';

export const useBrightnessPresets = (lightId: string) => {
  const globalBrightnessPresetOrder = useLightPresetStore(
    (state) => state.globalBrightnessPresetOrder
  );
  const globalBrightnessPresetValues = useLightPresetStore(
    (state) => state.globalBrightnessPresetValues
  );
  const lightPresetConfig = useLightPresetStore((state) => state.lightPresetConfigs[lightId]);

  return useMemo(() => {
    const brightnessPresetOrder = Array.isArray(lightPresetConfig?.brightnessPresetOrder)
      ? lightPresetConfig.brightnessPresetOrder
      : globalBrightnessPresetOrder;
    const brightnessPresetValues = {
      ...globalBrightnessPresetValues,
      ...(lightPresetConfig?.brightnessPresetValues ?? {}),
    };

    const presetsByKey = new Map(
      BRIGHTNESS_PRESET_DEFINITIONS.map((preset) => [
        preset.key,
        {
          icon: preset.icon,
          brightness: brightnessPresetValues[preset.key] ?? preset.defaultBrightness,
          key: preset.key,
          label: preset.label,
        },
      ])
    );

    const orderedPresets = brightnessPresetOrder
      .map((key) => presetsByKey.get(key))
      .filter((preset): preset is NonNullable<typeof preset> => Boolean(preset));

    const missingPresets = BRIGHTNESS_PRESET_DEFINITIONS.filter(
      (preset) => !brightnessPresetOrder.includes(preset.key)
    ).map((preset) => ({
      icon: preset.icon,
      brightness: brightnessPresetValues[preset.key] ?? preset.defaultBrightness,
      key: preset.key,
      label: preset.label,
    }));

    return [...orderedPresets, ...missingPresets];
  }, [
    globalBrightnessPresetOrder,
    globalBrightnessPresetValues,
    lightPresetConfig?.brightnessPresetOrder,
    lightPresetConfig?.brightnessPresetValues,
  ]);
};
