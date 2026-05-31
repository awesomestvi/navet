import {
  getDashboardRoomLabel,
  HOME_WIDGET_ROOM,
  toHomeWidgetRoom,
} from '@navet/app/constants/rooms';
import { useI18n } from '@navet/app/i18n';

export function useDashboardWidgetRoomOptions(room: string | undefined, rooms: string[]) {
  const { t } = useI18n();
  const allRoomsLabel = t('dashboard.roomNav.all');
  const roomValue = toHomeWidgetRoom(room);

  return {
    roomValue,
    roomLabel: getDashboardRoomLabel(roomValue, allRoomsLabel),
    roomOptions: [
      { label: allRoomsLabel, value: HOME_WIDGET_ROOM },
      ...rooms.map((entry) => ({ label: entry, value: entry })),
    ],
  };
}
