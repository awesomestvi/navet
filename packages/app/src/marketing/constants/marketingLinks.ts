import { GITHUB_REPO_URL } from '@navet/app/constants/urls';

const DEFAULT_PUBLIC_SITE_URL = 'https://navet.app/';

function normalizeBaseUrl(url: string) {
  return url.endsWith('/') ? url : `${url}/`;
}

function joinUrl(baseUrl: string, path: string) {
  return new URL(path.replace(/^\/+/, ''), normalizeBaseUrl(baseUrl)).toString();
}

export function getMarketingPublicSiteUrl() {
  return normalizeBaseUrl(import.meta.env.VITE_NAVET_PUBLIC_URL ?? DEFAULT_PUBLIC_SITE_URL);
}

export function getMarketingWebsitePath(pathname: string) {
  const baseUrl = normalizeBaseUrl(import.meta.env.BASE_URL ?? '/');
  const normalizedPathname = pathname.replace(/^\/+/, '');
  return normalizedPathname ? `${baseUrl}${normalizedPathname}` : baseUrl;
}

export const MARKETING_URLS = {
  website: getMarketingPublicSiteUrl(),
  demo: joinUrl(getMarketingPublicSiteUrl(), 'demo/'),
  storybook: joinUrl(getMarketingPublicSiteUrl(), 'storybook/'),
  github: GITHUB_REPO_URL,
  roadmapDoc: `${GITHUB_REPO_URL}/blob/main/docs/ROADMAP.md`,
  docsIndex: `${GITHUB_REPO_URL}/blob/main/docs/README.md`,
  gettingStarted: `${GITHUB_REPO_URL}#getting-started`,
  install: {
    page: getMarketingWebsitePath('/install/'),
    homeAssistantGuide: `${GITHUB_REPO_URL}/blob/main/docs/HOME_ASSISTANT.md`,
    homeAssistantCustomPanel: `${GITHUB_REPO_URL}/blob/main/docs/HOME_ASSISTANT.md#home-assistant-custom-panel`,
    homeAssistantAddon: `${GITHUB_REPO_URL}/blob/main/docs/HOME_ASSISTANT.md#home-assistant-add-on`,
    standaloneDocker: `${GITHUB_REPO_URL}/blob/main/docs/HOME_ASSISTANT.md#standalone-docker`,
    homey: `${GITHUB_REPO_URL}/blob/main/docs/HOMEY.md`,
    openhab: `${GITHUB_REPO_URL}/blob/main/docs/OPENHAB.md`,
  },
} as const;
