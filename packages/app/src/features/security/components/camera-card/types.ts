import type { CardSize } from '@navet/app/components/shared/card-size-selector';

export interface CameraCardImageSource {
  srcSet: string;
  type: string;
}

export interface CameraCardProps {
  id: string;
  name: string;
  room: string;
  entityPicture?: string;
  entityPictureSources?: readonly CameraCardImageSource[];
  supportedFeatures?: number;
  isStreamCapable?: boolean;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}
