import type { CameraDevice } from '@navet/app/types/device.types';
import type { HassEntity } from 'home-assistant-js-websocket';

const CAMERA_FEATURE_STREAM = 2;

function parseSupportedFeatures(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function mapCameraDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): CameraDevice {
  const supportedFeatures = parseSupportedFeatures(entity.attributes?.supported_features);
  const isStreamCapable = (supportedFeatures & CAMERA_FEATURE_STREAM) === CAMERA_FEATURE_STREAM;
  const entityPicture =
    typeof entity.attributes?.entity_picture === 'string'
      ? entity.attributes.entity_picture
      : undefined;

  return {
    id: entityId,
    name,
    room,
    size: 'medium',
    entityPicture,
    resources: entityPicture
      ? {
          snapshot: {
            kind: 'camera_snapshot',
            entityId,
            path: entityPicture,
          },
        }
      : undefined,
    state: entity.state,
    supportedFeatures,
    isStreamCapable,
    isStillImageOnly: !isStreamCapable,
    lastChanged: entity.last_changed,
    lastUpdated: entity.last_updated,
  };
}
