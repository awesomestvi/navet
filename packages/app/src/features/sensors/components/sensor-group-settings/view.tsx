import {
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
  CardDialogSection,
} from '@navet/app/components/patterns';
import { Button, Input } from '@navet/app/components/primitives';
import { CompactRoomSelector } from '@navet/app/components/shared/device-editor';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { LucideIcon } from 'lucide-react';
import { Plus, Search, Trash2 } from 'lucide-react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { SensorIconType, SensorReading } from '../sensors';
import type { AvailableSensor, SensorGroupColorConfig } from './types';

interface SensorGroupSettingsViewProps {
  groupName: string;
  roomValue?: string;
  roomLabel?: string;
  roomOptions?: Array<{ label: string; value: string }>;
  showRoomSelector: boolean;
  onNameChange?: (name: string) => void;
  onRoomChange?: (room: string) => void;
  selectedSensors: SensorReading[];
  maxSensors: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  highlightedIndex: number;
  setHighlightedIndex: Dispatch<SetStateAction<number>>;
  inputRef: RefObject<HTMLInputElement | null>;
  colors: SensorGroupColorConfig;
  theme: ThemeType;
  filteredSensors: AvailableSensor[];
  iconMap: Record<SensorIconType, LucideIcon>;
  handleAddSensor: (sensor: AvailableSensor) => void;
  handleRemoveSensor: (sensorId: string) => void;
  handleSave: () => void;
  isSensorSelected: (sensorId: string) => boolean;
}

export function SensorGroupSettingsView({
  groupName,
  roomValue,
  roomLabel,
  roomOptions,
  showRoomSelector,
  onNameChange,
  onRoomChange,
  selectedSensors,
  maxSensors,
  searchQuery,
  setSearchQuery,
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
  isSensorSelected,
}: SensorGroupSettingsViewProps) {
  const { t } = useI18n();
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
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <CardDialogBody className="min-w-0 max-w-full overflow-x-hidden">
          <CardDialogHeader
            title={groupName}
            description={t('widgets.common.widget')}
            showRoomSelector={false}
            editableTitle={Boolean(onNameChange)}
            onTitleChange={onNameChange}
            eyebrow={
              showRoomSelector && roomValue && roomLabel && roomOptions ? (
                <CompactRoomSelector
                  value={roomValue}
                  label={roomLabel}
                  options={roomOptions}
                  onChange={onRoomChange}
                />
              ) : null
            }
          />

          <div className="min-w-0 max-w-full overflow-x-hidden">
            <CardDialogSection label={t('sensors.groupSettings.addSensors')} className="relative">
              <Input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  e.stopPropagation();
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onFocus={() => setHighlightedIndex(-1)}
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
                    setSearchQuery('');
                    inputRef.current?.blur();
                  }
                }}
                placeholder={t('sensors.groupSettings.searchPlaceholder')}
                leading={<Search className="h-4 w-4 text-white/62" />}
                inputClassName="border-white/12 bg-white/10 text-white placeholder:text-white/45"
                autoComplete="off"
              />

              <div
                className={`mt-2 h-72 min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/12 bg-black/24 shadow-2xl ${isGlass ? 'backdrop-blur-2xl' : 'backdrop-blur-xl'}`}
              >
                <div className="h-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {filteredSensors.length > 0 ? (
                    <div className="min-w-0 max-w-full space-y-1 p-2">
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

                        const rowContent = (
                          <>
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colors.iconBg}`}
                            >
                              <Icon className={`h-4 w-4 ${colors.iconColor}`} />
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p className="truncate text-xs font-medium text-white">
                                {highlightMatch(sensor.label)}
                              </p>
                              <p className="truncate text-xs text-white/70">
                                {sensor.value} {sensor.unit} {'·'}{' '}
                                {sensor.room ?? getCategoryLabel(sensor.category)}
                              </p>
                            </div>
                          </>
                        );

                        if (isSelected) {
                          return (
                            <div
                              key={sensor.id}
                              className={`flex w-full min-w-0 items-center gap-3 rounded-xl border border-transparent p-3 text-left transition-colors ${colors.selected}`}
                            >
                              {rowContent}
                              <button
                                type="button"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleRemoveSensor(sensor.id);
                                }}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-300 transition-colors hover:bg-red-500/30 hover:text-red-200"
                                aria-label={t('sensors.groupSettings.removeSensor')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <button
                            type="button"
                            key={sensor.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleAddSensor(sensor);
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            disabled={isDisabled}
                            className={`flex w-full min-w-0 items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                              isDisabled
                                ? 'cursor-not-allowed bg-white/8 opacity-50'
                                : isHighlighted
                                  ? `${colors.selected} border border-transparent`
                                  : `${colors.hover} border border-transparent hover:bg-white/8`
                            }`}
                          >
                            {rowContent}
                            {!isDisabled ? (
                              <Plus className="h-4 w-4 shrink-0 text-white/52" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-xs text-white/72">
                        {t('sensors.groupSettings.noMatch', { query: searchQuery })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardDialogSection>
          </div>

          <CardDialogFooter>
            <Button variant="soft" size="small" onClick={handleSave}>
              {t('common.done')}
            </Button>
          </CardDialogFooter>
        </CardDialogBody>
      </div>
    </div>
  );
}
