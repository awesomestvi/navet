import { HeaderSearchInput } from '@navet/app/components/layout/header-search-input';
import { CardDialogHeader, NavigationWorkspace } from '@navet/app/components/patterns';
import {
  BaseCardDialog,
  Button,
  DialogFooter,
  IconButton,
  InteractivePill,
  Select,
} from '@navet/app/components/primitives';
import { type CardSize, getCardSizeRatio } from '@navet/app/components/shared/card-size-selector';
import { getAddCardDialogSurfaceTokens } from '@navet/app/components/shared/theme/add-card-dialog-surface-tokens';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { isAllRooms } from '@navet/app/constants/rooms';
import { type ThemeType, useI18n } from '@navet/app/hooks';
import { ArrowDownAZ, ArrowLeft, ArrowUpDown, ArrowUpZA, Layers2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import {
  type DashboardLibraryCard,
  type DashboardLibraryEntityType,
  DashboardLibraryList,
} from '../dashboard-library-list';
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
  libraryEntityTypes: DashboardLibraryEntityType[];
  selectedLibraryEntityType: string | null;
  setSelectedLibraryEntityType: (entityType: string | null) => void;
  libraryRooms: string[];
  selectedLibraryRoom: string | null;
  setSelectedLibraryRoom: (room: string | null) => void;
  librarySortDirection: 'asc' | 'desc' | null;
  setLibrarySortDirection: (direction: 'asc' | 'desc' | null) => void;
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
  libraryEntityTypes,
  selectedLibraryEntityType,
  setSelectedLibraryEntityType,
  libraryRooms,
  selectedLibraryRoom,
  setSelectedLibraryRoom,
  librarySortDirection,
  setLibrarySortDirection,
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
  const libraryEntityCount = libraryEntityTypes.reduce((total, type) => total + type.count, 0);
  const searchCountLabel = t('dashboard.addCard.librarySummary.available', { count: libraryCount });
  const SortIcon =
    librarySortDirection === 'asc'
      ? ArrowDownAZ
      : librarySortDirection === 'desc'
        ? ArrowUpZA
        : ArrowUpDown;
  const sortStateLabel =
    librarySortDirection === 'asc'
      ? t('dashboard.addCard.sort.ascending')
      : librarySortDirection === 'desc'
        ? t('dashboard.addCard.sort.descending')
        : t('dashboard.addCard.sort.default');
  const selectedTemplate = cardTemplates.find((template) => template.id === selectedType);
  const sizeOptions = selectedTemplate?.supportedSizes ?? [];
  const roomLabel = isAllRooms(currentRoom) ? t('dashboard.addCard.allRooms') : currentRoom;
  const heroTitle = cardsTabActive
    ? t('dashboard.addCard.libraryDescription')
    : t('dashboard.addCard.description', { room: roomLabel });

  return (
    <BaseCardDialog
      variant="fullscreen"
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
      contentClassName={`md:left-1/2 md:right-auto md:w-[calc(100%-4rem)] md:max-w-[1200px] md:-translate-x-1/2 ${surface.shellPanel} ${surface.border}`}
      shellBodyClassName="h-full min-h-0"
    >
      <NavigationWorkspace.Frame
        aria-label={t('dashboard.addCard.title')}
        className="h-full max-h-full rounded-none border-0 bg-transparent shadow-none"
      >
        <NavigationWorkspace.Header
          className={`z-10 shrink-0 border-b px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-4 sm:px-5 sm:pt-5 ${borderColor} ${
            theme === 'glass' ? 'bg-transparent' : 'bg-inherit/95 backdrop-blur-xl'
          }`}
        >
          <CardDialogHeader
            title={t('dashboard.addCard.title')}
            description={heroTitle}
            theme={theme}
            editableTitle={false}
            showRoomSelector={false}
            className="mb-0"
          />

          {showCardsTab ? (
            <div className="mt-3 flex flex-wrap gap-2 md:hidden">
              <InteractivePill
                active={activeTab === 'cards'}
                icon={Layers2}
                intent="navigation"
                size="compact"
                onClick={() => {
                  setActiveTab('cards');
                  setSelectedLibraryEntityType(null);
                }}
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
                <span className="text-sm font-semibold">{t('dashboard.addCard.tab.widgets')}</span>
              </InteractivePill>
            </div>
          ) : null}
        </NavigationWorkspace.Header>

        <NavigationWorkspace.Body
          className={
            showCardsTab ? 'grid-cols-1 md:grid-cols-[16rem_minmax(0,1fr)]' : 'grid-cols-1'
          }
        >
          {showCardsTab ? (
            <NavigationWorkspace.Sidebar className="hidden md:block">
              <NavigationWorkspace.ScrollArea className="p-4">
                <nav aria-label={t('dashboard.addCard.title')} className="grid gap-1">
                  <NavigationWorkspace.Item
                    active={cardsTabActive && selectedLibraryEntityType === null}
                    accentColor={accent}
                  >
                    <NavigationWorkspace.ItemButton
                      aria-current={
                        cardsTabActive && selectedLibraryEntityType === null ? 'page' : undefined
                      }
                      onClick={() => {
                        setActiveTab('cards');
                        setSelectedLibraryEntityType(null);
                      }}
                    >
                      <NavigationWorkspace.ItemIcon>
                        <Layers2 className="h-4 w-4" />
                      </NavigationWorkspace.ItemIcon>
                      <NavigationWorkspace.ItemText
                        title={t('dashboard.addCard.tab.cards')}
                        description={t('dashboard.addCard.librarySummary.available', {
                          count: libraryEntityCount,
                        })}
                      />
                    </NavigationWorkspace.ItemButton>
                  </NavigationWorkspace.Item>

                  {libraryEntityTypes.map((entityType) => {
                    const EntityTypeIcon = entityType.icon ?? Layers2;
                    const active = cardsTabActive && selectedLibraryEntityType === entityType.key;

                    return (
                      <NavigationWorkspace.Item
                        key={entityType.key}
                        active={active}
                        accentColor={accent}
                      >
                        <NavigationWorkspace.ItemButton
                          aria-current={active ? 'page' : undefined}
                          onClick={() => {
                            setActiveTab('cards');
                            setSelectedLibraryEntityType(entityType.key);
                          }}
                        >
                          <NavigationWorkspace.ItemIcon>
                            <EntityTypeIcon className="h-4 w-4" />
                          </NavigationWorkspace.ItemIcon>
                          <NavigationWorkspace.ItemText
                            title={entityType.label}
                            description={t('dashboard.addCard.librarySummary.available', {
                              count: entityType.count,
                            })}
                          />
                        </NavigationWorkspace.ItemButton>
                      </NavigationWorkspace.Item>
                    );
                  })}

                  <NavigationWorkspace.Separator className="my-2" />

                  <NavigationWorkspace.Item active={!cardsTabActive} accentColor={accent}>
                    <NavigationWorkspace.ItemButton
                      aria-current={!cardsTabActive ? 'page' : undefined}
                      onClick={() => setActiveTab('widgets')}
                    >
                      <NavigationWorkspace.ItemIcon>
                        <Sparkles className="h-4 w-4" />
                      </NavigationWorkspace.ItemIcon>
                      <NavigationWorkspace.ItemText title={t('dashboard.addCard.tab.widgets')} />
                    </NavigationWorkspace.ItemButton>
                  </NavigationWorkspace.Item>
                </nav>
              </NavigationWorkspace.ScrollArea>
            </NavigationWorkspace.Sidebar>
          ) : null}

          <NavigationWorkspace.Content className="flex min-h-0 flex-col px-4 py-4 sm:px-5 sm:py-5">
            <div className="min-h-0 flex-1">
              {activeTab === 'cards' ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex shrink-0 items-center gap-2.5">
                    <div className="relative min-w-0 flex-1">
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
                        widthClassName={`rounded-[18px] sm:pr-40 ${borderColor}`}
                      />
                      {!hasLibraryQuery ? (
                        <span
                          className={`pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 text-[0.7rem] font-medium sm:block ${mutedColor}`}
                        >
                          {searchCountLabel}
                        </span>
                      ) : null}
                    </div>

                    <IconButton
                      label={`${t('dashboard.addCard.sort.label')}: ${sortStateLabel}`}
                      icon={<SortIcon className="h-4 w-4" aria-hidden="true" />}
                      size="small"
                      variant={librarySortDirection === null ? 'subtle' : 'secondary'}
                      data-sort-direction={librarySortDirection ?? 'none'}
                      aria-pressed={librarySortDirection !== null}
                      onClick={() =>
                        setLibrarySortDirection(
                          librarySortDirection === null
                            ? 'asc'
                            : librarySortDirection === 'asc'
                              ? 'desc'
                              : null
                        )
                      }
                      className="shrink-0"
                    />

                    <Select
                      aria-label={t('dashboard.addCard.filter.label')}
                      value={selectedLibraryRoom ?? ''}
                      onChange={(event) => setSelectedLibraryRoom(event.target.value || null)}
                      size="small"
                      accentColorOverride={accent}
                      containerClassName="w-[9.5rem] max-w-[42%] shrink-0 sm:w-44"
                      selectClassName="rounded-[18px]"
                    >
                      <option value="">{t('dashboard.addCard.filter.label')}</option>
                      {libraryRooms.map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="min-h-0 flex-1 pt-3">
                    <DashboardLibraryList
                      cards={filteredLibraryCards}
                      surface={surface}
                      accentColor={accent}
                      tileBackground={cardBg}
                      tileBorder={dialogSurface.tileBorder}
                      emptyText={t('dashboard.addCard.libraryEmpty')}
                      onAdd={handleAddFromLibrary}
                      fillAvailable
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-0 overflow-y-auto">
                  {selectedTemplate ? (
                    <div className="animate-in slide-in-from-right-4 fade-in mx-auto max-w-4xl space-y-5 duration-200">
                      <div
                        className="flex items-start gap-3.5 rounded-[18px] border px-3.5 py-3"
                        style={{
                          backgroundColor: cardBg,
                          borderColor: dialogSurface.tileBorder,
                        }}
                      >
                        <NavigationWorkspace.ItemIcon>
                          <span className="[&_svg]:h-4 [&_svg]:w-4">{selectedTemplate.icon}</span>
                        </NavigationWorkspace.ItemIcon>
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
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {sizeOptions.map((size) => (
                          <button
                            type="button"
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`rounded-[20px] border p-3 transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] ${hoverBg}`}
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
                      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                        {cardTemplates.map((template) => (
                          <button
                            type="button"
                            key={template.id}
                            onClick={() => {
                              setSelectedType(template.id);
                              setSelectedSize(template.defaultSize);
                            }}
                            className={`flex w-full items-start gap-3.5 rounded-[18px] border px-3.5 py-3 text-left transition-colors ${hoverBg}`}
                            style={{
                              backgroundColor: cardBg,
                              borderColor: dialogSurface.tileBorder,
                            }}
                          >
                            <NavigationWorkspace.ItemIcon>
                              <span className="[&_svg]:h-4 [&_svg]:w-4">{template.icon}</span>
                            </NavigationWorkspace.ItemIcon>
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
              <DialogFooter
                className={`mt-4 shrink-0 !justify-between border-t pt-4 ${borderColor}`}
              >
                <Button
                  type="button"
                  variant="secondary"
                  leading={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => setSelectedType(null)}
                  className="w-full sm:w-auto sm:min-w-[8rem]"
                >
                  {t('dashboard.onboarding.back')}
                </Button>
                <Button
                  type="button"
                  onClick={handleAdd}
                  className="w-full sm:w-auto sm:min-w-[10rem]"
                >
                  {t('dashboard.addCard.action')}
                </Button>
              </DialogFooter>
            ) : null}
          </NavigationWorkspace.Content>
        </NavigationWorkspace.Body>
      </NavigationWorkspace.Frame>
    </BaseCardDialog>
  );
}
