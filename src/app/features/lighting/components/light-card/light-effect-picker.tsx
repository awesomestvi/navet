import { Sparkles } from 'lucide-react';
import { memo } from 'react';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { DialogSectionRow } from '@/app/components/shared/device-editor';
import { getThemeDropdownSurfaceClasses } from '@/app/components/shared/theme/dropdown-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/components/ui/utils';
import { useI18n, useTheme } from '@/app/hooks';
import { getSelectedLightEffectOptionValue } from './light-card-effect-utils';
import type { LightEffectOption } from './light-card-types';

interface LightEffectPickerProps {
  currentEffect: string | null;
  isOn: boolean;
  onSelect: (effectValue: string) => void;
  options: LightEffectOption[];
  size?: 'small' | 'medium';
  variant?: 'compact' | 'dialog';
}

export const LightEffectPicker = memo(function LightEffectPicker({
  currentEffect,
  isOn,
  onSelect,
  options,
  size = 'medium',
  variant = 'compact',
}: LightEffectPickerProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const selectedValue = getSelectedLightEffectOptionValue(currentEffect);
  const currentLabel =
    options.find((option) => option.value === selectedValue)?.label ?? t('lighting.noEffect');
  const compactIconClassName = size === 'small' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  if (variant === 'dialog') {
    return (
      <DialogSectionRow
        label={t('lighting.effects')}
        helperText={t('lighting.effect.current', { effect: currentLabel })}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={!isOn}
              className={cn(
                'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200',
                'border-white/8 bg-white/5 text-white/88 hover:border-white/14 hover:bg-white/8',
                !isOn && 'opacity-50 hover:border-white/8 hover:bg-white/5'
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <span className="truncate">{currentLabel}</span>
              <Sparkles className="h-4 w-4 shrink-0 text-white/72" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={10}
            className={cn(
              getThemeDropdownSurfaceClasses(theme),
              'w-[var(--radix-dropdown-menu-trigger-width)] p-2'
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <DropdownMenuLabel>{t('lighting.effects')}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={selectedValue} onValueChange={onSelect}>
              {options.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  className="rounded-xl"
                >
                  <span className="truncate">{option.label}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </DialogSectionRow>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <RoundControlButton
          theme={theme}
          size={size}
          variant="soft"
          disabled={!isOn}
          aria-label={t('lighting.effectPicker')}
          title={t('lighting.effect.current', { effect: currentLabel })}
          className={!isOn ? 'opacity-50' : undefined}
          iconClassName={!isOn ? 'text-current/60' : ''}
          onClick={(event) => event.stopPropagation()}
        >
          <Sparkles className={compactIconClassName} />
        </RoundControlButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        className={cn(getThemeDropdownSurfaceClasses(theme), 'w-64 overflow-visible p-2')}
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuLabel>{t('lighting.effects')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={selectedValue} onValueChange={onSelect}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="rounded-xl">
              <span className="truncate">{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
