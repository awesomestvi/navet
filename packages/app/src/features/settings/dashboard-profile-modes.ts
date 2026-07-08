import type { TranslationKey } from '@navet/app/i18n';
import type { DashboardProfileMode, UserSettings } from '@navet/app/stores/settings-store';

export interface DashboardProfileModeOption {
  id: Exclude<DashboardProfileMode, 'custom'>;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  settings: Pick<
    UserSettings,
    | 'dashboardProfileMode'
    | 'dashboardSpaceMode'
    | 'headerTitleMode'
    | 'keepDeviceAwake'
    | 'kioskMode'
    | 'showHomeSummaryBar'
  >;
}

export const DASHBOARD_PROFILE_MODE_OPTIONS: DashboardProfileModeOption[] = [
  {
    id: 'standard',
    labelKey: 'settings.dashboard.profileMode.standard.title',
    descriptionKey: 'settings.dashboard.profileMode.standard.description',
    settings: {
      dashboardProfileMode: 'standard',
      dashboardSpaceMode: 'default',
      headerTitleMode: 'auto_greeting',
      keepDeviceAwake: false,
      kioskMode: false,
      showHomeSummaryBar: true,
    },
  },
  {
    id: 'wall_display',
    labelKey: 'settings.dashboard.profileMode.wallDisplay.title',
    descriptionKey: 'settings.dashboard.profileMode.wallDisplay.description',
    settings: {
      dashboardProfileMode: 'wall_display',
      dashboardSpaceMode: 'more_space',
      headerTitleMode: 'clock',
      keepDeviceAwake: true,
      kioskMode: true,
      showHomeSummaryBar: true,
    },
  },
];

export const DASHBOARD_PROFILE_MODE_SCOPE_KEYS = [
  'dashboardProfileMode',
  'dashboardSpaceMode',
  'headerTitleMode',
  'keepDeviceAwake',
  'kioskMode',
  'showHomeSummaryBar',
] as const;

export function getDashboardProfileModeOption(mode: DashboardProfileMode) {
  return DASHBOARD_PROFILE_MODE_OPTIONS.find((option) => option.id === mode) ?? null;
}
