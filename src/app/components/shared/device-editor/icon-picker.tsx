import {
  Circle,
  CircleDashed,
  CircleDot,
  Flame,
  Flashlight,
  Lamp,
  LampCeiling,
  LampDesk,
  LampFloor,
  LampWallDown,
  LampWallUp,
  Lightbulb,
  Moon,
  MoonStar,
  Orbit,
  Search,
  Sparkle,
  Sparkles,
  Star,
  StarHalf,
  Sun,
  SunDim,
  SunMedium,
  SunMoon,
  Sunrise,
  Sunset,
  Zap,
  ZapOff,
} from 'lucide-react';
import type React from 'react';
import { memo, useCallback, useState } from 'react';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useI18n, useTheme } from '@/app/hooks';
import type { TranslationKey } from '@/app/i18n';
import { getDeviceEditorSurfaceTokens } from './device-editor-surface-tokens';

interface IconPickerProps {
  selectedIcon: string;
  onIconChange: (iconName: string) => void;
  isLightOn: boolean;
}

const lightIcons = [
  { name: 'Lightbulb', component: Lightbulb, labelKey: 'iconPicker.lightbulb' },
  { name: 'Lamp', component: Lamp, labelKey: 'iconPicker.lamp' },
  { name: 'LampDesk', component: LampDesk, labelKey: 'iconPicker.lampDesk' },
  { name: 'LampFloor', component: LampFloor, labelKey: 'iconPicker.lampFloor' },
  { name: 'LampCeiling', component: LampCeiling, labelKey: 'iconPicker.lampCeiling' },
  { name: 'LampWallDown', component: LampWallDown, labelKey: 'iconPicker.lampWallDown' },
  { name: 'LampWallUp', component: LampWallUp, labelKey: 'iconPicker.lampWallUp' },
  { name: 'Flashlight', component: Flashlight, labelKey: 'iconPicker.flashlight' },
  { name: 'Flame', component: Flame, labelKey: 'iconPicker.flame' },
  { name: 'Sun', component: Sun, labelKey: 'iconPicker.sun' },
  { name: 'SunMedium', component: SunMedium, labelKey: 'iconPicker.sunMedium' },
  { name: 'SunDim', component: SunDim, labelKey: 'iconPicker.sunDim' },
  { name: 'Sunrise', component: Sunrise, labelKey: 'iconPicker.sunrise' },
  { name: 'Sunset', component: Sunset, labelKey: 'iconPicker.sunset' },
  { name: 'SunMoon', component: SunMoon, labelKey: 'iconPicker.sunMoon' },
  { name: 'Moon', component: Moon, labelKey: 'iconPicker.moon' },
  { name: 'MoonStar', component: MoonStar, labelKey: 'iconPicker.moonStar' },
  { name: 'Star', component: Star, labelKey: 'iconPicker.star' },
  { name: 'StarHalf', component: StarHalf, labelKey: 'iconPicker.starHalf' },
  { name: 'Zap', component: Zap, labelKey: 'iconPicker.zap' },
  { name: 'ZapOff', component: ZapOff, labelKey: 'iconPicker.zapOff' },
  { name: 'Sparkles', component: Sparkles, labelKey: 'iconPicker.sparkles' },
  { name: 'Sparkle', component: Sparkle, labelKey: 'iconPicker.sparkle' },
  { name: 'Circle', component: Circle, labelKey: 'iconPicker.circle' },
  { name: 'CircleDot', component: CircleDot, labelKey: 'iconPicker.circleDot' },
  { name: 'CircleDashed', component: CircleDashed, labelKey: 'iconPicker.circleDashed' },
  { name: 'Orbit', component: Orbit, labelKey: 'iconPicker.orbit' },
] as const satisfies ReadonlyArray<{
  name: string;
  component: React.ComponentType<{ className?: string }>;
  labelKey: TranslationKey;
}>;

export const DEVICE_EDITOR_ICON_OPTIONS = lightIcons;

export function getNamedIconComponent(iconName: string) {
  return lightIcons.find((icon) => icon.name === iconName)?.component ?? Zap;
}

export const IconPicker = memo(function IconPicker({
  selectedIcon,
  onIconChange,
  isLightOn,
}: IconPickerProps) {
  const { primaryColor } = useTheme();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const activeColor = getThemeColorValue(primaryColor);
  const editorSurface = getDeviceEditorSurfaceTokens(isLightOn);

  const handleIconButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const iconName = e.currentTarget.dataset.icon;
      if (iconName) onIconChange(iconName);
    },
    [onIconChange]
  );

  // Filter icons based on search query
  const filteredIcons = searchQuery
    ? lightIcons.filter(
        (icon) =>
          icon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t(icon.labelKey).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : lightIcons;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span
          className={`text-sm font-medium transition-colors duration-500 ${editorSurface.sectionLabelClassName}`}
        >
          {t('lighting.lightIcon')}
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search
          className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-500 ${editorSurface.closeIconClassName}`}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('lighting.searchIcons')}
          className={`w-full rounded-[22px] border py-2 pl-10 pr-4 text-sm transition-all duration-500 focus:outline-none focus:ring-2 ${
            isLightOn
              ? 'border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:bg-white/10 focus:ring-transparent'
              : 'border-white/5 bg-white/[0.02] text-gray-500 placeholder:text-gray-700 focus:border-gray-500/30 focus:bg-white/5 focus:ring-gray-500/20'
          }`}
          style={
            isLightOn
              ? {
                  borderColor: searchQuery ? `${activeColor}4d` : undefined,
                  boxShadow: searchQuery ? `0 0 0 2px ${activeColor}26` : undefined,
                }
              : undefined
          }
        />
      </div>

      {/* Icon Grid */}
      <div className="grid grid-cols-6 gap-3">
        {filteredIcons.map((icon) => {
          const IconComponent = icon.component;
          return (
            <button
              type="button"
              key={icon.name}
              data-icon={icon.name}
              disabled={!isLightOn}
              onClick={handleIconButtonClick}
              className={`w-full aspect-square rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                selectedIcon === icon.name
                  ? isLightOn
                    ? 'scale-105'
                    : 'bg-gray-500/20 border-gray-500/50'
                  : isLightOn
                    ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105'
                    : `bg-white/[0.02] border-white/5 ${editorSurface.disabledCircleClassName}`
              }`}
              style={
                selectedIcon === icon.name && isLightOn
                  ? {
                      backgroundColor: `${activeColor}30`,
                      borderColor: activeColor,
                      boxShadow: `0 10px 20px -12px ${activeColor}80`,
                    }
                  : undefined
              }
              title={t(icon.labelKey)}
            >
              <IconComponent
                className={`w-5 h-5 transition-colors duration-500 ${
                  selectedIcon === icon.name ? '' : editorSurface.closeIconClassName
                }`}
                style={selectedIcon === icon.name && isLightOn ? { color: '#ffffff' } : undefined}
              />
            </button>
          );
        })}
      </div>

      {/* No results message */}
      {searchQuery && filteredIcons.length === 0 && (
        <div
          className={`py-8 text-center transition-colors duration-500 ${editorSurface.sectionLabelClassName}`}
        >
          <p className="text-sm">{t('lighting.noIconsFound')}</p>
          <p className="text-xs mt-1">{t('lighting.tryDifferentSearch')}</p>
        </div>
      )}
    </div>
  );
});
