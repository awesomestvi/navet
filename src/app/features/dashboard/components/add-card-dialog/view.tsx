import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, Layers2, Search, Sparkles, X } from 'lucide-react';
import {
  DialogShell,
  Input,
  TabList,
  TabPanel,
  Tabs,
  TabTrigger,
} from '@/app/components/primitives';
import { type CardSize, getCardSizeRatio } from '@/app/components/shared/card-size-selector';
import { getAddCardDialogSurfaceTokens } from '@/app/components/shared/theme/add-card-dialog-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { isAllRooms } from '@/app/constants/rooms';
import { type ThemeType, useI18n } from '@/app/hooks';
import { type DashboardLibraryCard, DashboardLibraryList } from '../dashboard-library-list';
import type { CardTemplate, CardType } from './types';

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
  selectedType: CardType | null;
  setSelectedType: (type: CardType | null) => void;
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
  if (!open) return null;

  const surface = getThemeSurfaceTokens(theme);
  const dialogSurface = getAddCardDialogSurfaceTokens(theme);
  const textColor = surface.textPrimary;
  const mutedColor = surface.textSecondary;
  const borderColor = surface.border;
  const cardBg = surface.panelMuted;
  const hoverBg = surface.hoverBg;
  const accent = getColorValue(primaryColor);
  const sizePreviewTileBg = dialogSurface.sizePreviewTileBg;
  const inactiveSizeSwatchBg = dialogSurface.inactiveSizeSwatchBg;
  const cardsTabActive = activeTab === 'cards';
  const cardsSummary = hasLibraryQuery
    ? t('dashboard.addCard.librarySummary.matching', { count: libraryCount })
    : t('dashboard.addCard.librarySummary.available', { count: libraryCount });
  const selectedTemplate = cardTemplates.find((template) => template.id === selectedType);
  const sizeOptions = selectedTemplate?.supportedSizes ?? [];

  return (
    <DialogShell
      isOpen={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={`${surface.panel} fixed left-1/2 top-1/2 z-50 flex w-[min(calc(100vw-2rem),38rem)] max-h-[min(84vh,46rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border ${borderColor}`}
      bodyClassName="flex min-h-0 flex-1 flex-col"
      contentStyle={{ boxShadow: '0 24px 80px rgba(0, 0, 0, 0.36)' }}
    >
      <Tabs
        value={activeTab}
        defaultValue={showCardsTab ? 'cards' : 'widgets'}
        onValueChange={(value) => setActiveTab(value as 'cards' | 'widgets')}
      >
        <div className="sticky top-0 z-10 border-b border-white/10 bg-inherit/95 px-4 pb-3 pt-2 backdrop-blur-xl sm:px-5 sm:pb-4 sm:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className={`mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
              >
                {cardsTabActive
                  ? t('dashboard.addCard.header.library')
                  : t('dashboard.addCard.header.widgets')}
              </div>
              <Dialog.Title
                className={`text-base font-semibold leading-tight sm:text-2xl sm:leading-none ${textColor}`}
              >
                {t('dashboard.addCard.title')}
              </Dialog.Title>
              <Dialog.Description
                className={`mt-0.5 max-w-[32rem] text-xs leading-5 sm:mt-2 sm:text-sm sm:leading-6 ${mutedColor}`}
              >
                {cardsTabActive
                  ? t('dashboard.addCard.libraryDescription')
                  : t('dashboard.addCard.description', {
                      room: isAllRooms(currentRoom) ? t('dashboard.addCard.allRooms') : currentRoom,
                    })}
              </Dialog.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border transition-colors ${hoverBg}`}
              style={{
                borderColor: 'rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(255,255,255,0.04)',
              }}
            >
              <X className={`h-4 w-4 ${mutedColor}`} />
            </button>
          </div>

          {showCardsTab ? (
            <TabList variant="segmented" size="compact" className="mt-3 grid-cols-2 sm:mt-5">
              <TabTrigger
                value="cards"
                size="compact"
                className="justify-start rounded-[16px] text-left sm:h-auto sm:flex-col sm:items-start sm:rounded-[18px] sm:px-4 sm:py-2.5"
              >
                <span className="flex items-center gap-2">
                  <Layers2 className="h-4 w-4" />
                  <span className="text-sm font-semibold">{t('dashboard.addCard.tab.cards')}</span>
                </span>
                <span className="mt-0.5 hidden text-xs opacity-80 sm:block">
                  {t('dashboard.addCard.tab.cardsHint')}
                </span>
              </TabTrigger>

              <TabTrigger
                value="widgets"
                size="compact"
                className="justify-start rounded-[16px] text-left sm:h-auto sm:flex-col sm:items-start sm:rounded-[18px] sm:px-4 sm:py-2.5"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    {t('dashboard.addCard.tab.widgets')}
                  </span>
                </span>
                <span className="mt-0.5 hidden text-xs opacity-80 sm:block">
                  {t('dashboard.addCard.tab.widgetsHint')}
                </span>
              </TabTrigger>
            </TabList>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <TabPanel value="cards" className="space-y-4">
            <div
              className={`rounded-[22px] border p-2.5 sm:rounded-[24px] sm:p-3 ${borderColor}`}
              style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
            >
              <Input
                type="text"
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                placeholder={t('dashboard.addCard.searchPlaceholder')}
                leading={<Search className={`h-4 w-4 ${mutedColor}`} />}
                containerClassName="relative"
                inputClassName={`${borderColor} ${cardBg} ${textColor}`}
                style={{ caretColor: accent }}
              />
              <div
                className={`mt-2.5 flex items-center justify-between px-1 text-xs ${mutedColor}`}
              >
                <span>{cardsSummary}</span>
                <span className="max-sm:hidden">{t('dashboard.addCard.libraryHint.tapToAdd')}</span>
              </div>
            </div>

            <DashboardLibraryList
              cards={filteredLibraryCards}
              surface={surface}
              emptyText={t('dashboard.addCard.libraryEmpty')}
              onAdd={handleAddFromLibrary}
              height={360}
            />
          </TabPanel>

          <TabPanel value="widgets" className="max-sm:max-h-[24rem] max-sm:overflow-y-auto">
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
                  className={`flex items-center gap-3.5 rounded-[18px] border px-3.5 py-3 ${borderColor}`}
                  style={{ backgroundColor: `${accent}10`, borderColor: `${accent}55` }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${accent}22`, color: accent }}
                  >
                    <span className="[&_svg]:h-4 [&_svg]:w-4">{selectedTemplate.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`truncate text-sm font-semibold ${textColor}`}>
                      {t(selectedTemplate.nameKey)}
                    </h3>
                    <p className={`mt-1.5 truncate text-xs ${mutedColor}`}>
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
                      className={`rounded-[20px] border p-3 transition-all ${
                        selectedSize === size
                          ? 'border-current'
                          : `border-transparent ${cardBg} ${hoverBg}`
                      }`}
                      style={{
                        borderColor: selectedSize === size ? accent : 'rgba(255,255,255,0.05)',
                        backgroundColor: selectedSize === size ? `${accent}10` : undefined,
                      }}
                    >
                      <div className="text-center">
                        <div
                          className="mx-auto mb-2 flex h-12 items-center justify-center rounded-xl"
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
                        <p className={`text-xs font-medium ${textColor}`}>{t(cardSizeKey(size))}</p>
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
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {cardTemplates.map((template) => (
                    <button
                      type="button"
                      key={template.id}
                      onClick={() => {
                        setSelectedType(template.id);
                        setSelectedSize(template.defaultSize);
                      }}
                      className={`flex w-full items-center gap-3.5 rounded-[18px] border px-3.5 py-3 text-left transition-colors ${borderColor} ${cardBg} ${hoverBg}`}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                      >
                        <span className={`${mutedColor} [&_svg]:h-4 [&_svg]:w-4`}>
                          {template.icon}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className={`truncate text-sm font-semibold ${textColor}`}>
                          {t(template.nameKey)}
                        </h4>
                        <p className={`mt-1.5 truncate text-xs ${mutedColor}`}>
                          {t(template.descriptionKey)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabPanel>
        </div>

        <TabPanel value="widgets" className="shrink-0">
          <div className="border-t border-white/10 px-5 py-4">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!selectedType}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-white transition-all"
                style={{
                  backgroundColor: selectedType ? accent : '#6b7280',
                  opacity: selectedType ? 1 : 0.5,
                  cursor: selectedType ? 'pointer' : 'not-allowed',
                }}
              >
                {t('dashboard.addCard.action')}
              </button>
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </DialogShell>
  );
}
