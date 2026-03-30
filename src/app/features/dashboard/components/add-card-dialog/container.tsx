import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useTheme } from '@/app/hooks';
import { cardTemplates } from './templates';
import type { AddCardDialogContainerProps, CardType } from './types';
import { AddCardDialogView } from './view';

export function AddCardDialogContainer({
  open,
  onClose,
  onAddCard,
  onAddLibraryCard,
  currentRoom,
  libraryCards,
}: AddCardDialogContainerProps) {
  const { theme, primaryColor } = useTheme();
  const [activeTab, setActiveTab] = useState<'cards' | 'widgets'>('cards');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [recentlyAddedLibraryCardIds, setRecentlyAddedLibraryCardIds] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<CardType | null>(null);
  const [selectedSize, setSelectedSize] = useState<CardSize>('medium');
  const resolveColorValue = (color: string) => getThemeColorValue(color as typeof primaryColor);

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab('cards');
    setLibraryQuery('');
    setRecentlyAddedLibraryCardIds([]);
    setSelectedType(null);
    setSelectedSize('medium');
  }, [open]);

  const handleAdd = () => {
    if (selectedType) {
      onAddCard(selectedType, selectedSize);
      setSelectedType(null);
      setSelectedSize('medium');
    }
  };

  const handleAddFromLibrary = (cardId: string) => {
    setRecentlyAddedLibraryCardIds((current) =>
      current.includes(cardId) ? current : [...current, cardId]
    );
    onAddLibraryCard(cardId);
  };

  const normalizeSearchText = useCallback(
    (value: string) =>
      value
        .toLowerCase()
        .replace(/[._-]+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    []
  );

  const visibleLibraryCards = useMemo(() => {
    if (recentlyAddedLibraryCardIds.length === 0) {
      return libraryCards;
    }

    const recentlyAddedIds = new Set(recentlyAddedLibraryCardIds);
    return libraryCards.filter((card) => !recentlyAddedIds.has(card.id));
  }, [libraryCards, recentlyAddedLibraryCardIds]);

  const filteredLibraryCards = useMemo(() => {
    const rawTerms = libraryQuery.trim().split(/\s+/).filter(Boolean);

    if (rawTerms.length === 0) {
      return visibleLibraryCards;
    }

    return visibleLibraryCards.filter((card) => {
      const rawSearchableText =
        `${card.title} ${card.subtitle} ${card.meta} ${card.kind} ${card.id}`.toLowerCase();
      const searchableText = normalizeSearchText(rawSearchableText);

      return rawTerms.every((rawTerm) => {
        const loweredRawTerm = rawTerm.toLowerCase();
        const normalizedTerm = normalizeSearchText(rawTerm);
        const hasDotSyntax = loweredRawTerm.includes('.');

        if (hasDotSyntax) {
          return rawSearchableText.includes(loweredRawTerm);
        }

        return (
          rawSearchableText.includes(loweredRawTerm) ||
          (!!normalizedTerm && searchableText.includes(normalizedTerm))
        );
      });
    });
  }, [libraryQuery, normalizeSearchText, visibleLibraryCards]);

  const hasLibraryQuery = libraryQuery.trim().length > 0;

  return (
    <AddCardDialogView
      open={open}
      onClose={onClose}
      currentRoom={currentRoom}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      showCardsTab
      libraryQuery={libraryQuery}
      setLibraryQuery={setLibraryQuery}
      hasLibraryQuery={hasLibraryQuery}
      libraryCount={filteredLibraryCards.length}
      filteredLibraryCards={filteredLibraryCards}
      theme={theme}
      primaryColor={primaryColor}
      cardTemplates={cardTemplates}
      selectedType={selectedType}
      setSelectedType={setSelectedType}
      selectedSize={selectedSize}
      setSelectedSize={setSelectedSize}
      getColorValue={resolveColorValue}
      handleAdd={handleAdd}
      handleAddFromLibrary={handleAddFromLibrary}
    />
  );
}
