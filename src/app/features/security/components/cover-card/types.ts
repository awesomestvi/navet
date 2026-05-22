import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { TranslationKey } from '@/app/i18n';

export type CoverState = 'open' | 'closed' | 'opening' | 'closing';

export type DeviceClass =
  | 'blind'
  | 'shade'
  | 'curtain'
  | 'garage'
  | 'gate'
  | 'awning'
  | 'shutter'
  | 'door';

export interface CoverCardProps {
  id: string;
  name: string;
  room: string;
  initialPosition?: number;
  initialPositionMode?: 'position' | 'tilt';
  supportedFeatures?: number;
  hasPosition?: boolean;
  initialDeviceClass?: DeviceClass;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

export interface DeviceClassConfig {
  labelKey: TranslationKey;
  icon: LucideIcon;
}

export type CoverIconButtonProps = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'onClick' | 'onPointerDown'
>;
