import type { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { DeviceWithType } from '@navet/app/types/device.types';
import type { HomeEditorSection } from '../hooks/use-home-dashboard-editor';
import type { CustomCard } from '../stores/custom-cards-store';
import { SectionRowRenderer } from './home-dashboard-section-row-renderer';

export function SectionCanvasGrid({
  sections,
  sectionGridCols,
  isPortraitHome,
  activeSectionId,
  activeDragColumn,
  activeDragSection,
  activeDragCard,
  accentColor,
  allCards,
  cardSizes,
  updateCardSize,
  isEditMode,
  onUpdateCard,
  onRemoveFromLayout,
  showHero,
  onSelectSection,
  onOpenLibraryForSection,
  onOpenAddCardDialog,
  onAddSectionBelow,
  onRenameSection,
  onRemoveSection,
  onResizeSection,
  surface,
}: {
  sections: HomeEditorSection[];
  sectionGridCols: number;
  isPortraitHome: boolean;
  activeSectionId: string | null;
  activeDragColumn: string | null;
  activeDragSection: string | null;
  activeDragCard: string | null;
  accentColor: string;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, import('@navet/app/components/shared/card-size-selector').CardSize>;
  updateCardSize: (
    id: string,
    size: import('@navet/app/components/shared/card-size-selector').CardSize
  ) => void;
  isEditMode: boolean;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveFromLayout: (cardId: string) => void;
  showHero: boolean;
  onSelectSection: (sectionId: string) => void;
  onOpenLibraryForSection: (sectionId: string) => void;
  onOpenAddCardDialog?: (sectionId?: string) => void;
  onAddSectionBelow: (sectionId: string) => void;
  onRenameSection: (sectionId: string, title: string) => void;
  onRemoveSection: (sectionId: string) => void;
  onResizeSection: (
    sectionId: string,
    newW: number,
    minWidthsBySection?: Record<string, number>
  ) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  return (
    <SectionRowRenderer
      sections={sections}
      sectionGridCols={sectionGridCols}
      isPortraitHome={isPortraitHome}
      activeSectionId={activeSectionId}
      activeDragColumn={activeDragColumn}
      activeDragSection={activeDragSection}
      activeDragCard={activeDragCard}
      accentColor={accentColor}
      allCards={allCards}
      cardSizes={cardSizes}
      updateCardSize={updateCardSize}
      isEditMode={isEditMode}
      onUpdateCard={onUpdateCard}
      onRemoveFromLayout={onRemoveFromLayout}
      showHero={showHero}
      onSelectSection={onSelectSection}
      onOpenLibraryForSection={onOpenLibraryForSection}
      onOpenAddCardDialog={onOpenAddCardDialog}
      onAddSectionBelow={onAddSectionBelow}
      onRenameSection={onRenameSection}
      onRemoveSection={onRemoveSection}
      onResizeSection={onResizeSection}
      surface={surface}
      renderMode="edit"
    />
  );
}
