import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { ALL_ROOMS_ID } from '@/app/constants/rooms';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import {
  type CardType,
  useCustomCardsStore,
  useDashboardEntitiesStore,
} from '@/app/features/dashboard';
import {
  parseButtonServiceCall,
  sanitizeButtonEntityId,
} from '@/app/features/dashboard/utils/button-widget-security';
import { useLightPresetStore } from '@/app/features/lighting';
import { resolveAppLanguage } from '@/app/i18n/config';
import { isSection } from '@/app/navigation/sections';
import { useNavigationStore } from '@/app/stores/navigation-store';
import {
  defaultSettings,
  useSettingsStore,
  type WeatherMetricId,
} from '@/app/stores/settings-store';
import { useThemeStore } from '@/app/stores/theme-store';
import { getLegacyReducedEffectsFlags, resolveEffectsQuality } from '@/app/utils/effects-quality';
import { storage } from '@/app/utils/storage';
import { sanitizeExternalUrl, sanitizeImageUrl } from '@/app/utils/url-security';

export interface DashboardConfigPayload {
  version: 3;
  app: 'navet';
  exportedAt: string;
  theme: {
    theme: ReturnType<typeof useThemeStore.getState>['theme'];
    primaryColor: ReturnType<typeof useThemeStore.getState>['primaryColor'];
    customPrimaryColor?: ReturnType<typeof useThemeStore.getState>['customPrimaryColor'];
    wallpaper?: ReturnType<typeof useThemeStore.getState>['wallpaper'];
  };
  settings: Partial<
    Omit<ReturnType<typeof useSettingsStore.getState>, 'updateSettings' | 'resetSettings'>
  >;
  navigation: Pick<ReturnType<typeof useNavigationStore.getState>, 'currentRoom' | 'activeSection'>;
  customCards?: ReturnType<typeof useCustomCardsStore.getState>['cards'];
  dashboardEntities?: Pick<
    ReturnType<typeof useDashboardEntitiesStore.getState>,
    'hiddenEntityIds' | 'lockedCardIds' | 'onboardingCompleted'
  >;
  lightPresets?: Pick<
    ReturnType<typeof useLightPresetStore.getState>,
    'globalBrightnessPresetValues' | 'globalBrightnessPresetOrder' | 'lightPresetConfigs'
  >;
  cardSizes?: Record<string, string>;
  cardOrders?: Record<string, string[]>;
  cardZones?: Record<string, string>;
  homeDashboardLayout?: unknown;
  roomOrder?: string[];
}

const parseStoredJson = <T>(key: string, fallback: T): T => {
  return storage.get(key, fallback);
};

