import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { CardType } from '@navet/app/features/dashboard/stores/custom-cards-store';
import type { TranslationKey } from '@navet/app/i18n';
import type { ReactNode } from 'react';
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
