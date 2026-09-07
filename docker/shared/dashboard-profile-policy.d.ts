export interface DashboardProfileData {
  app: 'navet';
  version: 3 | 4;
  exportedAt?: string;
  [key: string]: unknown;
}
export interface SanitizedDisplayProfilePolicy extends Record<string, unknown> {
  schemaVersion: 1;
  profilesById: Record<string, {
    id: string;
    name: string;
    settings: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>;
  profileIdByClientId: Record<string, string>;
}
declare const policy: {
  isValidProfile(value: unknown): value is DashboardProfileData;
  sanitizeDashboardProfile(profile: DashboardProfileData): DashboardProfileData;
  areDashboardProfilesEquivalent(current: DashboardProfileData, candidate: DashboardProfileData): boolean;
  pickDisplayProfileSettings(value: unknown): Record<string, unknown>;
  sanitizePreferenceValues(value: Record<string, unknown>, scope: 'account' | 'client'): Record<string, unknown>;
  sanitizeDisplayProfilePolicy(value: unknown): SanitizedDisplayProfilePolicy;
  applyDashboardProfilePatch(source: DashboardProfileData, operations: { op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }[]): DashboardProfileData;
  DISPLAY_PROFILE_ID_PATTERN: RegExp;
};
export default policy;
