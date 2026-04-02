import type { LucideIcon } from 'lucide-react';
import { Gauge, Plus, Search, Trash2 } from 'lucide-react';
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react';
import { Input } from '@/app/components/primitives';
import { DialogHeader } from '@/app/components/shared/device-editor';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import type { SensorIconType, SensorReading } from '../sensors';
import type { AvailableSensor, SensorGroupColorConfig } from './types';

interface SensorGroupSettingsViewProps {
  entityId: string;
  groupName: string;
  selectedSensors: SensorReading[];
  maxSensors: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  highlightedIndex: number;
  setHighlightedIndex: Dispatch<SetStateAction<number>>;
  inputRef: RefObject<HTMLInputElement | null>;
  colors: SensorGroupColorConfig;
  theme: ThemeType;
  filteredSensors: AvailableSensor[];
  iconMap: Record<SensorIconType, LucideIcon>;
  handleAddSensor: (sensor: AvailableSensor) => void;
  handleRemoveSensor: (index: number) => void;
  handleSave: () => void;
  handleCancel: () => void;
  isSensorSelected: (sensorId: string) => boolean;
  CustomScrollbar: React.ComponentType<{ children: ReactNode }>;
}

export function SensorGroupSettingsView({
  entityId,
  groupName,
  selectedSensors,
  maxSensors,
  searchQuery,
  setSearchQuery,
  isDropdownOpen,
  setIsDropdownOpen,
  highlightedIndex,
  setHighlightedIndex,
  inputRef,
  colors,
  theme,
  filteredSensors,
  iconMap,
  handleAddSensor,
  handleRemoveSensor,
  handleSave,
  handleCancel,
  isSensorSelected,
  CustomScrollbar,
}: SensorGroupSettingsViewProps) {
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const isGlass = theme === 'glass';
  const getCategoryLabel = (category: AvailableSensor['category']) => {
    switch (category) {
      case 'energy':
        return t('sensors.category.energy');
      case 'climate':
        return t('sensors.category.climate');
      case 'environmental':
        return t('sensors.category.environmental');
      default:
        return t('sensors.category.other');
    }
  };

  return (
    <div
      className={`h-full w-full overflow-hidden rounded-3xl border shadow-2xl flex flex-col ${
        theme === 'light'
          ? 'bg-linear-to-br from-white via-gray-50/95 to-white'
          : isGlass
            ? 'bg-linear-to-br from-white/14 via-slate-900/80 to-slate-950/88 backdrop-blur-2xl'
            : 'bg-linear-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl'
      } ${surface.border}`}
    >
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-8">
            {/* Dialog Header */}
            <DialogHeader
              title={t('sensors.groupSettings.title', { name: groupName })}
              description={t('sensors.groupSettings.description')}
              isOn={theme !== 'light'}
              supportingContent={
                <EntityRoomSelector
                  entityId={entityId}
                  label={t('sensors.groupSettings.room')}
                  compact
                />
              }
            />

            <div className="space-y-4">
              {/* Selected Sensors Section */}
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${surface.textPrimary}`}>
                  {t('sensors.groupSettings.selected', {
                    count: selectedSensors.length,
                    max: maxSensors,
                  })}
                </h3>

                {selectedSensors.length === 0 ? (
                  <div className={`rounded-2xl p-4 text-center ${surface.subtleBg}`}>
                    <p className={`text-xs ${surface.textSecondary}`}>
                      {t('sensors.groupSettings.emptySelected')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedSensors.map((sensor, index) => {
                      const Icon = sensor.icon ? iconMap[sensor.icon] : Gauge;
                      return (
                        <div
                          key={`${sensor.label}-${index}`}
                          className={`rounded-2xl p-3 border flex items-center justify-between ${surface.subtleBg} ${surface.border}`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className={`w-8 h-8 rounded-full ${colors.iconBg} flex items-center justify-center shrink-0`}
                            >
                              <Icon className={`w-4 h-4 ${colors.iconColor}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-medium truncate ${surface.textPrimary}`}>
                                {sensor.label}
                              </p>
                              <p className={`text-xs ${surface.textSecondary}`}>
                                {sensor.value} {sensor.unit}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSensor(index)}
                            className="w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors shrink-0"
                            aria-label={t('sensors.groupSettings.removeSensor')}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Search and Autocomplete Section */}
              <div className="relative">
                <h3 className={`text-sm font-semibold mb-3 ${surface.textPrimary}`}>
                  {t('sensors.groupSettings.addSensors')}
                </h3>

                {/* Search Input */}
                <Input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                    setHighlightedIndex(-1);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onFocus={() => {
                    setIsDropdownOpen(true);
                    setHighlightedIndex(-1);
                  }}
                  onBlur={() => {
                    // Delay closing to allow click on dropdown items
                    setTimeout(() => setIsDropdownOpen(false), 200);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedIndex((prev) =>
                        prev < filteredSensors.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredSensors.length - 1
                      );
                    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                      e.preventDefault();
                      const sensor = filteredSensors[highlightedIndex];
                      if (sensor && !isSensorSelected(sensor.id)) {
                        handleAddSensor(sensor);
                      }
                    } else if (e.key === 'Escape') {
                      setIsDropdownOpen(false);
                      setSearchQuery('');
                      inputRef.current?.blur();
                    }
                  }}
                  placeholder={t('sensors.groupSettings.searchPlaceholder')}
                  leading={<Search className={`h-4 w-4 ${surface.textSecondary}`} />}
                  inputClassName={`${surface.inputBg} ${surface.border} ${surface.textPrimary} ${surface.placeholder}`}
                  disabled={selectedSensors.length >= maxSensors}
                  autoComplete="off"
                />

                {/* Autocomplete Dropdown */}
                {isDropdownOpen && (
                  <div
                    className={`mt-2 rounded-2xl shadow-2xl overflow-hidden max-h-64 border ${surface.panel} ${surface.border} ${isGlass ? 'backdrop-blur-2xl' : 'backdrop-blur-xl'}`}
                  >
                    <CustomScrollbar>
                      {filteredSensors.length > 0 ? (
                        <div className="p-2">
                          {filteredSensors.map((sensor, index) => {
                            const Icon = iconMap[sensor.icon];
                            const isSelected = isSensorSelected(sensor.id);
                            const isDisabled = selectedSensors.length >= maxSensors && !isSelected;
                            const isHighlighted = index === highlightedIndex;

                            // Highlight matching text
                            const highlightMatch = (text: string) => {
                              const query = searchQuery.trim();
                              if (!query) return text;
                              const regex = new RegExp(
                                `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
                                'gi'
                              );
                              const parts = text.split(regex);
                              return parts.map((part, i) => {
                                const isMatch = part.toLowerCase().includes(query.toLowerCase());
                                // Create a stable key that doesn't rely on array index
                                const key = `${part}-${i}-${isMatch ? 'match' : 'text'}`;
                                return isMatch ? (
                                  <span key={key} className={`${colors.iconColor}`}>
                                    {part}
                                  </span>
                                ) : (
                                  part
                                );
                              });
                            };

                            return (
                              <button
                                type="button"
                                key={sensor.id}
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent blur
                                  handleAddSensor(sensor);
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                disabled={isDisabled || isSelected}
                                className={`w-full rounded-xl p-3 transition-colors flex items-center gap-3 text-left ${
                                  isSelected
                                    ? `${surface.subtleBg} opacity-50 cursor-not-allowed`
                                    : isDisabled
                                      ? `${surface.subtleBg} opacity-50 cursor-not-allowed`
                                      : isHighlighted
                                        ? `${colors.selected} border border-transparent`
                                        : `${colors.hover} border border-transparent`
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-full ${colors.iconBg} flex items-center justify-center shrink-0`}
                                >
                                  <Icon className={`w-4 h-4 ${colors.iconColor}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`text-xs font-medium truncate ${surface.textPrimary}`}
                                  >
                                    {highlightMatch(sensor.label)}
                                  </p>
                                  <p className={`text-xs ${surface.textSecondary}`}>
                                    {sensor.value} {sensor.unit} {'·'}{' '}
                                    {getCategoryLabel(sensor.category)}
                                  </p>
                                </div>
                                {isSelected ? (
                                  <span className={`text-xs shrink-0 ${surface.textMuted}`}>
                                    {t('sensors.groupSettings.added')}
                                  </span>
                                ) : !isDisabled ? (
                                  <Plus className={`w-4 h-4 shrink-0 ${surface.textMuted}`} />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <p className={`text-xs ${surface.textSecondary}`}>
                            {t('sensors.groupSettings.noMatch', { query: searchQuery })}
                          </p>
                        </div>
                      )}
                    </CustomScrollbar>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className={`p-6 border-t flex gap-3 ${surface.border}`}>
        <button
          type="button"
          onClick={handleCancel}
          className={`flex-1 py-3 px-4 rounded-2xl ${surface.subtleBg} ${surface.hoverBg} ${surface.textPrimary} font-medium transition-colors`}
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className={`flex-1 py-3 px-4 rounded-2xl ${colors.iconBg} ${colors.hover} text-white font-medium transition-colors`}
        >
          {t('sensors.groupSettings.save')}
        </button>
      </div>
    </div>
  );
}
