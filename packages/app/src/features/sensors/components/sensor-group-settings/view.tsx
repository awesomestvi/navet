import { HeaderSearchInput } from '@navet/app/components/layout/header-search-input';
import { CardDialogSection } from '@navet/app/components/patterns';
import { getAddCardDialogSurfaceTokens } from '@navet/app/components/shared/theme/add-card-dialog-surface-tokens';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { LucideIcon } from 'lucide-react';
import { Plus, Trash2 } from 'lucide-react';
import {
  type CSSProperties,
  type Dispatch,
  memo,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { SensorIconType, SensorReading } from '../sensors';
import type { AvailableSensor, SensorGroupColorConfig } from './types';

const LIST_HEIGHT = 360;
const ROW_HEIGHT = 72;
const OVERSCAN = 1;

function hexToRgb(color: string) {
  const normalized = color.startsWith('#') ? color.slice(1) : color;
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : normalized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function withAlpha(color: string, alpha: number) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface SensorGroupSettingsViewProps {
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
  isSensorSelected: (sensorId: string) => boolean;
}

const SensorLibraryRow = memo(function SensorLibraryRow({
  sensor,
  Icon,
  colors,
  surface,
  iconBackground,
  tileBackground,
  tileBorder,
  accentColorValue,
  isSelected,
  isDisabled,
  onAdd,
  onRemove,
  renderLabel,
  description,
}: {
  sensor: AvailableSensor;
  Icon: LucideIcon;
  colors: SensorGroupColorConfig;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  iconBackground: string;
  tileBackground: string;
  tileBorder: string;
  accentColorValue: string;
  isSelected: boolean;
  isDisabled: boolean;
  onAdd: () => void;
  onRemove: () => void;
  renderLabel: (text: string) => ReactNode;
  description: string;
}) {
  const { t } = useI18n();
  const rowContent = (
    <>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: iconBackground }}
      >
        <Icon
          className={`h-3.5 w-3.5 ${isSelected ? '' : surface.textMuted}`}
          style={isSelected ? { color: accentColorValue } : undefined}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-semibold ${surface.textPrimary}`}>
          {renderLabel(sensor.label)}
        </div>
        <div className={`truncate text-xs ${surface.textSecondary}`}>{description}</div>
      </div>
    </>
  );

  if (isSelected) {
    return (
      <div
        role="option"
        aria-selected="true"
        tabIndex={-1}
        className={`flex w-full items-center gap-3 rounded-[18px] border px-3 py-2.5 text-left transition-colors ${colors.selected}`}
        style={{
          backgroundColor: withAlpha(accentColorValue, 0.16),
          borderColor: withAlpha(accentColorValue, 0.4),
        }}
      >
        {rowContent}
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
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
      onMouseDown={(event) => {
        if (event.button !== 0) {
          return;
        }
        event.preventDefault();
        onAdd();
      }}
      disabled={isDisabled}
      className={`group flex w-full items-center gap-3 rounded-[18px] border px-3 py-2.5 text-left transition-colors ${
        isDisabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:bg-[var(--sensor-hover-bg)] hover:border-[var(--sensor-hover-border)]'
      }`}
      style={
        {
          backgroundColor: tileBackground,
          borderColor: tileBorder,
          '--sensor-hover-bg': withAlpha(accentColorValue, 0.12),
          '--sensor-hover-border': withAlpha(accentColorValue, 0.34),
        } as CSSProperties
      }
    >
      {rowContent}
      {!isDisabled ? (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition-opacity group-hover:opacity-85"
          style={{ backgroundColor: accentColorValue }}
        >
          <Plus className="h-3 w-3" />
        </div>
      ) : null}
    </button>
  );
});

export function SensorGroupSettingsView({
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
  isSensorSelected,
}: SensorGroupSettingsViewProps) {
  const { t } = useI18n();
  const { primaryColor } = useTheme();
  const accentColorValue = getThemeColorValue(primaryColor);
  const surface = getThemeSurfaceTokens(theme);
  const dialogSurface = getAddCardDialogSurfaceTokens(theme);
  const [scrollTop, setScrollTop] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

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
  const visibleCount = Math.ceil(LIST_HEIGHT / ROW_HEIGHT);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(filteredSensors.length, startIndex + visibleCount + OVERSCAN * 2);
  const virtualSensors = filteredSensors.slice(startIndex, endIndex);
  const topOffset = startIndex * ROW_HEIGHT;
  const totalHeight = filteredSensors.length * ROW_HEIGHT;

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <CardDialogSection label={t('sensors.groupSettings.addSensors')} className="relative">
        <fieldset
          className="min-w-0 border-0 p-0 m-0"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setHighlightedIndex((prev) => (prev < filteredSensors.length - 1 ? prev + 1 : 0));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredSensors.length - 1));
            } else if (event.key === 'Enter' && highlightedIndex >= 0) {
              event.preventDefault();
              const sensor = filteredSensors[highlightedIndex];
              if (sensor && !isSensorSelected(sensor.id)) {
                handleAddSensor(sensor);
              }
            } else if (event.key === 'Escape') {
              setSearchQuery('');
              inputRef.current?.blur();
            }
          }}
        >
          <HeaderSearchInput
            activeColorValue={getThemeColorValue(primaryColor)}
            hoverBg={surface.hoverBg}
            inputBg={surface.panelMuted}
            inputRef={inputRef}
            isSearchActive={searchQuery.trim().length > 0}
            isSearchFocused={isSearchFocused}
            onBlur={() => setIsSearchFocused(false)}
            onChange={(value) => {
              setSearchQuery(value);
              setHighlightedIndex(-1);
            }}
            onClear={() => {
              setSearchQuery('');
              setHighlightedIndex(-1);
            }}
            onFocus={() => {
              setIsSearchFocused(true);
              setHighlightedIndex(-1);
            }}
            placeholder={t('sensors.groupSettings.searchPlaceholder')}
            query={searchQuery}
            textPrimary={surface.textPrimary}
            textSecondary={surface.textSecondary}
            widthClassName={`rounded-[18px] ${surface.border}`}
          />
        </fieldset>

        <div
          className="mt-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ height: `${LIST_HEIGHT}px` }}
          onScroll={(event) => {
            const next = event.currentTarget.scrollTop;
            if (rafRef.current !== null) {
              return;
            }

            rafRef.current = window.requestAnimationFrame(() => {
              rafRef.current = null;
              setScrollTop(next);
            });
          }}
        >
          {filteredSensors.length > 0 ? (
            <div className="relative" style={{ height: totalHeight }}>
              <div
                className="absolute inset-x-0 top-0 flex flex-col gap-2.5"
                style={{ transform: `translateY(${topOffset}px)` }}
              >
                {virtualSensors.map((sensor) => {
                  const Icon = iconMap[sensor.icon];
                  const isSelected = isSensorSelected(sensor.id);
                  const isDisabled = selectedSensors.length >= maxSensors && !isSelected;
                  const highlightMatch = (text: string) => {
                    const query = searchQuery.trim();
                    if (!query) return text;
                    const regex = new RegExp(
                      `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
                      'gi'
                    );
                    const parts = text.split(regex);
                    return parts.map((part, partIndex) => {
                      const isMatch = part.toLowerCase().includes(query.toLowerCase());
                      const key = `${part}-${partIndex}-${isMatch ? 'match' : 'text'}`;
                      return isMatch ? (
                        <span key={key} style={{ color: accentColorValue }}>
                          {part}
                        </span>
                      ) : (
                        part
                      );
                    });
                  };
                  const description = `${sensor.value} ${sensor.unit} • ${sensor.room ?? getCategoryLabel(sensor.category)}`;

                  return (
                    <SensorLibraryRow
                      key={sensor.id}
                      sensor={sensor}
                      Icon={Icon}
                      colors={colors}
                      surface={surface}
                      iconBackground={dialogSurface.iconBackground}
                      tileBackground={surface.panelMuted}
                      tileBorder={dialogSurface.tileBorder}
                      accentColorValue={accentColorValue}
                      isSelected={isSelected}
                      isDisabled={isDisabled}
                      onAdd={() => handleAddSensor(sensor)}
                      onRemove={() => handleRemoveSensor(sensor.id)}
                      renderLabel={highlightMatch}
                      description={description}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div
              className={`rounded-[22px] border border-dashed px-5 py-6 text-center text-sm ${surface.borderStrong} ${surface.textSecondary}`}
            >
              {t('sensors.groupSettings.noMatch', { query: searchQuery })}
            </div>
          )}
        </div>
      </CardDialogSection>
    </div>
  );
}
