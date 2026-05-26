import type { DashboardConfigPayload } from '@/app/utils/dashboard-config';
import { resolveAddonLocalEndpointUrl } from '@/app/utils/home-assistant-connection-target';

const DASHBOARD_PROFILE_ENDPOINT = '/__navet_profile__/default';

export interface DashboardProfileLoadResult {
  available: boolean;
  profile: DashboardConfigPayload | null;
}

export interface DashboardProfileSaveResult {
  saved: boolean;
  permanentFailure: boolean;
}

export async function loadDashboardProfile(): Promise<DashboardProfileLoadResult> {
  try {
    const response = await fetch(resolveAddonLocalEndpointUrl(DASHBOARD_PROFILE_ENDPOINT), {
      cache: 'no-store',
      credentials: 'same-origin',
    });

    if (response.status === 204 || response.status === 404) {
      return { available: true, profile: null };
    }

    if (!response.ok) {
      throw new Error(`Dashboard profile request failed with status ${response.status}`);
    }

    if (!response.headers.get('Content-Type')?.includes('application/json')) {
      return { available: false, profile: null };
    }

    const profile = (await response.json()) as Partial<DashboardConfigPayload>;

    if (profile.app !== 'navet' || profile.version !== 3) {
      return { available: false, profile: null };
    }

    return { available: true, profile: profile as DashboardConfigPayload };
  } catch (error) {
    console.warn('[DashboardProfile] Unable to fetch shared dashboard profile:', error);
    return { available: false, profile: null };
  }
}

export async function saveDashboardProfile(
  profile: DashboardConfigPayload
): Promise<DashboardProfileSaveResult> {
  try {
    const response = await fetch(resolveAddonLocalEndpointUrl(DASHBOARD_PROFILE_ENDPOINT), {
      method: 'PUT',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });

    return {
      saved: response.ok,
      permanentFailure: response.status === 400 || response.status === 413,
    };
  } catch (error) {
    console.warn('[DashboardProfile] Unable to save shared dashboard profile:', error);
    return {
      saved: false,
      permanentFailure: false,
    };
  }
}
