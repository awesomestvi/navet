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
import { memo } from 'react';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import {
  DEFAULT_LIGHT_ICON,
  isEmojiLightIcon,
  normalizeLightIconName,
  resolveLightIconComponent,
} from '@/app/constants/icon-map';
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
  return resolveLightIconComponent(iconName) ?? Zap;
}

export const IconPicker = memo(function IconPicker({
  selectedIcon,
  onIconChange,
  isLightOn,
}: IconPickerProps) {
  const { primaryColor } = useTheme();
  const { t } = useI18n();
  const activeColor = getThemeColorValue(primaryColor);
  const editorSurface = getDeviceEditorSurfaceTokens(isLightOn);
  const normalizedIconName = normalizeLightIconName(selectedIcon);
  const customIconComponent = normalizedIconName
    ? resolveLightIconComponent(normalizedIconName)
    : null;
  const isEmojiIcon = !customIconComponent && isEmojiLightIcon(selectedIcon);
  const IconComponent = isEmojiIcon
    ? null
    : (customIconComponent ?? resolveLightIconComponent(DEFAULT_LIGHT_ICON));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span
          className={`text-sm font-medium transition-colors duration-500 ${editorSurface.sectionLabelClassName}`}
        >
          {t('lighting.lightIcon')}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-500 ${
              isLightOn ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5'
            }`}
            style={
              isLightOn
                ? {
                    borderColor: `${activeColor}4d`,
                    boxShadow: `0 0 0 2px ${activeColor}26`,
                  }
                : undefined
            }
          >
            {IconComponent ? (
              <IconComponent
                className={`h-4 w-4 ${isLightOn ? 'text-white' : editorSurface.closeIconClassName}`}
              />
            ) : (
              <span
                className={`text-sm leading-none ${isLightOn ? 'text-white' : editorSurface.closeIconClassName}`}
              >
                {isEmojiIcon ? selectedIcon.trim() : '•'}
              </span>
            )}
          </div>
          <input
            type="text"
            value={selectedIcon}
            onChange={(e) => onIconChange(e.target.value)}
            placeholder={t('lighting.iconInputPlaceholder')}
            className={`w-full rounded-[22px] border px-4 py-2 text-sm transition-all duration-500 focus:outline-none focus:ring-2 ${
              isLightOn
                ? 'border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:bg-white/10 focus:ring-transparent'
                : 'border-white/5 bg-white/[0.02] text-gray-500 placeholder:text-gray-700 focus:border-gray-500/30 focus:bg-white/5 focus:ring-gray-500/20'
            }`}
            style={
              isLightOn
                ? {
                    borderColor: selectedIcon.trim() ? `${activeColor}4d` : undefined,
                    boxShadow: selectedIcon.trim() ? `0 0 0 2px ${activeColor}26` : undefined,
                  }
                : undefined
            }
          />
        </div>

        <p className={`text-xs leading-relaxed ${editorSurface.sectionLabelClassName}`}>
          {t('lighting.iconInputHelp')}
        </p>

        <a
          href="https://lucide.dev/icons/"
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-2 text-xs font-medium underline underline-offset-4 ${
            isLightOn ? 'text-white/80 hover:text-white' : editorSurface.sectionLabelClassName
          }`}
        >
          {t('lighting.lucideIconLibrary')}
        </a>
      </div>
    </div>
  );
});
