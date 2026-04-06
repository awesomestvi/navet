import { ChevronDown, Home, Loader2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { memo, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Select } from '@/app/components/primitives/select';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';

interface EntityRoomSelectorProps {
  entityId: string;
  label?: string;
  compact?: boolean;
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
  className = '',
  accentColorOverride,
  selectStyle,
  compactContentClassName,
  compactContentStyle,
}: EntityRoomSelectorProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const areas = useHomeAssistant(homeAssistantSelectors.areas);
  const deviceRegistry = useHomeAssistant(homeAssistantSelectors.deviceRegistry);
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry);
  const surface = getThemeSurfaceTokens(theme);
  const [isSaving, setIsSaving] = useState(false);
  const resolvedLabel = label ?? t('common.room');

  const sortedAreas = useMemo(
    () => [...areas].sort((left, right) => left.name.localeCompare(right.name)),
    [areas]
  );
  const selectedAreaId = useMemo(() => {
    const entityEntry = entityRegistry.find((entry) => entry.entity_id === entityId);
    if (!entityEntry) {
      return '';
    }

    if (entityEntry.area_id) {
      return entityEntry.area_id;
    }

    if (!entityEntry.device_id) {
      return '';
    }

    return deviceRegistry.find((entry) => entry.id === entityEntry.device_id)?.area_id ?? '';
  }, [deviceRegistry, entityId, entityRegistry]);
  const selectedAreaLabel = useMemo(() => {
    if (!selectedAreaId) {
      return t('common.noRoom');
    }

    return sortedAreas.find((area) => area.area_id === selectedAreaId)?.name ?? t('common.noRoom');
  }, [selectedAreaId, sortedAreas, t]);

  const baseSelectClassName = compact
    ? `h-9 rounded-xl px-3 pr-8 text-xs ${surface.textPrimary}`
    : `h-10 rounded-xl px-3 pr-8 text-sm ${surface.textPrimary}`;
  const handleChange = async (nextValue: string) => {
    const nextAreaId = nextValue || null;
    const nextRoomName =
      sortedAreas.find((area) => area.area_id === nextAreaId)?.name ?? t('common.noRoom');
    setIsSaving(true);
    try {
      await homeAssistantService.updateEntityArea(entityId, nextAreaId);
      toast.success(t('entityRoomSelector.movedTo', { room: nextRoomName }));
    } catch {
      toast.error(t('entityRoomSelector.updateFailed'));
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
              aria-label={resolvedLabel}
              value={selectedAreaId}
              disabled={isSaving}
              onChange={(event) => void handleChange(event.target.value)}
              className="absolute inset-0 z-10 w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
            >
              <option value="">{t('common.noRoom')}</option>
              {sortedAreas.map((area) => (
                <option key={area.area_id} value={area.area_id}>
                  {area.name}
                </option>
              ))}
            </select>
            <div
              className={cn(
                'inline-flex min-w-0 items-center gap-2 text-sm',
                surface.textPrimary,
                compactContentStyle || compactContentClassName
                  ? 'rounded-xl border px-3 py-2'
                  : null,
                compactContentClassName
              )}
              style={compactContentStyle}
            >
              <Home className={`h-4 w-4 ${surface.textSecondary}`} />
              <span className="max-w-[12rem] truncate font-medium">{selectedAreaLabel}</span>
              {isSaving ? (
                <Loader2 className={`h-4 w-4 animate-spin ${surface.textSecondary}`} />
              ) : (
                <ChevronDown className={`h-4 w-4 ${surface.textSecondary}`} />
              )}
            </div>
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
