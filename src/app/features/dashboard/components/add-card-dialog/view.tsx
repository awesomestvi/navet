import { X } from 'lucide-react';
import { type CardSize, isExtraSmallCardSize } from '@/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { type ThemeType, useI18n } from '@/app/hooks';
import type { CardTemplate, CardType } from './types';

function cardSizeKey(size: CardSize): `dashboard.addCard.size.${CardSize}` {
  return `dashboard.addCard.size.${size}`;
}

interface AddCardDialogViewProps {
  open: boolean;
  onClose: () => void;
  currentRoom: string;
  theme: ThemeType;
  primaryColor: string;
  cardTemplates: CardTemplate[];
  selectedType: CardType | null;
  setSelectedType: (type: CardType) => void;
  selectedSize: CardSize;
  setSelectedSize: (size: CardSize) => void;
  selectedTemplate: CardTemplate | undefined;
  getColorValue: (color: string) => string;
  handleAdd: () => void;
}

export function AddCardDialogView({
  open,
  onClose,
  currentRoom,
  theme,
  primaryColor,
  cardTemplates,
  selectedType,
  setSelectedType,
  selectedSize,
  setSelectedSize,
  selectedTemplate,
  getColorValue,
  handleAdd,
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

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${surface.dialogBackdrop}`}
    >
      <div
        className={`${bgColor} rounded-2xl border ${borderColor} w-full max-w-2xl max-h-[80vh] overflow-y-auto`}
        style={{
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-inherit z-10">
          <div>
            <h2 className={`text-xl font-semibold ${textColor}`}>{t('dashboard.addCard.title')}</h2>
            <p className={`text-sm ${mutedColor} mt-1`}>
              {t('dashboard.addCard.description', {
                room: currentRoom === 'All' ? t('dashboard.addCard.allRooms') : currentRoom,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-full ${cardBg} ${hoverBg} flex items-center justify-center transition-colors`}
          >
            <X className={`w-4 h-4 ${mutedColor}`} />
          </button>
        </div>

        {/* Card Templates Grid */}
        <div className="p-6 space-y-6">
          <div>
            <h3 className={`text-sm font-medium ${textColor} mb-3`}>
              {t('dashboard.addCard.chooseType')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cardTemplates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => {
                    setSelectedType(template.id);
                    setSelectedSize(template.defaultSize);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedType === template.id
                      ? 'border-current'
                      : `border-transparent ${cardBg} ${hoverBg}`
                  }`}
                  style={{
                    borderColor:
                      selectedType === template.id ? getColorValue(primaryColor) : undefined,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor:
                          selectedType === template.id
                            ? `${getColorValue(primaryColor)}20`
                            : theme === 'light'
                              ? '#f3f4f6'
                              : 'rgba(255, 255, 255, 0.05)',
                        color:
                          selectedType === template.id ? getColorValue(primaryColor) : undefined,
                      }}
                    >
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-medium ${textColor} mb-0.5`}>
                        {t(template.nameKey)}
                      </h4>
                      <p className={`text-xs ${mutedColor}`}>{t(template.descriptionKey)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          {selectedType && (
            <div>
              <h3 className={`text-sm font-medium ${textColor} mb-3`}>
                {t('dashboard.addCard.chooseSize')}
              </h3>
              <div className="flex gap-3">
                {(['extra-small', 'small', 'medium', 'large'] as const).map((size) => (
                  <button
                    type="button"
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      selectedSize === size
                        ? 'border-current'
                        : `border-transparent ${cardBg} ${hoverBg}`
                    }`}
                    style={{
                      borderColor: selectedSize === size ? getColorValue(primaryColor) : undefined,
                    }}
                  >
                    <div className="text-center">
                      <div
                        className="mx-auto mb-2 rounded"
                        style={{
                          width: isExtraSmallCardSize(size)
                            ? '24px'
                            : size === 'small'
                              ? '24px'
                              : size === 'medium'
                                ? '40px'
                                : '56px',
                          height: isExtraSmallCardSize(size)
                            ? '12px'
                            : size === 'small'
                              ? '24px'
                              : size === 'medium'
                                ? '24px'
                                : '48px',
                          backgroundColor:
                            selectedSize === size
                              ? getColorValue(primaryColor)
                              : theme === 'light'
                                ? '#d1d5db'
                                : 'rgba(255, 255, 255, 0.2)',
                        }}
                      />
                      <p className={`text-xs font-medium ${textColor} capitalize`}>
                        {t(cardSizeKey(size))}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedTemplate && (
            <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
              <p className={`text-xs font-medium ${mutedColor} mb-2`}>
                {t('dashboard.addCard.previewLabel')}
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${getColorValue(primaryColor)}20`,
                    color: getColorValue(primaryColor),
                  }}
                >
                  {selectedTemplate.icon}
                </div>
                <div>
                  <h4 className={`text-sm font-medium ${textColor}`}>
                    {t(selectedTemplate.nameKey)}
                  </h4>
                  <p className={`text-xs ${mutedColor}`}>
                    {t('dashboard.addCard.previewSize', {
                      size: t(cardSizeKey(selectedSize)),
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-4 py-3 rounded-xl border ${borderColor} ${textColor} text-sm font-medium ${hoverBg} transition-all`}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedType}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white transition-all"
            style={{
              backgroundColor: selectedType ? getColorValue(primaryColor) : '#6b7280',
              opacity: selectedType ? 1 : 0.5,
              cursor: selectedType ? 'pointer' : 'not-allowed',
            }}
          >
            {t('dashboard.addCard.action')}
          </button>
        </div>
      </div>
    </div>
  );
}
