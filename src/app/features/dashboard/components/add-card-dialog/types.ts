import type { ReactNode } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { TranslationKey } from '@/app/i18n';
import type { CardType } from '../../stores/custom-cards-store';
import type { DashboardLibraryCard } from '../dashboard-library-list';

export interface AddCardDialogContainerProps {
  open: boolean;
  onClose: () => void;
  onAddCard: (template: CardTemplate, size: CardSize) => void;
  onAddLibraryCard: (cardId: string) => void;
  currentRoom: string;
  libraryCards: DashboardLibraryCard[];
  showCardsTab?: boolean;
}

export type CardTemplateId = CardType | 'scene';

export interface CardTemplate {
  id: CardTemplateId;
  cardType: CardType;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: ReactNode;
  defaultSize: CardSize;
  supportedSizes: CardSize[];
  initialData?: Record<string, unknown>;
}
