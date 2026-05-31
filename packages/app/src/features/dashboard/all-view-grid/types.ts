import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { DeviceWithType } from '@navet/app/types/device.types';
import type { CustomCard } from '../stores/custom-cards-store';

export type AllViewGrouping = 'room' | 'type' | 'custom' | 'none';

export interface AllViewGridProps {
  deviceMap: Map<string, DeviceWithType>;
  rooms: string[];
  cardOrders: Record<string, string[]>;
  isEditMode: boolean;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  grouping: AllViewGrouping;
  customCards?: CustomCard[];
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveEntity?: (entityId: string) => void;
  allowEntityRemoval?: boolean;
  usesHideAction?: boolean;
}

export interface AllViewSectionData {
  key: string;
  title: string;
  orderedIds: string[];
  totalItems: number;
  mutedTitle?: boolean;
  showHeader?: boolean;
}
