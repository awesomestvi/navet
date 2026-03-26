import { useState } from 'react';
import type { BrightnessPresetKey } from '../../stores/light-preset-store';
import { useLightPresetStore } from '../../stores/light-preset-store';

export function useLightPresetActions(id: string) {
  const [applyBrightnessPresetsToAll, setApplyBrightnessPresetsToAll] = useState(false);
  const setBrightnessPresetValue = useLightPresetStore((state) => state.setBrightnessPresetValue);
  const setBrightnessPresetOrder = useLightPresetStore((state) => state.setBrightnessPresetOrder);

  return {
    applyBrightnessPresetsToAll,
    setApplyBrightnessPresetsToAll,
    onBrightnessPresetOrderChange: (keys: BrightnessPresetKey[]) =>
      setBrightnessPresetOrder(id, keys, applyBrightnessPresetsToAll),
    onBrightnessPresetValueChange: (key: BrightnessPresetKey, value: number) =>
      setBrightnessPresetValue(id, key, value, applyBrightnessPresetsToAll),
  };
}
