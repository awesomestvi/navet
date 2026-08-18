import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { PlatformEntitySnapshot } from '@navet/app/platform/provider-feature-models';

export interface CameraAccessoryEntity {
  id: string;
  entity: PlatformEntitySnapshot;
}

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
