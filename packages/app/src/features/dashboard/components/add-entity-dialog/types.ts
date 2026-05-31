import type { DeviceWithType } from '@navet/app/types/device.types';

export interface AddEntityDialogProps {
  open: boolean;
  onClose: () => void;
  onAddEntity: (entityId: string) => void;
  currentRoom: string;
  deviceMap: Map<string, DeviceWithType>;
  addedEntityIds: string[];
  visibleEntityIds?: string[];
  title?: string;
  description?: string;
  actionLabel?: string;
}
