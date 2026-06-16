import { RoomEyebrow } from '@navet/app/components/primitives/room-eyebrow';
import { Select } from '@navet/app/components/primitives/select';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  useI18n,
  useIntegrationStore,
  useProviderEntityRoomContext,
  useTheme,
} from '@navet/app/hooks';
import { integrationAdminService } from '@navet/app/services/integration-admin.service';
import { useEntityRoomOverridesStore } from '@navet/app/stores/entity-room-overrides-store';
import { integrationSelectors } from '@navet/app/stores/selectors';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import {
  createProviderScopedId,
  getProviderNativeId,
  parseProviderScopedId,
} from '@navet/app/utils/provider-ids';
import { Loader2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { memo, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface EntityRoomSelectorProps {
  entityId: string;
  label?: string;
  compact?: boolean;
  forceDark?: boolean;
  fallbackRoomName?: string;
  className?: string;
  accentColorOverride?: string;
  selectStyle?: CSSProperties;
  compactContentClassName?: string;
  compactContentStyle?: CSSProperties;
}

const CREATE_ROOM_VALUE = '__create_room__';

export const EntityRoomSelector = memo(function EntityRoomSelector({
  entityId,
  label,
  compact = false,
  forceDark = false,
  fallbackRoomName,
  className = '',
  accentColorOverride,
  selectStyle,
  compactContentClassName,
  compactContentStyle,
}: EntityRoomSelectorProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const roomRegistry = useProviderEntityRoomContext(entityId);
  const roomIdsByEntityId = useEntityRoomOverridesStore((state) => state.roomIdsByEntityId);
  const setRoomOverride = useEntityRoomOverridesStore((state) => state.setRoomOverride);
  const clearRoomOverride = useEntityRoomOverridesStore((state) => state.clearRoomOverride);
  const surface = getThemeSurfaceTokens(theme);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompactFocused, setIsCompactFocused] = useState(false);
  const resolvedLabel = label ?? t('common.room');
  const entityProviderId = useMemo<IntegrationProviderId>(
    () => parseProviderScopedId(entityId)?.providerId ?? currentProviderId,
    [currentProviderId, entityId]
  );
  const manageableRooms = useIntegrationStore(
    integrationSelectors.manageableRoomsForProvider(entityProviderId)
  );
  const resolvedEntityId = useMemo(
    () => createProviderScopedId(entityProviderId, getProviderNativeId(entityId)),
    [entityId, entityProviderId]
  );
  const assignableRooms = useMemo(
    () => manageableRooms.filter((room) => room.canAssign),
    [manageableRooms]
  );
  const localRoomOverrideId = roomIdsByEntityId[resolvedEntityId] ?? null;
  const canManageRoom = assignableRooms.length > 0;
  const usesProviderRoomAssignment = roomRegistry.entry != null;
  const fallbackManagedRoom = useMemo(() => {
    const normalizedFallbackRoomName = fallbackRoomName?.trim().toLowerCase();
    if (!normalizedFallbackRoomName) {
      return null;
    }

    return (
      assignableRooms.find(
        (room) => room.name.trim().toLowerCase() === normalizedFallbackRoomName
      ) ?? null
    );
  }, [assignableRooms, fallbackRoomName]);
  const selectedRoomId = useMemo(() => {
    if (localRoomOverrideId) {
      return localRoomOverrideId;
    }

    const entityEntry = roomRegistry.entry;
    if (!entityEntry) {
      return fallbackManagedRoom?.id ?? '';
    }

    if (entityEntry.area_id) {
      return createProviderScopedId(entityProviderId, entityEntry.area_id);
    }

    if (!entityEntry.device_id) {
      return fallbackManagedRoom?.id ?? '';
    }

    return roomRegistry.deviceAreaId
      ? createProviderScopedId(entityProviderId, roomRegistry.deviceAreaId)
      : (fallbackManagedRoom?.id ?? '');
  }, [
    entityProviderId,
    fallbackManagedRoom?.id,
    localRoomOverrideId,
    roomRegistry.deviceAreaId,
    roomRegistry.entry,
  ]);
  const selectedRoomLabel =
    assignableRooms.find((room) => room.id === selectedRoomId)?.name ??
    fallbackManagedRoom?.name ??
    fallbackRoomName?.trim() ??
    t('common.noRoom');
  const baseSelectClassName = compact
    ? `h-9 rounded-xl px-3 py-0 pr-8 text-xs leading-none ${surface.textPrimary}`
    : `h-10 rounded-xl px-3 py-0 pr-8 text-sm leading-none ${surface.textPrimary}`;
  const handleChange = async (nextValue: string) => {
    if (!canManageRoom) {
      toast.error('Room assignment is unavailable for this entity');
      return;
    }

    if (nextValue === CREATE_ROOM_VALUE) {
      const roomName = window.prompt(t('entityRoomSelector.createPrompt'));
      if (!roomName) {
        return;
      }

      const trimmedRoomName = roomName.trim();
      if (!trimmedRoomName) {
        toast.error(t('entityRoomSelector.createInvalid'));
        return;
      }

      setIsSaving(true);
      try {
        const createdRoom = await integrationAdminService.createRoom(trimmedRoomName);
        if (usesProviderRoomAssignment) {
          await integrationAdminService.updateEntityRoom(entityId, createdRoom.id);
          clearRoomOverride(resolvedEntityId);
        } else {
          setRoomOverride(resolvedEntityId, createdRoom.id);
        }
        toast.success(t('entityRoomSelector.movedTo', { room: createdRoom.name }));
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : t('entityRoomSelector.updateFailed');
        toast.error(message);
      } finally {
        setIsSaving(false);
      }

      return;
    }

    const nextRoomId = nextValue || null;
    const nextRoomName =
      assignableRooms.find((room) => room.id === nextRoomId)?.name ?? t('common.noRoom');
    setIsSaving(true);
    try {
      if (usesProviderRoomAssignment) {
        await integrationAdminService.updateEntityRoom(entityId, nextRoomId);
        clearRoomOverride(resolvedEntityId);
      } else if (nextRoomId) {
        setRoomOverride(resolvedEntityId, nextRoomId);
      } else {
        clearRoomOverride(resolvedEntityId);
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
          <div className={`relative inline-block min-w-0 ${compactContentClassName ?? ''}`}>
            <RoomEyebrow
              room={selectedRoomLabel}
              isLoading={isSaving}
              forceDark={forceDark}
              visualOnly
              focused={isCompactFocused}
              style={compactContentStyle}
            />
            <select
              aria-label={resolvedLabel}
              value={selectedRoomId}
              disabled={isSaving || !canManageRoom}
              onChange={(event) => void handleChange(event.target.value)}
              onFocus={(event) =>
                setIsCompactFocused(event.currentTarget.matches(':focus-visible'))
              }
              onBlur={() => setIsCompactFocused(false)}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
            >
              <option value="">{t('common.noRoom')}</option>
              {assignableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
              <option value={CREATE_ROOM_VALUE}>{t('entityRoomSelector.createAction')}</option>
            </select>
          </div>
        ) : (
          <>
            <Select
              aria-label={resolvedLabel}
              value={selectedRoomId}
              disabled={isSaving || !canManageRoom}
              onChange={(event) => void handleChange(event.target.value)}
              containerClassName="w-full"
              accentColorOverride={accentColorOverride}
              selectClassName={`${surface.border} ${surface.inputBg} ${baseSelectClassName} disabled:opacity-60`}
              indicatorClassName={surface.textSecondary}
              style={selectStyle}
            >
              <option value="">{t('common.noRoom')}</option>
              {assignableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
              <option value={CREATE_ROOM_VALUE}>{t('entityRoomSelector.createAction')}</option>
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
