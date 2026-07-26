import type {
  CameraFitMode,
  CameraStreamPreference,
  CameraViewMode,
} from '@navet/app/stores/settings-store';

export const CAMERA_VIEW_MODE_OPTIONS = [
  'auto',
  'live',
  'snapshot',
] as const satisfies readonly CameraViewMode[];

export const CAMERA_STREAM_PREFERENCE_OPTIONS = [
  'auto',
  'web_rtc',
  'mse',
  'hls',
  'mjpeg',
] as const satisfies readonly CameraStreamPreference[];

export const CAMERA_FIT_MODE_OPTIONS = [
  'contain',
  'cover',
] as const satisfies readonly CameraFitMode[];