const omitUndefinedEntries = <T extends Record<string, unknown>>(value: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>;

const pruneEmptyRecord = <T extends Record<string, unknown>>(value: T): T | undefined =>
  Object.keys(value).length > 0 ? value : undefined;

const pruneEmptyArray = <T>(value: T[]): T[] | undefined => (value.length > 0 ? value : undefined);

const weatherMetricIds = new Set<WeatherMetricId>([
  'precipitation',
  'humidity',
  'wind',
  'feelsLike',
  'windGust',
  'pressure',
  'uvIndex',
  'cloudCover',
]);

function isWeatherMetricId(value: unknown): value is WeatherMetricId {
  return typeof value === 'string' && weatherMetricIds.has(value as WeatherMetricId);
}

function resolveWeatherMetricIds(value: unknown): WeatherMetricId[] {
  return Array.isArray(value) ? value.filter(isWeatherMetricId) : defaultSettings.weatherMetricIds;
}

function areArraysEqual<T>(left: T[], right: T[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

const buildExportedSettings = (
  settingsState: Omit<
    ReturnType<typeof useSettingsStore.getState>,
    'updateSettings' | 'resetSettings'
  >
) => {
  const effectsQuality = resolveEffectsQuality(
    settingsState.effectsQuality,
    settingsState.disableAnimations || settingsState.lowPowerMode
  );

  return omitUndefinedEntries({
    username:
      settingsState.username !== defaultSettings.username ? settingsState.username : undefined,
    email: settingsState.email || undefined,
    language:
      settingsState.language !== defaultSettings.language ? settingsState.language : undefined,
    showNotifications:
      settingsState.showNotifications !== defaultSettings.showNotifications
        ? settingsState.showNotifications
        : undefined,
    showWeatherInHeader:
      settingsState.showWeatherInHeader !== defaultSettings.showWeatherInHeader
        ? settingsState.showWeatherInHeader
        : undefined,
    use24HourTime:
      settingsState.use24HourTime !== defaultSettings.use24HourTime
        ? settingsState.use24HourTime
        : undefined,
    temperatureUnit:
      settingsState.temperatureUnit !== defaultSettings.temperatureUnit
        ? settingsState.temperatureUnit
        : undefined,
    defaultView:
      settingsState.defaultView !== defaultSettings.defaultView
        ? settingsState.defaultView
        : undefined,
    compactMode:
      settingsState.compactMode !== defaultSettings.compactMode
        ? settingsState.compactMode
        : undefined,
    disableAnimations: undefined,
    lowPowerMode: undefined,
    effectsQuality: effectsQuality !== defaultSettings.effectsQuality ? effectsQuality : undefined,
    entityInteractionMode:
      settingsState.entityInteractionMode !== defaultSettings.entityInteractionMode
        ? settingsState.entityInteractionMode
        : undefined,
    weatherMetricIds: !areArraysEqual(
      settingsState.weatherMetricIds,
      defaultSettings.weatherMetricIds
    )
      ? settingsState.weatherMetricIds
      : undefined,
    ambientLightBleed:
      settingsState.ambientLightBleed !== defaultSettings.ambientLightBleed
        ? settingsState.ambientLightBleed
        : undefined,
  });
};

export const exportDashboardConfig = (): DashboardConfigPayload => {
  const themeState = useThemeStore.getState();
  const settingsState = useSettingsStore.getState();
  const navigationState = useNavigationStore.getState();
  const customCardsState = useCustomCardsStore.getState();
  const dashboardEntitiesState = useDashboardEntitiesStore.getState();
  const lightPresetState = useLightPresetStore.getState();

  return {
    version: 3,
    app: 'navet',
    exportedAt: new Date().toISOString(),
    theme: {
      theme: themeState.theme,
      primaryColor: themeState.primaryColor,
      ...(themeState.customPrimaryColor
        ? { customPrimaryColor: themeState.customPrimaryColor }
        : {}),
      ...(themeState.wallpaper ? { wallpaper: themeState.wallpaper } : {}),
    },
    settings: buildExportedSettings(settingsState),
    navigation: {
      currentRoom: navigationState.currentRoom,
      activeSection: navigationState.activeSection,
    },
    customCards: pruneEmptyArray(customCardsState.cards),
    dashboardEntities:
      dashboardEntitiesState.hiddenEntityIds.length > 0 ||
      dashboardEntitiesState.lockedCardIds.length > 0 ||
      dashboardEntitiesState.onboardingCompleted
        ? {
            hiddenEntityIds: dashboardEntitiesState.hiddenEntityIds,
            lockedCardIds: dashboardEntitiesState.lockedCardIds,
            onboardingCompleted: dashboardEntitiesState.onboardingCompleted,
          }
        : undefined,
    lightPresets:
      Object.keys(lightPresetState.lightPresetConfigs).length > 0
        ? {
            globalBrightnessPresetValues: lightPresetState.globalBrightnessPresetValues,
            globalBrightnessPresetOrder: lightPresetState.globalBrightnessPresetOrder,
            lightPresetConfigs: lightPresetState.lightPresetConfigs,
          }
        : undefined,
    cardSizes: pruneEmptyRecord(
      parseStoredJson<Record<string, string>>(STORAGE_KEYS.cardSizes, {})
    ),
    cardOrders: pruneEmptyRecord(
      parseStoredJson<Record<string, string[]>>(STORAGE_KEYS.cardOrders, {})
    ),
    cardZones: pruneEmptyRecord(
      parseStoredJson<Record<string, string>>(STORAGE_KEYS.cardZones, {})
    ),
    homeDashboardLayout: parseStoredJson(STORAGE_KEYS.homeDashboardLayout, undefined),
    roomOrder: pruneEmptyArray(parseStoredJson<string[]>(STORAGE_KEYS.roomOrder, [])),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cardTypes = new Set<CardType>([
  'rss',
  'photo',
  'note',
  'battery',
  'energy-now',
  'button',
  'map',
]);
const cardSizes = new Set(['small', 'medium', 'large', 'extra-large']);
const MAX_IMPORTED_CARDS = 200;
const MAX_IMPORTED_RECORD_KEYS = 500;

const sanitizeRSSFeedUrl = (value: unknown) => {
  const safeUrl = sanitizeExternalUrl(stringValue(value, 2000));
  return safeUrl?.startsWith('https://') ? safeUrl : null;
};

type SanitizedJsonPrimitive = string | number | boolean | null;
type SanitizedJsonValue =
  | SanitizedJsonPrimitive
  | SanitizedJsonPrimitive[]
  | Record<string, unknown>;
type SanitizedJsonEntry = readonly [string, SanitizedJsonValue];

function isSanitizedJsonPrimitive(value: unknown): value is SanitizedJsonPrimitive {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  );
}

function stringValue(value: unknown, maxLength = 240): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function sanitizeJsonRecord(value: unknown, depth = 0): Record<string, unknown> | undefined {
  if (!isRecord(value) || depth > 4) {
    return undefined;
  }

  const entries = Object.entries(value)
    .slice(0, 50)
    .flatMap<SanitizedJsonEntry>(([key, entry]) => {
      const safeKey = stringValue(key, 80);
      if (!safeKey) {
        return [];
      }

      if (isSanitizedJsonPrimitive(entry)) {
        return [[safeKey, entry] as const];
      }

      if (Array.isArray(entry)) {
        return [[safeKey, entry.slice(0, 50).filter(isSanitizedJsonPrimitive)] as const];
      }

      const nested = sanitizeJsonRecord(entry, depth + 1);
      return nested ? ([[safeKey, nested]] as const) : [];
    });

  return Object.fromEntries(entries);
}

function sanitizeStringArray(value: unknown, maxItems = 200): string[] {
  return Array.isArray(value)
    ? value.slice(0, maxItems).flatMap((item) => {
        const safeItem = stringValue(item);
        return safeItem ? [safeItem] : [];
      })
    : [];
}

function sanitizeStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, MAX_IMPORTED_RECORD_KEYS)
      .flatMap(([key, entry]) => {
        const safeKey = stringValue(key);
        const safeEntry = stringValue(entry);
        return safeKey && safeEntry ? ([[safeKey, safeEntry]] as const) : [];
      })
  );
}

function sanitizeStringArrayRecord(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, MAX_IMPORTED_RECORD_KEYS)
      .flatMap(([key, entry]) => {
        const safeKey = stringValue(key);
        const safeEntries = sanitizeStringArray(entry);
        return safeKey && safeEntries.length > 0 ? ([[safeKey, safeEntries]] as const) : [];
      })
  );
}

