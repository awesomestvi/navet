import { isHomeAssistantPanelMode } from '@navet/app/runtime/app-mode';
import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';
import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';

const DASHBOARD_PROFILE_ENDPOINT = '/__navet_profile__/default';
const PROFILE_GENERATION_HEADER = 'X-Navet-Profile-Generation';

export interface DashboardProfileLoadOptions {
  etag?: string;
  lastModified?: string;
}

export interface DashboardProfileLoadResult {
  available: boolean;
  profile: DashboardConfigPayload | null;
  notModified: boolean;
  etag: string | null;
  lastModified: string | null;
  generation: string | null;
}

export interface DashboardProfileSaveResult {
  saved: boolean;
  permanentFailure: boolean;
  etag: string | null;
  lastModified: string | null;
  generation: string | null;
}

export interface DashboardProfileSaveOptions {
  etag?: string;
  keepalive?: boolean;
  lastModified?: string;
}

export interface DashboardProfileResetResult {
  reset: boolean;
  permanentFailure: boolean;
  generation: string | null;
}

function isPermanentProfileSaveFailure(status: number): boolean {
  return status === 400 || status === 404 || status === 405 || status === 413;
}

function readResponseMetadata(response: Response) {
  return {
    etag: response.headers.get('ETag'),
    lastModified: response.headers.get('Last-Modified'),
    generation: response.headers.get(PROFILE_GENERATION_HEADER),
  };
}

export async function loadDashboardProfile(
  options: DashboardProfileLoadOptions = {}
): Promise<DashboardProfileLoadResult> {
  if (isHomeAssistantPanelMode()) {
    return {
      available: false,
      profile: null,
      notModified: false,
      etag: null,
      lastModified: null,
      generation: null,
    };
  }

  try {
    const headers = new Headers();
    if (options.etag) {
      headers.set('If-None-Match', options.etag);
    } else if (options.lastModified) {
      headers.set('If-Modified-Since', options.lastModified);
    }

    const response = await fetch(resolveAddonLocalEndpointUrl(DASHBOARD_PROFILE_ENDPOINT), {
      cache: 'no-store',
      credentials: 'same-origin',
      headers,
    });
    const metadata = readResponseMetadata(response);

    if (response.status === 304) {
      return { available: true, profile: null, notModified: true, ...metadata };
    }

    if (response.status === 204 || response.status === 404) {
      return { available: true, profile: null, notModified: false, ...metadata };
    }

    if (!response.ok) {
      throw new Error(`Dashboard profile request failed with status ${response.status}`);
    }

    if (!response.headers.get('Content-Type')?.includes('application/json')) {
      return { available: false, profile: null, notModified: false, ...metadata };
    }

    const profile = (await response.json()) as Partial<DashboardConfigPayload>;

    if (profile.app !== 'navet' || profile.version !== 3) {
      return { available: false, profile: null, notModified: false, ...metadata };
    }

    return {
      available: true,
      profile: profile as DashboardConfigPayload,
      notModified: false,
      ...metadata,
    };
  } catch (error) {
    console.warn('[DashboardProfile] Unable to fetch shared dashboard profile:', error);
    return {
      available: false,
      profile: null,
      notModified: false,
      etag: null,
      lastModified: null,
      generation: null,
    };
  }
}

export async function saveDashboardProfile(
  profile: DashboardConfigPayload,
  options: DashboardProfileSaveOptions = {}
): Promise<DashboardProfileSaveResult> {
  if (isHomeAssistantPanelMode()) {
    return {
      saved: false,
      permanentFailure: true,
      etag: null,
      lastModified: null,
      generation: null,
    };
  }

  try {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    if (options.etag) {
      headers.set('If-Match', options.etag);
    } else if (options.lastModified) {
      headers.set('If-Unmodified-Since', options.lastModified);
    }

    const response = await fetch(resolveAddonLocalEndpointUrl(DASHBOARD_PROFILE_ENDPOINT), {
      method: 'PUT',
      cache: 'no-store',
      credentials: 'same-origin',
      keepalive: options.keepalive,
      headers,
      body: JSON.stringify(profile),
    });
    const metadata = readResponseMetadata(response);

    return {
      saved: response.ok,
      permanentFailure: isPermanentProfileSaveFailure(response.status),
      ...metadata,
    };
  } catch (error) {
    console.warn('[DashboardProfile] Unable to save shared dashboard profile:', error);
    return {
      saved: false,
      permanentFailure: false,
      etag: null,
      lastModified: null,
      generation: null,
    };
  }
}

export async function deleteDashboardProfile(): Promise<DashboardProfileResetResult> {
  if (isHomeAssistantPanelMode()) {
    return {
      reset: false,
      permanentFailure: true,
      generation: null,
    };
  }

  try {
    const response = await fetch(resolveAddonLocalEndpointUrl(DASHBOARD_PROFILE_ENDPOINT), {
      method: 'DELETE',
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const metadata = readResponseMetadata(response);

    return {
      reset: response.ok,
      permanentFailure: isPermanentProfileSaveFailure(response.status),
      generation: metadata.generation,
    };
  } catch (error) {
    console.warn('[DashboardProfile] Unable to reset shared dashboard profile:', error);
    return {
      reset: false,
      permanentFailure: false,
      generation: null,
    };
  }
}
