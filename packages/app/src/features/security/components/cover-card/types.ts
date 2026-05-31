import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { TranslationKey } from '@navet/app/i18n';
import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

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
