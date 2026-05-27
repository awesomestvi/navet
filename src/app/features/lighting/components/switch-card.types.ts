import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { DeviceMetric } from '@/app/types/device.types';
import type { IntegrationProviderId } from '@/app/types/provider';

export interface SwitchCardProps {
  id: string;
  name: string;
  size: CardSize;
  room: string;
  providerId?: IntegrationProviderId;
  initialState?: boolean;
  entityType?: string;
  serviceDomain?: string;
  serviceAction?: string;
  power?: number;
  voltage?: number;
  energy?: number;
  metrics?: DeviceMetric[];
  isEditMode?: boolean;
}
