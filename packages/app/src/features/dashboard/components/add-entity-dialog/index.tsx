import { getDeviceTypeIcon } from '@navet/app/constants/device-type-icons';
import { isAllRooms } from '@navet/app/constants/rooms';
import { useI18n, useIntegrationStore } from '@navet/app/hooks';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { useMemo } from 'react';
import { buildPreparedDashboardDevices } from '../../utils/prepared-dashboard-devices';
import type { DashboardLibraryCard } from '../dashboard-library-list';
import { AddEntityDialogPrimitive } from './primitive';
import type { AddEntityDialogProps } from './types';

/** Keep dashboard eligibility and mutations separate from the shared Home library UI. */
export function AddEntityDialog({
  open,
  onClose,
  onAddEntity,
  currentRoom,
  deviceMap,
  addedEntityIds,
  visibleEntityIds,
  title,
  description,
  actionLabel,
}: AddEntityDialogProps) {
  const { t, locale } = useI18n();
  const providerSessions = useIntegrationStore(integrationSelectors.providerSessions);
  const connectedProviderCount = Object.keys(providerSessions).length;
  const libraryCards = useMemo<DashboardLibraryCard[]>(() => {
    const visibleIds = visibleEntityIds ? new Set(visibleEntityIds) : null;
    const addedIds = new Set(addedEntityIds);
    return buildPreparedDashboardDevices(deviceMap, t, connectedProviderCount)
      .filter(
        (device) =>
          (!visibleIds || visibleIds.has(device.id)) &&
          !addedIds.has(device.id) &&
          (isAllRooms(currentRoom) || device.room === currentRoom)
      )
      .sort(
        (left, right) =>
          left.room.localeCompare(right.room, locale) || left.name.localeCompare(right.name, locale)
      )
      .map(({ device, id, name, room, typeLabel }) => ({
        id,
        title: name,
        subtitle: room,
        room,
        meta: typeLabel,
        kind: 'device',
        entityType: device.type,
        entityTypeLabel: typeLabel,
        idSearchText: id,
        icon: getDeviceTypeIcon(
          device.type,
          'deviceClass' in device && typeof device.deviceClass === 'string'
            ? device.deviceClass
            : undefined
        ),
      }));
  }, [deviceMap, t, connectedProviderCount, visibleEntityIds, addedEntityIds, currentRoom, locale]);

  return (
    <AddEntityDialogPrimitive
      open={open}
      onClose={onClose}
      onAddCard={() => {}}
      onAddLibraryCard={onAddEntity}
      currentRoom={currentRoom}
      libraryCards={libraryCards}
      libraryOnly
      title={title ?? t('dashboard.addEntity.title')}
      description={
        description ??
        (isAllRooms(currentRoom)
          ? t('dashboard.addEntity.defaultDescriptionAll')
          : t('dashboard.addEntity.defaultDescriptionRoom', { room: currentRoom }))
      }
      actionLabel={actionLabel ?? t('dashboard.addEntity.action')}
      libraryEmptyText={t('dashboard.addCard.libraryEmpty')}
    />
  );
}

export type { CardType } from '@navet/app/features/dashboard/stores/custom-cards-store';
export { AddEntityDialogPrimitive } from './primitive';
export type { AddEntityDialogPrimitiveProps, CardTemplate, CardTemplateId } from './types';
