import type { ReactNode } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { TranslationKey } from '@/app/i18n';
import type { DashboardLibraryCard } from '../dashboard-library-list';

export interface AddCardDialogContainerProps {
  open: boolean;
  onClose: () => void;
  onAddCard: (type: CardType, size: CardSize) => void;
  onAddLibraryCard: (cardId: string) => void;
  currentRoom: string;
  libraryCards: DashboardLibraryCard[];
  showCardsTab?: boolean;
}

export type CardType = 'rss' | 'photo' | 'note' | 'battery' | 'button';

export interface CardTemplate {
  id: CardType;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: ReactNode;
  defaultSize: CardSize;
  supportedSizes: CardSize[];
}
