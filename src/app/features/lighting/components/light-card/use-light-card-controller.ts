import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { type CardSize, isExtraSmallCardSize } from '@/app/components/shared/card-size-selector';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import {
  DEFAULT_LIGHT_ICON,
  isEmojiLightIcon,
  normalizeLightIconName,
  resolveLightIconComponent,
} from '@/app/constants/icon-map';
import { TEMP_OPTIONS } from '@/app/constants/light-constants';
import { useHaCommandQueue, useHomeAssistant, useI18n } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { useBrightnessPresets } from '../../hooks/use-brightness-presets';
import { useLightMemoryStore } from '../../stores/light-memory-store';
import { type BrightnessPresetKey, useLightPresetStore } from '../../stores/light-preset-store';
import type { HeaderIconButtonProps, LightBrightnessPreset } from './light-card-types';
import {
  clampKelvin,
  clampPercentage,
  getBrightnessPercent,
  getReportedColorHex,
  getReportedColorTempKelvin,
  getSupportedColorTemperatureRange,
  roundKelvin,
  supportsColorSelection,
  supportsColorTemperatureControl,
} from './light-card-utils';

interface LightCardControllerParams {
  id: string;
  name: string;
  room: string;
  initialState: boolean;
  initialBrightness: number;
  initialTemp: number;
  size: CardSize;
  isEditMode: boolean;
}

export interface LightCardController {
  applyBrightnessPresetsToAll: boolean;
  brightness: number;
  brightnessPresets: LightBrightnessPreset[];
  cardInteraction: ReturnType<typeof useEntityCardInteractionController>;
  colorTemp: number;
  currentColor: string;
  customColor: string;
  iconButtonProps: HeaderIconButtonProps;
  IconComponent: LucideIcon | null;
  iconText: string | null;
  isOn: boolean;
  isOpen: boolean;
  maxColorTemp: number;
  minColorTemp: number;
  padding: string;
  selectedColor: string | null;
  selectedIcon: string;
  settingsButtonProps: HeaderIconButtonProps;
  showPresetOverflow: boolean;
  showSettingsButton: boolean;
  supportsColorControl: boolean;
  supportsColorTemperature: boolean;
  tempOptions: Array<{ value: number; color: string; label: string }>;
  onApplyBrightnessPresetsToAllChange: (applyToAll: boolean) => void;
  onBrightnessChange: (value: number) => void;
  onBrightnessCommit: (value: number) => void;
  onBrightnessPresetOrderChange: (keys: BrightnessPresetKey[]) => void;
  onBrightnessPresetValueChange: (key: BrightnessPresetKey, value: number) => void;
  onColorChange: (color: string) => void;
  onCustomColorChange: (color: string) => void;
  onIconChange: (icon: string) => void;
  onOpenChange: (open: boolean) => void;
  onTempChange: (temp: number) => void;
  onTempCommit: (temp: number) => void;
}

