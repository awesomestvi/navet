import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
import { DialogSectionRow } from '@navet/app/components/shared/device-editor';
import { getThemeDropdownSurfaceClasses } from '@navet/app/components/shared/theme/dropdown-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Sparkles } from 'lucide-react';
import { type CSSProperties, memo, useState } from 'react';
import { getSelectedLightEffectOptionValue } from './light-card-effect-utils';
import type { LightEffectOption } from './light-card-types';

interface LightEffectPickerProps {
  currentEffect: string | null;
  isOn: boolean;
  activeColor?: string | null;
  onSelect: (effectValue: string) => void;
  options: LightEffectOption[];
  size?: 'small' | 'medium';
  variant?: 'compact' | 'dialog';
}

export const LightEffectPicker = memo(function LightEffectPicker({
  currentEffect,
  isOn,
  activeColor,
  onSelect,
  options,
  size = 'medium',
  variant = 'compact',
}: LightEffectPickerProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const effectiveTheme = theme === 'light' && isOn ? 'dark' : theme;
  const selectedValue = getSelectedLightEffectOptionValue(currentEffect);
  const currentLabel =
    options.find((option) => option.value === selectedValue)?.label ?? t('lighting.noEffect');
  const controlSizes = getCardActionControlSizes(size);
  const hasActiveEffect = currentEffect !== null;
  const isSelected = isOpen || hasActiveEffect;

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
                'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] duration-200',
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
              getThemeDropdownSurfaceClasses(effectiveTheme),
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
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <RoundControlButton
          theme={effectiveTheme}
          size={size}
          variant="soft"
          disabled={!isOn}
          aria-label={t('lighting.effectPicker')}
          aria-pressed={isSelected}
          title={t('lighting.effect.current', { effect: currentLabel })}
          className={cn(
            !isOn && 'opacity-50',
            hasActiveEffect && 'navet-light-effect-beam overflow-hidden'
          )}
          style={
            hasActiveEffect
              ? ({
                  '--navet-light-effect-accent': activeColor ?? '#f59e0b',
                } as CSSProperties)
              : undefined
          }
          iconClassName={!isOn ? 'text-current/60' : ''}
          iconStyle={isSelected && isOn ? { color: activeColor ?? '#f59e0b' } : undefined}
          onClick={(event) => event.stopPropagation()}
        >
          <Sparkles className={controlSizes.icon} />
        </RoundControlButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        className={cn(getThemeDropdownSurfaceClasses(effectiveTheme), 'w-64 overflow-visible p-2')}
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
