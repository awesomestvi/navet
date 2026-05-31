import { Blinds, DoorOpen, Fence, Home, ShieldCheck, SunDim } from 'lucide-react';
import type { DeviceClass, DeviceClassConfig } from './types';

export const DEVICE_CLASS_CONFIG: Record<DeviceClass, DeviceClassConfig> = {
  blind: { labelKey: 'cover.deviceClass.blind', icon: Blinds },
  shade: { labelKey: 'cover.deviceClass.shade', icon: Blinds },
  curtain: { labelKey: 'cover.deviceClass.curtain', icon: Home },
  garage: { labelKey: 'cover.deviceClass.garage', icon: DoorOpen },
  gate: { labelKey: 'cover.deviceClass.gate', icon: Fence },
  awning: { labelKey: 'cover.deviceClass.awning', icon: SunDim },
  shutter: { labelKey: 'cover.deviceClass.shutter', icon: ShieldCheck },
  door: { labelKey: 'cover.deviceClass.door', icon: DoorOpen },
};
