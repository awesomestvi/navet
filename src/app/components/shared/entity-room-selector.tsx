import { Loader2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { memo, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RoomEyebrow } from '@/app/components/primitives/room-eyebrow';
import { Select } from '@/app/components/primitives/select';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useIntegrationStore, useProviderEntityRoomContext, useTheme } from '@/app/hooks';
import { buildManageableRoomReferences } from '@/app/platform/provider-room-management';
import { integrationAdminService } from '@/app/services/integration-admin.service';
import { integrationSelectors } from '@/app/stores/selectors';
import type { IntegrationProviderId } from '@/app/types/provider';
import { createProviderScopedId, parseProviderScopedId } from '@/app/utils/provider-ids';

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

const CREATE_ROOM_VALUE = '__create_room__';

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
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const roomDescriptors = useIntegrationStore(integrationSelectors.roomDescriptors);
  const roomRegistry = useProviderEntityRoomContext(entityId);
  const surface = getThemeSurfaceTokens(theme);
  const [isSaving, setIsSaving] = useState(false);
  const [isEyebrowFocused, setIsEyebrowFocused] = useState(false);
  const [isKeyboardFocus, setIsKeyboardFocus] = useState(false);
  const resolvedLabel = label ?? t('common.room');

  const entityProviderId = useMemo<IntegrationProviderId>(
    () => parseProviderScopedId(entityId)?.providerId ?? currentProviderId,
    [currentProviderId, entityId]
  );
  const manageableRooms = useMemo(
    () =>
      buildManageableRoomReferences(roomDescriptors, entityProviderId).filter(
        (room) => room.canAssign
      ),
    [entityProviderId, roomDescriptors]
  );
  const selectedRoomId = useMemo(() => {
    const entityEntry = roomRegistry.entry;
    if (!entityEntry) {
      return '';
    }

    if (entityEntry.area_id) {
      return createProviderScopedId(entityProviderId, entityEntry.area_id);
    }

    if (!entityEntry.device_id) {
      return '';
    }

    return roomRegistry.deviceAreaId
      ? createProviderScopedId(entityProviderId, roomRegistry.deviceAreaId)
      : '';
  }, [entityProviderId, roomRegistry.deviceAreaId, roomRegistry.entry]);
  const selectedRoomLabel = useMemo(() => {
    if (!selectedRoomId) {
      return t('common.noRoom');
    }

    return manageableRooms.find((room) => room.id === selectedRoomId)?.name ?? t('common.noRoom');
  }, [manageableRooms, selectedRoomId, t]);

  const baseSelectClassName = compact
    ? `h-9 rounded-xl px-3 py-0 pr-8 text-xs leading-none ${surface.textPrimary}`
    : `h-10 rounded-xl px-3 py-0 pr-8 text-sm leading-none ${surface.textPrimary}`;
  const handleChange = async (nextValue: string) => {
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
        await integrationAdminService.updateEntityRoom(entityId, createdRoom.id);
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
      manageableRooms.find((room) => room.id === nextRoomId)?.name ?? t('common.noRoom');
    setIsSaving(true);
    try {
      await integrationAdminService.updateEntityRoom(entityId, nextRoomId);

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
              value={selectedRoomId}
              disabled={isSaving}
              onChange={(event) => void handleChange(event.target.value)}
              onKeyDown={() => setIsKeyboardFocus(true)}
              onPointerDown={() => setIsKeyboardFocus(false)}
              onFocus={() => setIsEyebrowFocused(true)}
              onBlur={() => {
                setIsEyebrowFocused(false);
                setIsKeyboardFocus(false);
              }}
              className="absolute inset-0 z-10 w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
            >
              <option value="">{t('common.noRoom')}</option>
              {manageableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
              <option value={CREATE_ROOM_VALUE}>{t('entityRoomSelector.createAction')}</option>
            </select>
            <RoomEyebrow
              room={selectedRoomLabel}
              isLoading={isSaving}
              forceDark={forceDark}
              visualOnly
              focused={isEyebrowFocused && isKeyboardFocus}
              className={compactContentClassName}
              style={compactContentStyle}
            />
          </>
        ) : (
          <>
            <Select
              aria-label={resolvedLabel}
              value={selectedRoomId}
              disabled={isSaving}
              onChange={(event) => void handleChange(event.target.value)}
              containerClassName="w-full"
              accentColorOverride={accentColorOverride}
              selectClassName={`${surface.border} ${surface.inputBg} ${baseSelectClassName} disabled:opacity-60`}
              indicatorClassName={surface.textSecondary}
              style={selectStyle}
            >
              <option value="">{t('common.noRoom')}</option>
              {manageableRooms.map((room) => (
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
