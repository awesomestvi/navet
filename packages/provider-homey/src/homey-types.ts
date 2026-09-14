export interface HomeyCapabilityState {
  value: unknown;
  units?: string;
  title?: string;
  min?: number;
  max?: number;
  step?: number;
  type?: 'boolean' | 'number' | 'enum' | 'string';
  setable?: boolean;
  values?: { id: string; title: string }[];
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
  flows?: Record<string, HomeyFlow>;
  advancedFlows?: Record<string, HomeyFlow>;
  moods?: Record<string, HomeyMood>;
  users?: Record<string, HomeyUser>;
  me?: HomeyUser;
  notifications?: Record<string, HomeyNotification>;
  apps?: Record<string, HomeyApp>;
  logs?: Record<string, HomeyLog>;
  resourceErrors?: Record<string, string>;
}

export interface HomeyFlow {
  id: string;
  name: string;
  enabled?: boolean;
  triggerable?: boolean;
  trigger?: { id: string };
}
export interface HomeyMood {
  id: string;
  name: string;
  zone?: string;
}
export interface HomeyUser {
  id: string;
  name?: string;
  email?: string;
  present?: boolean | null;
  asleep?: boolean | null;
  properties?: { favoriteDevices?: string[]; favoriteFlows?: string[]; [key: string]: unknown };
}
export interface HomeyNotification {
  id: string;
  excerpt: string;
  ownerName?: string;
  dateCreated?: string;
}
export interface HomeyApp {
  id: string;
  name: string;
  version?: string;
  state?: string;
}
export interface HomeyLog {
  id: string;
  ownerUri?: string;
  uri?: string;
  ownerId?: string;
  ownerName?: string;
  title?: string;
  units?: string;
  lastValue?: number | boolean | null;
}
