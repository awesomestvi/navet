/** Normalized hub resources for provider details and controls. IDs are provider scoped. */
export type ProviderHubSection =
  | 'devices'
  | 'rooms'
  | 'automations'
  | 'scenes'
  | 'people'
  | 'notifications'
  | 'apps'
  | 'installations'
  | 'history';
export interface ProviderHubControl {
  id: string;
  name: string;
  value: boolean | number | string | null;
  type: 'boolean' | 'number' | 'enum' | 'string';
  writable: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { id: string; name: string }[];
}
export interface ProviderHubResource {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  available: boolean;
  current?: boolean;
  runnable?: boolean;
  favorite?: boolean;
  controls?: ProviderHubControl[];
}
export interface ProviderHubSnapshot {
  sections: Record<ProviderHubSection, ProviderHubResource[]>;
  errors: Partial<Record<ProviderHubSection, string>>;
  profile?: { name: string; email?: string };
}
export interface ProviderHubFeatureService {
  getSnapshot(): Promise<ProviderHubSnapshot>;
  refresh(): Promise<ProviderHubSnapshot>;
  subscribe(listener: () => void): () => void;
  run(resourceId: string): Promise<void>;
  setFavorite(resourceId: string, favorite: boolean): Promise<void>;
  setControl(
    resourceId: string,
    controlId: string,
    value: boolean | number | string
  ): Promise<void>;
  getHistory(
    resourceId: string,
    period: 'day' | 'week' | 'month'
  ): Promise<{ time: string; value: number | boolean }[]>;
}
