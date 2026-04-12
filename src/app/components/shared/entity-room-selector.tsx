import { Loader2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { memo, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { shallow } from 'zustand/shallow';
import { RoomEyebrow } from '@/app/components/primitives/room-eyebrow';
import { Select } from '@/app/components/primitives/select';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import {
  useEntityRoomRegistryContext,
  useHomeAssistant,
  useI18n,
  usePersistedState,
  useTheme,
} from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';

interface EntityRoomSelectorProps {
  entityId: string;
  label?: string;
  compact?: boolean;
  forceDark?: boolean;
  className?: string;
  accentColorOverride?: string;
  selectStyle?: CSSProperties;
  compactContentClassName?: string;
  compactContentStyle?: CSSProperties;
}

export const EntityRoomSelector = memo(function EntityRoomSelector({
  entityId,
  label,
  compact = false,
  forceDark = false,
  className = '',
  accentColorOverride,
  selectStyle,
  compactContentClassName,
  compactContentStyle,
}: EntityRoomSelectorProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const areas = useHomeAssistant(homeAssistantSelectors.areas, shallow);
  const roomRegistry = useEntityRoomRegistryContext(entityId);
  const surface = getThemeSurfaceTokens(theme);
  const [isSaving, setIsSaving] = useState(false);
  const [isEyebrowFocused, setIsEyebrowFocused] = useState(false);
  const [roomOverrides, setRoomOverrides] = usePersistedState<Record<string, string>>(
    STORAGE_KEYS.entityRoomOverrides,
    {}
  );
  const resolvedLabel = label ?? t('common.room');

  const sortedAreas = useMemo(
    () => [...areas].sort((left, right) => left.name.localeCompare(right.name)),
    [areas]
  );
  const selectedAreaId = useMemo(() => {
    const overrideAreaId = roomOverrides[entityId];
    if (overrideAreaId) {
      return overrideAreaId;
    }

    const entityEntry = roomRegistry.entry;
    if (!entityEntry) {
      return '';
    }

    if (entityEntry.area_id) {
      return entityEntry.area_id;
    }

    if (!entityEntry.device_id) {
      return '';
    }

    return roomRegistry.deviceAreaId ?? '';
  }, [entityId, roomRegistry.deviceAreaId, roomRegistry.entry, roomOverrides]);
  const entityEntry = roomRegistry.entry;
  const selectedAreaLabel = useMemo(() => {
    if (!selectedAreaId) {
      return t('common.noRoom');
    }

    return sortedAreas.find((area) => area.area_id === selectedAreaId)?.name ?? t('common.noRoom');
  }, [selectedAreaId, sortedAreas, t]);

  const baseSelectClassName = compact
    ? `h-9 rounded-xl px-3 py-0 pr-8 text-xs leading-none ${surface.textPrimary}`
    : `h-10 rounded-xl px-3 py-0 pr-8 text-sm leading-none ${surface.textPrimary}`;
  const handleChange = async (nextValue: string) => {
    const nextAreaId = nextValue || null;
    const nextRoomName =
      sortedAreas.find((area) => area.area_id === nextAreaId)?.name ?? t('common.noRoom');
    setIsSaving(true);
    try {
      if (!entityEntry) {
        setRoomOverrides((current) => {
          const next = { ...current };
          if (nextAreaId) {
            next[entityId] = nextAreaId;
          } else {
            delete next[entityId];
          }
          return next;
        });
      } else {
        await homeAssistantService.updateEntityArea(entityId, nextAreaId, {
          deviceId: entityEntry.device_id,
          entityAreaId: entityEntry.area_id,
        });
        setRoomOverrides((current) => {
          if (!(entityId in current)) {
            return current;
          }

          const next = { ...current };
          delete next[entityId];
          return next;
        });
      }

      toast.success(t('entityRoomSelector.movedTo', { room: nextRoomName }));
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t('entityRoomSelector.updateFailed');
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`min-w-0 ${className}`}>
      {!compact && (
        <div className={`mb-2 text-xs font-medium ${surface.textSecondary}`}>{resolvedLabel}</div>
      )}

      <div className="relative">
        {compact ? (
          <>
            <select
              name="room"
              aria-label={resolvedLabel}
              value={selectedAreaId}
              disabled={isSaving}
              onChange={(event) => void handleChange(event.target.value)}
              onFocus={() => setIsEyebrowFocused(true)}
              onBlur={() => setIsEyebrowFocused(false)}
              className="absolute inset-0 z-10 w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
            >
              <option value="">{t('common.noRoom')}</option>
              {sortedAreas.map((area) => (
                <option key={area.area_id} value={area.area_id}>
                  {area.name}
                </option>
              ))}
            </select>
            <RoomEyebrow
              room={selectedAreaLabel}
              isLoading={isSaving}
              forceDark={forceDark}
              visualOnly
              focused={isEyebrowFocused}
              className={compactContentClassName}
              style={compactContentStyle}
            />
          </>
        ) : (
          <>
            <Select
              aria-label={resolvedLabel}
              value={selectedAreaId}
              disabled={isSaving}
              onChange={(event) => void handleChange(event.target.value)}
              containerClassName="w-full"
              accentColorOverride={accentColorOverride}
              selectClassName={`${surface.border} ${surface.inputBg} ${baseSelectClassName} disabled:opacity-60`}
              indicatorClassName={surface.textSecondary}
              style={selectStyle}
            >
              <option value="">{t('common.noRoom')}</option>
              {sortedAreas.map((area) => (
                <option key={area.area_id} value={area.area_id}>
                  {area.name}
                </option>
              ))}
            </Select>
            {isSaving ? (
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <Loader2 className={`h-3.5 w-3.5 animate-spin ${surface.textSecondary}`} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
});
