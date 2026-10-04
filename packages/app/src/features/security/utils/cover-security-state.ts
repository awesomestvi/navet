import type { CoverDevice } from '@navet/app/types/device.types';

export function getCoverSecurityState(device: CoverDevice) {
  return device.state ?? (device.position > 0 ? 'open' : 'closed');
}