export function useLightCardController({
  id,
  name,
  room: _room,
  initialState,
  initialBrightness,
  initialTemp,
  size,
  isEditMode,
}: LightCardControllerParams): LightCardController {
  const [isOn, setIsOn] = useState(initialState);
  const [brightness, setBrightness] = useState(initialBrightness);
  const [isAdjustingBrightness, setIsAdjustingBrightness] = useState(false);
  const [colorTemp, setColorTemp] = useState(roundKelvin(initialTemp));
  const [isAdjustingTemp, setIsAdjustingTemp] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState('#FFA500');
  const [isOpen, setIsOpen] = useState(false);
  const [applyBrightnessPresetsToAll, setApplyBrightnessPresetsToAll] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('');
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  // Per-entity selector: only re-renders this card when its own entity changes.
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const { t } = useI18n();
  const brightnessPresets = useBrightnessPresets(id);
  const rememberLightState = useLightMemoryStore((state) => state.rememberState);
  const setBrightnessPresetValue = useLightPresetStore((state) => state.setBrightnessPresetValue);
  const setBrightnessPresetOrder = useLightPresetStore((state) => state.setBrightnessPresetOrder);
  const rememberedLightState = useLightMemoryStore.getState().getRememberedState(id);
  const lastBrightnessRef = useRef(
    rememberedLightState?.brightness ?? (initialBrightness > 0 ? initialBrightness : 100)
  );
  const lastColorTempRef = useRef(rememberedLightState?.colorTemp ?? roundKelvin(initialTemp));
  const pendingBrightnessRef = useRef<number | null>(null);
  const brightnessSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTempRef = useRef<number | null>(null);
  const tempSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKnownColorRef = useRef<string | null>(null);

  const effectiveSelectedColor = selectedColor ?? (isOn ? lastKnownColorRef.current : null);
  const normalizedSelectedIcon = normalizeLightIconName(selectedIcon);
  const customIconComponent = normalizedSelectedIcon
    ? resolveLightIconComponent(normalizedSelectedIcon)
    : null;
  const iconText =
    !customIconComponent && isEmojiLightIcon(selectedIcon) ? selectedIcon.trim() : null;
  const IconComponent = iconText
    ? null
    : (customIconComponent ?? resolveLightIconComponent(DEFAULT_LIGHT_ICON));
  const isHomeAssistantLight = Boolean(connection) && id.startsWith('light.');
  const supportsColorTemperature = supportsColorTemperatureControl(liveEntity);
  const supportsColorControl = supportsColorSelection(liveEntity);
  const { max: maxColorTemp, min: minColorTemp } = getSupportedColorTemperatureRange(liveEntity);
  const tempOptions = TEMP_OPTIONS.filter(
    (option) => option.value >= minColorTemp && option.value <= maxColorTemp
  );

  const isExtraSmall = isExtraSmallCardSize(size);
  const isSmall = isExtraSmall || size === 'small';
  const padding = isExtraSmall ? 'px-3.5 pt-3 pb-4' : size === 'large' ? 'p-5' : 'p-4';

  useEffect(() => {
    if (liveEntity) {
      return;
    }
    setIsOn(initialState);
  }, [initialState, liveEntity]);

  useEffect(() => {
    if (liveEntity) {
      return;
    }
    setBrightness(initialBrightness);
    if (initialBrightness > 0) {
      lastBrightnessRef.current = initialBrightness;
      rememberLightState(id, { brightness: initialBrightness });
    }
  }, [id, initialBrightness, liveEntity, rememberLightState]);

  useEffect(() => {
    if (liveEntity) {
      return;
    }
    const nextTemp = roundKelvin(initialTemp);
    setColorTemp(nextTemp);
    lastColorTempRef.current = nextTemp;
    rememberLightState(id, { colorTemp: nextTemp });
  }, [id, initialTemp, liveEntity, rememberLightState]);

  useEffect(() => {
    if (!liveEntity) {
      return;
    }

    const nextIsOn = liveEntity.state === 'on';
    setIsOn(nextIsOn);
  }, [liveEntity]);

  useEffect(() => {
    if (!liveEntity || isAdjustingBrightness) {
      return;
    }

    const brightnessFromEntity = getBrightnessPercent(liveEntity);

    if (liveEntity.state !== 'on') {
      // Light is off — update the ref/memory so restore-on-turn-on uses the correct value.
      if (brightnessFromEntity > 0) {
        lastBrightnessRef.current = brightnessFromEntity;
        rememberLightState(id, { brightness: brightnessFromEntity });
      }
      return;
    }

    if (
      pendingBrightnessRef.current !== null &&
      Math.abs(brightnessFromEntity - pendingBrightnessRef.current) > 1
    ) {
      return;
    }

    if (pendingBrightnessRef.current !== null) {
      pendingBrightnessRef.current = null;
      if (brightnessSyncTimeoutRef.current) {
        clearTimeout(brightnessSyncTimeoutRef.current);
        brightnessSyncTimeoutRef.current = null;
      }
    }

    if (brightnessFromEntity > 0) {
      lastBrightnessRef.current = brightnessFromEntity;
      rememberLightState(id, { brightness: brightnessFromEntity });
    }

    setBrightness(brightnessFromEntity);
  }, [id, isAdjustingBrightness, liveEntity, rememberLightState]);

  useEffect(() => {
    return () => {
      if (brightnessSyncTimeoutRef.current) {
        clearTimeout(brightnessSyncTimeoutRef.current);
      }
      if (tempSyncTimeoutRef.current) {
        clearTimeout(tempSyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (liveEntity) {
      if (isAdjustingTemp) {
        return;
      }

      const entityTemp = getReportedColorTempKelvin(liveEntity);
      if (entityTemp === null) {
        return;
      }

      if (liveEntity.state !== 'on') {
        // Light is off — update the ref/memory so restore-on-turn-on uses the correct value.
        const nextTemp = clampKelvin(entityTemp, minColorTemp, maxColorTemp);
        lastColorTempRef.current = nextTemp;
        rememberLightState(id, { colorTemp: nextTemp });
        return;
      }

      if (pendingTempRef.current !== null && Math.abs(entityTemp - pendingTempRef.current) > 100) {
        return;
      }

      if (pendingTempRef.current !== null) {
        pendingTempRef.current = null;
        if (tempSyncTimeoutRef.current) {
          clearTimeout(tempSyncTimeoutRef.current);
          tempSyncTimeoutRef.current = null;
        }
      }

      const nextTemp = clampKelvin(entityTemp, minColorTemp, maxColorTemp);
      lastColorTempRef.current = nextTemp;
      rememberLightState(id, { colorTemp: nextTemp });
      setColorTemp(nextTemp);
      return;
    }

    if (isAdjustingTemp) {
      return;
    }

    if (pendingTempRef.current !== null && Math.abs(initialTemp - pendingTempRef.current) > 100) {
      return;
    }

    if (pendingTempRef.current !== null) {
      pendingTempRef.current = null;
      if (tempSyncTimeoutRef.current) {
        clearTimeout(tempSyncTimeoutRef.current);
        tempSyncTimeoutRef.current = null;
      }
    }

    const nextTemp = roundKelvin(initialTemp);
    lastColorTempRef.current = nextTemp;
    rememberLightState(id, { colorTemp: nextTemp });
    setColorTemp(nextTemp);
  }, [
    id,
    initialTemp,
    isAdjustingTemp,
    liveEntity,
    maxColorTemp,
    minColorTemp,
    rememberLightState,
  ]);

  useEffect(() => {
    if (!liveEntity || liveEntity.state !== 'on' || isAdjustingTemp) {
      return;
    }

    const reportedColor = getReportedColorHex(liveEntity);
    if (reportedColor) {
      setSelectedColor(reportedColor);
      lastKnownColorRef.current = reportedColor;
      setCustomColor(reportedColor);
    } else {
      // Light is on but in a non-color mode (e.g. color_temp) — clear the color selection
      // so the swatch doesn't show a stale color from a previous color mode.
      setSelectedColor(null);
    }
  }, [isAdjustingTemp, liveEntity]);

  const syncLightWithHomeAssistant = useCallback(
    async (options: {
      state?: 'on' | 'off';
      brightnessPct?: number;
      kelvin?: number;
      rgbColor?: [number, number, number];
      hsColor?: [number, number];
      xyColor?: [number, number];
    }) => {
      if (!isHomeAssistantLight) {
        return;
      }

      try {
        await homeAssistantService.updateLight(id, options);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('lighting.feedback.updateLightFailed')
        );
        throw error;
      }
    },
    [id, isHomeAssistantLight, t]
  );

  const { queue: queueBrightnessSync } = useHaCommandQueue((pct: number) =>
    syncLightWithHomeAssistant({ state: 'on', brightnessPct: pct })
  );

  const { queue: queueTempSync, cancel: cancelTempSync } = useHaCommandQueue((kelvin: number) =>
    syncLightWithHomeAssistant({ state: 'on', kelvin })
  );

  const hexToRgb = useCallback((hex: string): [number, number, number] | null => {
    const normalized = hex.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return null;
    }

    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ];
  }, []);

  const rgbToHs = useCallback((rgb: [number, number, number]): [number, number] => {
    const [rRaw, gRaw, bRaw] = rgb;
    const r = Math.max(0, Math.min(255, rRaw)) / 255;
    const g = Math.max(0, Math.min(255, gRaw)) / 255;
    const b = Math.max(0, Math.min(255, bRaw)) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let hue = 0;
    if (delta > 0) {
      if (max === r) {
        hue = 60 * (((g - b) / delta) % 6);
      } else if (max === g) {
        hue = 60 * ((b - r) / delta + 2);
      } else {
        hue = 60 * ((r - g) / delta + 4);
      }
    }

    if (hue < 0) {
      hue += 360;
    }

    const saturation = max === 0 ? 0 : (delta / max) * 100;
    return [Math.round(hue * 10) / 10, Math.round(saturation * 10) / 10];
  }, []);

  const rgbToXy = useCallback((rgb: [number, number, number]): [number, number] => {
    const gammaCorrect = (channel: number) => {
      const normalized = Math.max(0, Math.min(255, channel)) / 255;
      return normalized > 0.04045 ? ((normalized + 0.055) / 1.055) ** 2.4 : normalized / 12.92;
    };

    const r = gammaCorrect(rgb[0]);
    const g = gammaCorrect(rgb[1]);
    const b = gammaCorrect(rgb[2]);

    const X = r * 0.664511 + g * 0.154324 + b * 0.162028;
    const Y = r * 0.283881 + g * 0.668433 + b * 0.047685;
    const Z = r * 0.000088 + g * 0.07231 + b * 0.986039;
    const sum = X + Y + Z;

    if (sum <= 0) {
      return [0.3127, 0.329];
    }

    const x = X / sum;
    const y = Y / sum;
    return [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000];
  }, []);

  const onBrightnessChange = useCallback(
    (value: number) => {
      const nextBrightness = clampPercentage(value, 1);
      setIsAdjustingBrightness(true);
      setBrightness(nextBrightness);
      lastBrightnessRef.current = nextBrightness;
      rememberLightState(id, { brightness: nextBrightness });
      if (!isOn) {
        setIsOn(true);
        void syncLightWithHomeAssistant({ state: 'on', brightnessPct: nextBrightness }).catch(
          () => {
            setIsOn(false);
          }
        );
        return;
      }

      queueBrightnessSync(nextBrightness);
    },
    [id, isOn, queueBrightnessSync, rememberLightState, syncLightWithHomeAssistant]
  );

  const onBrightnessCommit = useCallback(
    (value: number) => {
      const nextBrightness = clampPercentage(value, 1);
      setBrightness(nextBrightness);
      lastBrightnessRef.current = nextBrightness;
      rememberLightState(id, { brightness: nextBrightness });
      setIsAdjustingBrightness(false);
      pendingBrightnessRef.current = nextBrightness;
      if (brightnessSyncTimeoutRef.current) {
        clearTimeout(brightnessSyncTimeoutRef.current);
      }
      brightnessSyncTimeoutRef.current = setTimeout(() => {
        pendingBrightnessRef.current = null;
        brightnessSyncTimeoutRef.current = null;
      }, 1500);
      if (!isOn) {
        setIsOn(true);
      }
      queueBrightnessSync(nextBrightness, true);
    },
    [id, isOn, queueBrightnessSync, rememberLightState]
  );

  const onTempChange = useCallback(
    (temp: number) => {
      const nextTemp = clampKelvin(temp, minColorTemp, maxColorTemp);
      setIsAdjustingTemp(true);
      setColorTemp(nextTemp);
      lastColorTempRef.current = nextTemp;
      rememberLightState(id, { colorTemp: nextTemp });
      setSelectedColor(null);
      lastKnownColorRef.current = null;
      if (!isOn) {
        setIsOn(true);
      }
      queueTempSync(nextTemp);
    },
    [id, isOn, maxColorTemp, minColorTemp, queueTempSync, rememberLightState]
  );

  const onTempCommit = useCallback(
    (temp: number) => {
      const nextTemp = clampKelvin(temp, minColorTemp, maxColorTemp);
      setColorTemp(nextTemp);
      lastColorTempRef.current = nextTemp;
      rememberLightState(id, { colorTemp: nextTemp });
      setIsAdjustingTemp(false);
      pendingTempRef.current = nextTemp;
      if (tempSyncTimeoutRef.current) {
        clearTimeout(tempSyncTimeoutRef.current);
      }
      tempSyncTimeoutRef.current = setTimeout(() => {
        pendingTempRef.current = null;
        tempSyncTimeoutRef.current = null;
      }, 1500);
      setSelectedColor(null);
      lastKnownColorRef.current = null;
      if (!isOn) {
        setIsOn(true);
      }
      queueTempSync(nextTemp, true);
    },
    [id, isOn, maxColorTemp, minColorTemp, queueTempSync, rememberLightState]
  );

  const onColorChange = useCallback(
    (color: string) => {
      // Cancel any queued kelvin sync — otherwise it fires after the color change and overrides it.
      cancelTempSync();

      setSelectedColor(color);
      lastKnownColorRef.current = color;
      if (!isOn) {
        setIsOn(true);
      }

      const rgbColor = hexToRgb(color);
      if (rgbColor) {
        const hsColor = rgbToHs(rgbColor);
        const xyColor = rgbToXy(rgbColor);
        const supportedModes = Array.isArray(liveEntity?.attributes?.supported_color_modes)
          ? liveEntity.attributes.supported_color_modes.filter(
              (mode): mode is string => typeof mode === 'string'
            )
          : typeof liveEntity?.attributes?.color_mode === 'string'
            ? [liveEntity.attributes.color_mode]
            : [];

        const activeMode =
          typeof liveEntity?.attributes?.color_mode === 'string'
            ? liveEntity.attributes.color_mode
            : null;

        const supportsRgb = supportedModes.some((mode) => ['rgb', 'rgbw', 'rgbww'].includes(mode));
        const supportsHs = supportedModes.includes('hs');
        const supportsXy = supportedModes.includes('xy');

        const preferredColorPayload: {
          rgbColor?: [number, number, number];
          hsColor?: [number, number];
          xyColor?: [number, number];
        } =
          activeMode === 'xy' && supportsXy
            ? { xyColor }
            : activeMode === 'hs' && supportsHs
              ? { hsColor }
              : ['rgb', 'rgbw', 'rgbww'].includes(activeMode ?? '') && supportsRgb
                ? { rgbColor }
                : supportsXy
                  ? { xyColor }
                  : supportsHs
                    ? { hsColor }
                    : { rgbColor };

        const turnOnBrightness = !isOn
          ? Math.max(1, Math.round(lastBrightnessRef.current || brightness || 100))
          : undefined;

        void syncLightWithHomeAssistant({
          state: 'on',
          brightnessPct: turnOnBrightness,
          ...preferredColorPayload,
        });
      }
    },
    [
      brightness,
      cancelTempSync,
      hexToRgb,
      isOn,
      liveEntity,
      rgbToHs,
      rgbToXy,
      syncLightWithHomeAssistant,
    ]
  );

  const toggleLightState = useCallback(
    (nextIsOn: boolean) => {
      const latestRememberedState = useLightMemoryStore.getState().getRememberedState(id);
      const brightnessToRestore =
        latestRememberedState?.brightness !== undefined
          ? clampPercentage(latestRememberedState.brightness, 1)
          : brightness > 0
            ? brightness
            : Math.max(1, Math.round(lastBrightnessRef.current));
      const colorTempToRestore = clampKelvin(lastColorTempRef.current, minColorTemp, maxColorTemp);
      const rememberedColorTemp =
        latestRememberedState?.colorTemp !== undefined
          ? clampKelvin(latestRememberedState.colorTemp, minColorTemp, maxColorTemp)
          : colorTempToRestore;

      setIsOn(nextIsOn);
      if (nextIsOn) {
        setBrightness(brightnessToRestore);
        setColorTemp(rememberedColorTemp);
        pendingBrightnessRef.current = brightnessToRestore;
        pendingTempRef.current = rememberedColorTemp;
        if (brightnessSyncTimeoutRef.current) {
          clearTimeout(brightnessSyncTimeoutRef.current);
        }
        if (tempSyncTimeoutRef.current) {
          clearTimeout(tempSyncTimeoutRef.current);
        }
        brightnessSyncTimeoutRef.current = setTimeout(() => {
          pendingBrightnessRef.current = null;
          brightnessSyncTimeoutRef.current = null;
        }, 2500);
        tempSyncTimeoutRef.current = setTimeout(() => {
          pendingTempRef.current = null;
          tempSyncTimeoutRef.current = null;
        }, 2500);
      }
      void syncLightWithHomeAssistant({
        state: nextIsOn ? 'on' : 'off',
        brightnessPct: nextIsOn ? brightnessToRestore : undefined,
        kelvin:
          nextIsOn && supportsColorTemperature && !selectedColor ? rememberedColorTemp : undefined,
      }).catch(() => {
        setIsOn(!nextIsOn);
      });
    },
    [
      brightness,
      id,
      maxColorTemp,
      minColorTemp,
      selectedColor,
      supportsColorTemperature,
      syncLightWithHomeAssistant,
    ]
  );

  const handleSettingsClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  const cardInteraction = useEntityCardInteractionController({
    ariaLabel: `${name} ${t('lighting.type.light').toLowerCase()}`,
    ariaPressed: isOn,
    isEditMode,
    onToggle: () => toggleLightState(!isOn),
    onOpenControls: handleSettingsClick,
    onOpenSettings: handleSettingsClick,
  });

  const showSettingsButton = cardInteraction.interactionMode !== 'control-first';
  const showPresetOverflow = showSettingsButton || isSmall;
  const onCustomColorChange = useCallback(
    (color: string) => {
      setCustomColor(color);
      onColorChange(color);
    },
    [onColorChange]
  );

  return {
    applyBrightnessPresetsToAll,
    brightness,
    brightnessPresets,
    cardInteraction,
    colorTemp,
    currentColor: effectiveSelectedColor ?? customColor,
    customColor,
    iconButtonProps: cardInteraction.iconButtonProps,
    IconComponent,
    iconText,
    isOn,
    isOpen,
    maxColorTemp,
    minColorTemp,
    onApplyBrightnessPresetsToAllChange: setApplyBrightnessPresetsToAll,
    onBrightnessChange,
    onBrightnessCommit,
    onBrightnessPresetOrderChange: (keys) =>
      setBrightnessPresetOrder(id, keys, applyBrightnessPresetsToAll),
    onBrightnessPresetValueChange: (key, value) =>
      setBrightnessPresetValue(id, key, value, applyBrightnessPresetsToAll),
    onColorChange,
    onCustomColorChange,
    onIconChange: (icon) => setSelectedIcon(icon.trim()),
    onOpenChange: setIsOpen,
    onTempChange,
    onTempCommit,
    padding,
    selectedColor: effectiveSelectedColor,
    selectedIcon,
    settingsButtonProps: cardInteraction.settingsButtonProps,
    showPresetOverflow,
    showSettingsButton,
    supportsColorControl,
    supportsColorTemperature,
    tempOptions,
  };
}