function sanitizeCustomCardData(
  type: CardType,
  data: unknown
): Record<string, unknown> | undefined {
  if (!isRecord(data)) {
    return undefined;
  }

  if (type === 'button') {
    const serviceCall = parseButtonServiceCall(stringValue(data.service));
    const serviceData = sanitizeJsonRecord(data.serviceData);

    return omitUndefinedEntries({
      label: stringValue(data.label, 80),
      service: serviceCall ? `${serviceCall.domain}.${serviceCall.service}` : undefined,
      entityId: sanitizeButtonEntityId(stringValue(data.entityId)),
      icon: stringValue(data.icon, 80),
      serviceData,
      tintColor: stringValue(data.tintColor, 40),
    });
  }

  if (type === 'photo') {
    const photoUrls = Array.isArray(data.photoUrls)
      ? data.photoUrls.slice(0, 48).flatMap((url) => {
          const safeUrl = sanitizeImageUrl(stringValue(url, 2000), undefined, {
            allowDataImage: true,
          });
          return safeUrl ? [safeUrl] : [];
        })
      : undefined;

    return omitUndefinedEntries({
      sourceMode: data.sourceMode === 'home-assistant' ? 'home-assistant' : 'urls',
      photoUrls,
      mediaSourceId: stringValue(data.mediaSourceId, 240),
      shuffleEnabled: typeof data.shuffleEnabled === 'boolean' ? data.shuffleEnabled : undefined,
      tintColor: stringValue(data.tintColor, 40),
    });
  }

  if (type === 'rss') {
    const customProviders = Array.isArray(data.customProviders)
      ? data.customProviders.slice(0, 50).flatMap((provider) => {
          if (!isRecord(provider)) {
            return [];
          }

          const id = stringValue(provider.id, 120);
          const name = stringValue(provider.name, 120);
          const feedUrl = sanitizeRSSFeedUrl(provider.feedUrl);
          if (!id || !name || !feedUrl) {
            return [];
          }

          return [{ id, name, type: 'url', feedUrl }];
        })
      : undefined;

    return omitUndefinedEntries({
      customProviders,
      selectedProviderIds: sanitizeStringArray(data.selectedProviderIds, 50),
      articleCount:
        typeof data.articleCount === 'number'
          ? Math.max(1, Math.min(50, Math.round(data.articleCount)))
          : undefined,
      tintColor: stringValue(data.tintColor, 40),
    });
  }

  return sanitizeJsonRecord(data);
}

