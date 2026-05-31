import { DashboardEmptyState } from '@navet/app/components/patterns';
import type { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { Wand2 } from 'lucide-react';
import type { HomeEditorSection } from '../hooks/use-home-dashboard-editor';
import type { CustomCard } from '../stores/custom-cards-store';
import { NOOP_REMOVE_FROM_LAYOUT } from './home-dashboard-overview.shared';
import { CardGrid } from './home-dashboard-overview-card-grid';
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

export function HomePresentation({
  flowCards,
  sections,
  gridCols,
  isPortraitHome,
  allCards,
  cardSizes,
  updateCardSize,
  onUpdateCard,
  showHero,
  isSectioned,
  accentColor,
  surface,
  emptyTitle,
  emptyDescription,
  onToggleEditMode,
}: {
  flowCards: string[];
  sections: HomeEditorSection[];
  gridCols: number;
  isPortraitHome: boolean;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, import('@navet/app/components/shared/card-size-selector').CardSize>;
  updateCardSize: (
    id: string,
    size: import('@navet/app/components/shared/card-size-selector').CardSize
  ) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  showHero: boolean;
  isSectioned: boolean;
  accentColor: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  emptyTitle: string;
  emptyDescription: string;
  onToggleEditMode?: () => void;
}) {
  const sectionGridCols = gridCols;
  const hasCards = flowCards.length > 0 || sections.some((section) => section.cardIds.length > 0);
  const nonEmptySections = sections.filter((section) => section.cardIds.length > 0);

  if (!hasCards) {
    return (
      <div className="py-4">
        <DashboardEmptyState
          title={emptyTitle}
          description={emptyDescription}
          surface={surface}
          accentColor={accentColor}
          actionLabel="Edit dashboard"
          onAction={onToggleEditMode}
          actionIcon={Wand2}
          className="mx-auto max-w-3xl"
        />
      </div>
    );
  }

  if (!isSectioned) {
    return (
      <CardGrid
        cardIds={flowCards}
        gridCols={sectionGridCols}
        allCards={allCards}
        cardSizes={cardSizes}
        updateCardSize={updateCardSize}
        isEditMode={false}
        onUpdateCard={onUpdateCard}
        onRemoveFromLayout={NOOP_REMOVE_FROM_LAYOUT}
        showHero={showHero}
        sortable={false}
      />
    );
  }

  return (
    <div className="space-y-7 md:space-y-8">
      <SectionRowRenderer
        sections={nonEmptySections}
        sectionGridCols={sectionGridCols}
        isPortraitHome={isPortraitHome}
        activeSectionId={null}
        activeDragColumn={null}
        activeDragSection={null}
        activeDragCard={null}
        accentColor={accentColor}
        allCards={allCards}
        cardSizes={cardSizes}
        updateCardSize={updateCardSize}
        isEditMode={false}
        onRemoveFromLayout={NOOP_REMOVE_FROM_LAYOUT}
        showHero={showHero}
        onSelectSection={() => {}}
        onOpenLibraryForSection={() => {}}
        onAddSectionBelow={() => {}}
        onRenameSection={() => {}}
        onRemoveSection={() => {}}
        onResizeSection={() => {}}
        surface={surface}
        renderMode="presentation"
      />
      {flowCards.length > 0 ? (
        <CardGrid
          cardIds={flowCards}
          gridCols={sectionGridCols}
          allCards={allCards}
          cardSizes={cardSizes}
          updateCardSize={updateCardSize}
          isEditMode={false}
          onUpdateCard={onUpdateCard}
          onRemoveFromLayout={NOOP_REMOVE_FROM_LAYOUT}
          showHero={showHero}
          sortable={false}
        />
      ) : null}
    </div>
  );
}
