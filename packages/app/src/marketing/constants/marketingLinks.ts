import { GITHUB_REPO_URL } from '@navet/app/constants/urls';

const DEFAULT_PUBLIC_SITE_URL = 'https://navet.app/';
const DEMO_SITE_URL = 'https://demo.navet.app/';
const DOCS_SITE_URL = 'https://docs.navet.app/';
const STORYBOOK_SITE_URL = 'https://storybook.navet.app/';

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
  demo: DEMO_SITE_URL,
  storybook: STORYBOOK_SITE_URL,
  github: GITHUB_REPO_URL,
  roadmapDoc: joinUrl(DOCS_SITE_URL, 'roadmap/'),
  docsIndex: DOCS_SITE_URL,
  gettingStarted: joinUrl(DOCS_SITE_URL, 'getting-started/'),
  install: {
    page: joinUrl(DOCS_SITE_URL, 'install/'),
    homeAssistantGuide: joinUrl(DOCS_SITE_URL, 'install/home-assistant/'),
    homeAssistantCustomPanel: `${joinUrl(DOCS_SITE_URL, 'install/home-assistant/')}#home-assistant-custom-panel`,
    homeAssistantAddon: `${joinUrl(DOCS_SITE_URL, 'install/home-assistant/')}#home-assistant-add-on`,
    standaloneDocker: `${joinUrl(DOCS_SITE_URL, 'install/home-assistant/')}#standalone-docker`,
    homey: joinUrl(DOCS_SITE_URL, 'install/homey/'),
    openhab: joinUrl(DOCS_SITE_URL, 'install/openhab/'),
  },
} as const;