function sanitizeImportedCustomCards(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_IMPORTED_CARDS).flatMap((card) => {
    if (!isRecord(card) || !cardTypes.has(card.type as CardType)) {
      return [];
    }

    const id = stringValue(card.id, 160);
    const type = card.type as CardType;
    const room = stringValue(card.room) ?? ALL_ROOMS_ID;
    const size = cardSizes.has(card.size as string) ? (card.size as CardSize) : 'medium';
    if (!id) {
      return [];
    }

    return [
      {
        id,
        type,
        size,
        room,
        data: sanitizeCustomCardData(type, card.data),
        createdAt: typeof card.createdAt === 'number' ? card.createdAt : Date.now(),
      },
    ];
  });
}

export const importDashboardConfig = (value: unknown) => {
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2 && value.version !== 3)) {
    throw new Error('Unsupported dashboard config format.');
  }

  const theme = isRecord(value.theme) ? value.theme : null;
  const settings = isRecord(value.settings) ? value.settings : null;
  const navigation = isRecord(value.navigation) ? value.navigation : null;
  const dashboardEntities = isRecord(value.dashboardEntities) ? value.dashboardEntities : {};
  const lightPresets = isRecord(value.lightPresets) ? value.lightPresets : {};

  if (!theme || !settings || !navigation) {
    throw new Error('Dashboard config file is incomplete.');
  }

  const currentThemeState = useThemeStore.getState();
  const currentLightPresetState = useLightPresetStore.getState();
  const reducedEffectsEnabled =
    typeof settings.lowPowerMode === 'boolean'
      ? settings.lowPowerMode
      : typeof settings.disableAnimations === 'boolean'
        ? settings.disableAnimations
        : defaultSettings.lowPowerMode;
  const effectsQuality = resolveEffectsQuality(
    settings.effectsQuality === 'high' ||
      settings.effectsQuality === 'medium' ||
      settings.effectsQuality === 'low'
      ? settings.effectsQuality
      : undefined,
    reducedEffectsEnabled
  );

  useThemeStore.getState().applyImportedTheme({
    theme:
      (theme.theme as ReturnType<typeof useThemeStore.getState>['theme'] | undefined) ??
      currentThemeState.theme,
    primaryColor:
      (theme.primaryColor as
        | ReturnType<typeof useThemeStore.getState>['primaryColor']
        | undefined) ?? currentThemeState.primaryColor,
    customPrimaryColor:
      theme.customPrimaryColor === undefined
        ? currentThemeState.customPrimaryColor
        : (theme.customPrimaryColor as string | null),
    wallpaper:
      theme.wallpaper === undefined
        ? currentThemeState.wallpaper
        : (theme.wallpaper as string | null),
  });

  useSettingsStore.getState().applyImportedSettings({
    username: (settings.username as string | undefined) ?? defaultSettings.username,
    email: (settings.email as string | undefined) ?? defaultSettings.email,
    language: resolveAppLanguage(
      typeof settings.language === 'string' ? settings.language : defaultSettings.language
    ),
    showNotifications:
      typeof settings.showNotifications === 'boolean'
        ? settings.showNotifications
        : defaultSettings.showNotifications,
    showWeatherInHeader:
      typeof settings.showWeatherInHeader === 'boolean'
        ? settings.showWeatherInHeader
        : defaultSettings.showWeatherInHeader,
    use24HourTime:
      typeof settings.use24HourTime === 'boolean'
        ? settings.use24HourTime
        : defaultSettings.use24HourTime,
    temperatureUnit:
      settings.temperatureUnit === 'celsius' || settings.temperatureUnit === 'fahrenheit'
        ? settings.temperatureUnit
        : defaultSettings.temperatureUnit,
    defaultView: (settings.defaultView as string | undefined) ?? 'all',
    compactMode:
      typeof settings.compactMode === 'boolean'
        ? settings.compactMode
        : defaultSettings.compactMode,
    ...getLegacyReducedEffectsFlags(effectsQuality),
    effectsQuality,
    entityInteractionMode:
      settings.entityInteractionMode === 'control-first' ||
      settings.entityInteractionMode === 'toggle-first'
        ? settings.entityInteractionMode
        : defaultSettings.entityInteractionMode,
    weatherForecastMode:
      settings.weatherForecastMode === 'hourly' || settings.weatherForecastMode === 'weekly'
        ? settings.weatherForecastMode
        : defaultSettings.weatherForecastMode,
    weatherMetricIds: resolveWeatherMetricIds(settings.weatherMetricIds),
    ambientLightBleed:
      typeof settings.ambientLightBleed === 'boolean'
        ? settings.ambientLightBleed
        : defaultSettings.ambientLightBleed,
  });

  useNavigationStore.getState().applyNavigationState({
    currentRoom: (navigation.currentRoom as string | undefined) ?? ALL_ROOMS_ID,
    activeSection: isSection(navigation.activeSection) ? navigation.activeSection : 'home',
  });

  useCustomCardsStore.getState().replaceCards(sanitizeImportedCustomCards(value.customCards));

  useDashboardEntitiesStore.getState().replaceDashboardEntitiesState({
    hiddenEntityIds: sanitizeStringArray(dashboardEntities.hiddenEntityIds),
    lockedCardIds: sanitizeStringArray(dashboardEntities.lockedCardIds),
    onboardingCompleted:
      typeof dashboardEntities.onboardingCompleted === 'boolean'
        ? dashboardEntities.onboardingCompleted
        : true,
  });

  useLightPresetStore.getState().replacePresetState({
    globalBrightnessPresetValues:
      (lightPresets.globalBrightnessPresetValues as
        | ReturnType<typeof useLightPresetStore.getState>['globalBrightnessPresetValues']
        | undefined) ?? currentLightPresetState.globalBrightnessPresetValues,
    globalBrightnessPresetOrder:
      (lightPresets.globalBrightnessPresetOrder as
        | ReturnType<typeof useLightPresetStore.getState>['globalBrightnessPresetOrder']
        | undefined) ?? currentLightPresetState.globalBrightnessPresetOrder,
    lightPresetConfigs:
      (lightPresets.lightPresetConfigs as ReturnType<
        typeof useLightPresetStore.getState
      >['lightPresetConfigs']) ?? currentLightPresetState.lightPresetConfigs,
  });

  storage.set(STORAGE_KEYS.cardSizes, sanitizeStringRecord(value.cardSizes));
  storage.set(STORAGE_KEYS.cardOrders, sanitizeStringArrayRecord(value.cardOrders));
  storage.set(STORAGE_KEYS.cardZones, sanitizeStringRecord(value.cardZones));
  storage.set(
    STORAGE_KEYS.homeDashboardLayout,
    sanitizeJsonRecord(value.homeDashboardLayout) ?? null
  );
  storage.set(STORAGE_KEYS.roomOrder, sanitizeStringArray(value.roomOrder));
};

export const downloadDashboardConfig = async (): Promise<'shared' | 'downloaded'> => {
  const payload = exportDashboardConfig();
  const yamlContent = stringifyYaml(payload);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `navet-dashboard-config-${dateStamp}.yaml`;
  const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
  const file = new File([blob], fileName, { type: 'text/yaml;charset=utf-8' });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      files: [file],
      title: 'Navet dashboard config',
    });
    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.append(link);
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);

  return 'downloaded';
};

export const importDashboardConfigFromFile = async (file: File) => {
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.yaml') && !lowerName.endsWith('.yml')) {
    throw new Error('Unsupported dashboard config file. Use a .yaml or .yml export.');
  }

  const content = (await file.text()).replace(/^\uFEFF/, '');
  const parsed = parseYaml(content);
  importDashboardConfig(parsed);
};

export const importDashboardConfigFromUrl = async (url: string) => {
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error(`Unable to load dashboard config from ${url}`);
  }

  const content = (await response.text()).replace(/^\uFEFF/, '');
  const parsed = parseYaml(content);
  importDashboardConfig(parsed);
};
