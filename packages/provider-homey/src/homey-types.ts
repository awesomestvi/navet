export interface HomeyCapabilityState {
  value: unknown;
  units?: string;
  title?: string;
  min?: number;
  max?: number;
}

export interface HomeyCloudHomey {
  id: string;
  name: string;
  platform?: string | null;
  localUrl?: string | null;
  localUrlSecure?: string | null;
  remoteUrl?: string | null;
}

export interface HomeyDevice {
  id: string;
  name: string;
  class?: string;
  virtualClass?: string | null;
  zone?: string | null;
  capabilities?: string[];
  capabilitiesObj?: Record<string, HomeyCapabilityState>;
  available?: boolean;
}

export interface HomeyZone {
  id: string;
  name: string;
  parent?: string | null;
}

export interface HomeySnapshot {
  connected: boolean;
  devices: Record<string, HomeyDevice>;
  zones: Record<string, HomeyZone>;
}
