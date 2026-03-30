import type { CardSize } from '@/app/components/shared/card-size-selector';

export interface RSSItem {
  id: string;
  title: string;
  source: string;
  timeAgo: string;
  url: string;
  excerpt?: string;
  imageUrl?: string;
}

export type RSSProviderType = 'url' | 'home-assistant-feedreader';

export interface RSSProvider {
  id: string;
  name: string;
  type: RSSProviderType;
  feedUrl?: string;
  entityId?: string;
}

export interface RSSFeedCardProps {
  cardId: string;
  inEditMode?: boolean;
  size?: CardSize;
  onSizeChange?: (size: CardSize) => void;
  room?: string;
  onRoomChange?: (room: string) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}
