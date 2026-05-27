import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { IntegrationProviderId } from '@/app/types/provider';
import type { TemperatureUnit } from '@/app/utils/temperature';

export interface HVACCardProps {
  id: string;
  name: string;
  room: string;
  providerId?: IntegrationProviderId;
  headerSubtitle?: string;
  initialTemp?: number;
  initialCurrentTemp?: number;
  temperatureUnit?: TemperatureUnit;
  initialMode?: string;
  initialAction?: string;
  supportedHvacModes?: string[];
  initialState?: boolean;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}
