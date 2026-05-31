import type { BrightnessPresetKey } from '@navet/app/features/lighting/stores/light-preset-store';
import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

export type HeaderIconButtonProps = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'onClick' | 'onPointerDown'
>;

export interface LightBrightnessPreset {
  brightness: number;
  icon: LucideIcon;
  key: BrightnessPresetKey;
  label: string;
}

export interface LightEffectOption {
  isOff: boolean;
  label: string;
  value: string;
}
