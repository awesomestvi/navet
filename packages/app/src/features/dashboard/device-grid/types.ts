import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { DeviceWithType } from '@navet/app/types/device.types';
import type { ReactNode } from 'react';
import type { CustomCard } from '../stores/custom-cards-store';

export interface DeviceGridSupplementalCard {
  id: string;
  size: CardSize;
  content: ReactNode;
}

export interface DeviceGridProps {
  orderedCardIds: string[];
  deviceMap: Map<string, DeviceWithType>;
  isEditMode: boolean;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  customCards?: CustomCard[];
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveEntity?: (entityId: string) => void;
  allowEntityRemoval?: boolean;
  usesHideAction?: boolean;
  densePerformanceMode?: boolean;
  optimizeOffscreenPaint?: boolean;
  getDeviceHeaderSubtitle?: (device: DeviceWithType) => string | undefined;
  supplementalCards?: readonly DeviceGridSupplementalCard[];
}
