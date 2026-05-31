import type { CardSize } from '@navet/app/components/shared/card-size-selector';

export interface CameraCardProps {
  id: string;
  name: string;
  room: string;
  entityPicture?: string;
  supportedFeatures?: number;
  isStreamCapable?: boolean;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}
