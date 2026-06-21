import { HeaderSearchInput } from '@navet/app/components/layout/header-search-input';
import { CardDialogHeader } from '@navet/app/components/patterns';
import {
  BaseCardDialog,
  Button,
  DialogFooter,
  InteractivePill,
} from '@navet/app/components/primitives';
import { type CardSize, getCardSizeRatio } from '@navet/app/components/shared/card-size-selector';
import { getAddCardDialogSurfaceTokens } from '@navet/app/components/shared/theme/add-card-dialog-surface-tokens';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { isAllRooms } from '@navet/app/constants/rooms';
import { type ThemeType, useI18n } from '@navet/app/hooks';
import { ArrowLeft, Layers2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { type DashboardLibraryCard, DashboardLibraryList } from '../dashboard-library-list';
import type { CardTemplate, CardTemplateId } from './types';

function cardSizeKey(size: CardSize): `dashboard.addCard.size.${CardSize}` {
  return `dashboard.addCard.size.${size}`;
}

interface AddCardDialogViewProps {
  open: boolean;
  onClose: () => void;
  currentRoom: string;
  activeTab: 'cards' | 'widgets';
  setActiveTab: (tab: 'cards' | 'widgets') => void;
  showCardsTab: boolean;
  libraryQuery: string;
  setLibraryQuery: (query: string) => void;
  hasLibraryQuery: boolean;
  libraryCount: number;
  filteredLibraryCards: DashboardLibraryCard[];
  theme: ThemeType;
  primaryColor: string;
  cardTemplates: CardTemplate[];
  selectedType: CardTemplateId | null;
  setSelectedType: (type: CardTemplateId | null) => void;
  selectedSize: CardSize;
  setSelectedSize: (size: CardSize) => void;
  getColorValue: (color: string) => string;
  handleAdd: () => void;
  handleAddFromLibrary: (cardId: string) => void;
}

export function AddCardDialogView({
  open,
  onClose,
  currentRoom,
  activeTab,
  setActiveTab,
  showCardsTab,
  libraryQuery,
  setLibraryQuery,
  hasLibraryQuery,
  libraryCount,
  filteredLibraryCards,
  theme,
  primaryColor,
  cardTemplates,
  selectedType,
  setSelectedType,
  selectedSize,
  setSelectedSize,
  getColorValue,
  handleAdd,
  handleAddFromLibrary,
}: AddCardDialogViewProps) {
  const { t } = useI18n();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  if (!open) return null;

  const surface = getThemeSurfaceTokens(theme);
  const dialogSurface = getAddCardDialogSurfaceTokens(theme);
  const textColor = surface.textPrimary;
  const mutedColor = surface.textSecondary;
  const borderColor = surface.border;
  const hoverBg = surface.hoverBg;
  const accent = getColorValue(primaryColor);
  const sizePreviewTileBg = dialogSurface.sizePreviewTileBg;
  const inactiveSizeSwatchBg = dialogSurface.inactiveSizeSwatchBg;
  const cardBg = surface.panelMuted;
  const cardsTabActive = activeTab === 'cards';
  const searchCountLabel = t('dashboard.addCard.librarySummary.available', { count: libraryCount });
  const selectedTemplate = cardTemplates.find((template) => template.id === selectedType);
  const sizeOptions = selectedTemplate?.supportedSizes ?? [];
  const roomLabel = isAllRooms(currentRoom) ? t('dashboard.addCard.allRooms') : currentRoom;
  const heroTitle = cardsTabActive
    ? t('dashboard.addCard.libraryDescription')
    : t('dashboard.addCard.description', { room: roomLabel });

  return (
    <BaseCardDialog
      variant="modal"
      isOpen={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      title={t('dashboard.addCard.title')}
      description={heroTitle}
      theme={theme}
      disableOpenAutoFocus
      maxWidth="md"
      height="capped"
      bodyPadding={false}
      shellBodyClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="max-h-[85vh] w-full min-w-0 overflow-y-auto">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={`sticky top-0 z-10 px-4 pt-2 sm:px-5 sm:pt-5 ${
              theme === 'glass' ? 'bg-transparent' : 'bg-inherit/95 backdrop-blur-xl'
            }`}
          >
            <CardDialogHeader
              title={t('dashboard.addCard.title')}
              description={heroTitle}
              editableTitle={false}
              showRoomSelector={false}
              className="mb-0"
              titleStyle={{ color: textColor }}
              descriptionStyle={{ color: mutedColor }}
              actionButtonStyle={{ color: mutedColor }}
            />

            {showCardsTab ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <InteractivePill
                  active={activeTab === 'cards'}
                  icon={Layers2}
                  intent="navigation"
                  size="compact"
                  onClick={() => setActiveTab('cards')}
                  className="justify-start rounded-full px-3.5 text-left"
                >
                  <span className="text-sm font-semibold">{t('dashboard.addCard.tab.cards')}</span>
                </InteractivePill>

                <InteractivePill
                  active={activeTab === 'widgets'}
                  icon={Sparkles}
                  intent="navigation"
                  size="compact"
                  onClick={() => setActiveTab('widgets')}
                  className="justify-start rounded-full px-3.5 text-left"
                >
                  <span className="text-sm font-semibold">
                    {t('dashboard.addCard.tab.widgets')}
                  </span>
                </InteractivePill>
              </div>
            ) : null}
          </div>

          <div
            className={
              activeTab === 'cards'
                ? 'min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5'
                : 'px-4 py-4 sm:px-5 sm:py-5'
            }
          >
            {activeTab === 'cards' ? (
              <div className="space-y-4">
                <div className="relative">
                  <HeaderSearchInput
                    activeColorValue={accent}
                    hoverBg={hoverBg}
                    inputBg={cardBg}
                    isSearchActive={hasLibraryQuery}
                    isSearchFocused={isSearchFocused}
                    onBlur={() => setIsSearchFocused(false)}
                    onChange={setLibraryQuery}
                    onClear={() => setLibraryQuery('')}
                    onFocus={() => setIsSearchFocused(true)}
                    placeholder={t('dashboard.addCard.searchPlaceholder')}
                    query={libraryQuery}
                    textPrimary={textColor}
                    textSecondary={mutedColor}
                    widthClassName={`rounded-[18px] pr-34 sm:pr-40 ${borderColor}`}
                  />
                  {!hasLibraryQuery ? (
                    <span
                      className={`pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 text-[0.7rem] font-medium sm:block ${mutedColor}`}
                    >
                      {searchCountLabel}
                    </span>
                  ) : null}
                </div>

                <DashboardLibraryList
                  cards={filteredLibraryCards}
                  surface={surface}
                  accentColor={accent}
                  iconBackground={dialogSurface.iconBackground}
                  tileBackground={cardBg}
                  tileBorder={dialogSurface.tileBorder}
                  emptyText={t('dashboard.addCard.libraryEmpty')}
                  onAdd={handleAddFromLibrary}
                  height={360}
                />
              </div>
            ) : (
              <div className="max-sm:max-h-[24rem] max-sm:overflow-y-auto">
                {selectedTemplate ? (
                  <div className="animate-in slide-in-from-right-4 fade-in space-y-5 duration-200">
                    <button
                      type="button"
                      onClick={() => setSelectedType(null)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${borderColor} ${cardBg} ${hoverBg} ${textColor}`}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      {t('dashboard.onboarding.back')}
                    </button>

                    <div
                      className="flex items-center gap-3.5 rounded-[18px] border px-3.5 py-3"
                      style={{
                        backgroundColor: cardBg,
                        borderColor: dialogSurface.tileBorder,
                      }}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: dialogSurface.iconBackground, color: accent }}
                      >
                        <span className="[&_svg]:h-4 [&_svg]:w-4">{selectedTemplate.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className={`truncate text-sm font-semibold ${textColor}`}>
                          {t(selectedTemplate.nameKey)}
                        </h3>
                        <p className={`mt-1.5 text-xs ${mutedColor}`}>
                          {t(selectedTemplate.descriptionKey)}
                        </p>
                      </div>
                    </div>

                    <h3 className={`text-sm font-medium ${textColor}`}>
                      {t('dashboard.addCard.chooseSize')}
                    </h3>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {sizeOptions.map((size) => (
                        <button
                          type="button"
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`rounded-[20px] border p-3 transition-all ${hoverBg}`}
                          style={{
                            borderColor:
                              selectedSize === size ? `${accent}55` : dialogSurface.tileBorder,
                            backgroundColor: selectedSize === size ? `${accent}10` : cardBg,
                          }}
                        >
                          <div className="text-center">
                            <div
                              className="mx-auto mb-2.5 flex h-12 items-center justify-center rounded-[14px]"
                              style={{ backgroundColor: sizePreviewTileBg }}
                            >
                              <div
                                className="rounded"
                                style={{
                                  ...(() => {
                                    const { cols, rows } = getCardSizeRatio(size);
                                    return { width: cols * 18, height: rows * 18 };
                                  })(),
                                  backgroundColor:
                                    selectedSize === size ? accent : inactiveSizeSwatchBg,
                                }}
                              />
                            </div>
                            <p className={`text-xs font-medium ${textColor}`}>
                              {t(cardSizeKey(size))}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="animate-in slide-in-from-left-4 fade-in duration-200">
                    <h3 className={`mb-3 text-sm font-medium ${textColor}`}>
                      {t('dashboard.addCard.chooseType')}
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {cardTemplates.map((template) => (
                        <button
                          type="button"
                          key={template.id}
                          onClick={() => {
                            setSelectedType(template.id);
                            setSelectedSize(template.defaultSize);
                          }}
                          className={`flex w-full items-center gap-3.5 rounded-[18px] border px-3.5 py-3 text-left transition-colors ${hoverBg}`}
                          style={{
                            backgroundColor: cardBg,
                            borderColor: dialogSurface.tileBorder,
                          }}
                        >
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: dialogSurface.iconBackground }}
                          >
                            <span className={`${mutedColor} [&_svg]:h-4 [&_svg]:w-4`}>
                              {template.icon}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className={`truncate text-sm font-semibold ${textColor}`}>
                              {t(template.nameKey)}
                            </h4>
                            <p className={`mt-1.5 text-xs ${mutedColor}`}>
                              {t(template.descriptionKey)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {activeTab === 'widgets' && selectedTemplate ? (
            <DialogFooter className="mt-0 shrink-0 px-5 pb-4">
              <Button
                type="button"
                onClick={handleAdd}
                className="w-full sm:w-auto sm:min-w-[10rem]"
              >
                {t('dashboard.addCard.action')}
              </Button>
            </DialogFooter>
          ) : null}
        </div>
      </div>
    </BaseCardDialog>
  );
}
