import * as Dialog from '@radix-ui/react-dialog';
import { Layers2, Search, Sparkles, X } from 'lucide-react';
import { type CardSize, getCardSizeRatio } from '@/app/components/shared/card-size-selector';
import { DialogShell } from '@/app/components/shared/dialog-shell';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
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
  setSelectedType: (type: CardType) => void;
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
  const bgColor = theme === 'light' ? 'bg-white' : surface.panel;
  const textColor = surface.textPrimary;
  const mutedColor = surface.textSecondary;
  const borderColor = surface.border;
  const cardBg = surface.panelMuted;
  const hoverBg = surface.hoverBg;
  const accent = getColorValue(primaryColor);
  const cardsTabActive = activeTab === 'cards';
  const widgetsTabActive = activeTab === 'widgets';
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
      contentClassName={`${bgColor} fixed left-1/2 top-1/2 z-50 flex w-[min(calc(100vw-2rem),38rem)] max-h-[min(84vh,46rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border ${borderColor}`}
      contentStyle={{ boxShadow: '0 24px 80px rgba(0, 0, 0, 0.36)' }}
    >
      <div className="sticky top-0 z-10 border-b border-white/10 bg-inherit/95 px-5 pb-4 pt-5 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className={`mb-2 text-[11px] font-medium tracking-[0.16em] ${surface.textMuted}`}>
              {cardsTabActive
                ? t('dashboard.addCard.header.library')
                : t('dashboard.addCard.header.widgets')}
            </div>
            <Dialog.Title className={`text-[1.625rem] font-semibold leading-none ${textColor}`}>
              {t('dashboard.addCard.title')}
            </Dialog.Title>
            <Dialog.Description className={`mt-2 max-w-[32rem] text-sm leading-6 ${mutedColor}`}>
              {cardsTabActive
                ? t('dashboard.addCard.libraryDescription')
                : t('dashboard.addCard.description', {
                    room: currentRoom === 'All' ? t('dashboard.addCard.allRooms') : currentRoom,
                  })}
            </Dialog.Description>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${hoverBg}`}
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.04)',
            }}
          >
            <X className={`h-4 w-4 ${mutedColor}`} />
          </button>
        </div>

        {showCardsTab ? (
          <div
            className="mt-5 grid grid-cols-2 gap-2 rounded-[22px] border p-1.5"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.03)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('cards')}
              className={`rounded-[18px] px-4 py-3 text-left transition-colors ${
                cardsTabActive ? textColor : mutedColor
              }`}
              style={{
                backgroundColor: cardsTabActive ? `${accent}24` : 'transparent',
                boxShadow: cardsTabActive ? `inset 0 0 0 1px ${accent}22` : 'none',
              }}
            >
              <div className="flex items-center gap-2">
                <Layers2 className="h-4 w-4" />
                <span className="text-sm font-semibold">{t('dashboard.addCard.tab.cards')}</span>
              </div>
              <div className="mt-1 text-xs opacity-80">{t('dashboard.addCard.tab.cardsHint')}</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('widgets')}
              className={`rounded-[18px] px-4 py-3 text-left transition-colors ${
                widgetsTabActive ? textColor : mutedColor
              }`}
              style={{
                backgroundColor: widgetsTabActive ? `${accent}24` : 'transparent',
                boxShadow: widgetsTabActive ? `inset 0 0 0 1px ${accent}22` : 'none',
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">{t('dashboard.addCard.tab.widgets')}</span>
              </div>
              <div className="mt-1 text-xs opacity-80">
                {t('dashboard.addCard.tab.widgetsHint')}
              </div>
            </button>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {activeTab === 'cards' ? (
          <div className="space-y-4">
            <div
              className={`rounded-[24px] border p-3 ${borderColor}`}
              style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
            >
              <div
                data-library-interactive="true"
                className={`flex items-center gap-2 rounded-[18px] border px-3 py-3 ${borderColor} ${cardBg}`}
              >
                <Search className={`h-4 w-4 shrink-0 ${mutedColor}`} />
                <input
                  type="text"
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.target.value)}
                  placeholder={t('dashboard.addCard.searchPlaceholder')}
                  className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${textColor}`}
                  style={{ caretColor: accent }}
                />
              </div>
              <div className={`mt-3 flex items-center justify-between px-1 text-xs ${mutedColor}`}>
                <span>{cardsSummary}</span>
                <span>{t('dashboard.addCard.libraryHint.tapToAdd')}</span>
              </div>
            </div>

            <DashboardLibraryList
              cards={filteredLibraryCards}
              surface={surface}
              emptyText={t('dashboard.addCard.libraryEmpty')}
              onAdd={handleAddFromLibrary}
              height={360}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className={`mb-3 text-sm font-medium ${textColor}`}>
                {t('dashboard.addCard.chooseType')}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {cardTemplates.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => {
                      setSelectedType(template.id);
                      setSelectedSize(template.defaultSize);
                    }}
                    className={`flex items-start rounded-[22px] border p-4 text-left transition-all ${
                      selectedType === template.id
                        ? 'border-current'
                        : `border-transparent ${cardBg} ${hoverBg}`
                    }`}
                    style={{
                      borderColor: selectedType === template.id ? accent : 'rgba(255,255,255,0.05)',
                      backgroundColor: selectedType === template.id ? `${accent}10` : undefined,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                        style={{
                          backgroundColor:
                            selectedType === template.id
                              ? `${accent}22`
                              : theme === 'light'
                                ? '#f3f4f6'
                                : 'rgba(255, 255, 255, 0.05)',
                          color:
                            selectedType === template.id
                              ? accent
                              : theme === 'light'
                                ? '#374151'
                                : 'rgba(255, 255, 255, 0.78)',
                        }}
                      >
                        {template.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className={`mb-1 text-sm font-semibold ${textColor}`}>
                          {t(template.nameKey)}
                        </h4>
                        <p className={`text-xs leading-5 ${mutedColor}`}>
                          {t(template.descriptionKey)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedType ? (
              <div>
                <h3 className={`mb-3 text-sm font-medium ${textColor}`}>
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
                          style={{
                            backgroundColor:
                              theme === 'light' ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.03)',
                          }}
                        >
                          <div
                            className="rounded"
                            style={{
                              ...(() => {
                                const { cols, rows } = getCardSizeRatio(size);
                                return { width: cols * 18, height: rows * 18 };
                              })(),
                              backgroundColor:
                                selectedSize === size
                                  ? accent
                                  : theme === 'light'
                                    ? '#d1d5db'
                                    : 'rgba(255, 255, 255, 0.2)',
                            }}
                          />
                        </div>
                        <p className={`text-xs font-medium ${textColor}`}>{t(cardSizeKey(size))}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {activeTab === 'widgets' ? (
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
      ) : null}
    </DialogShell>
  );
}
