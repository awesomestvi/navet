import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));

export const repoRoot = resolve(scriptsDir, '..');

export const appPaths = {
  standaloneDist: resolve(repoRoot, 'apps/standalone/dist'),
  demoDist: resolve(repoRoot, 'apps/demo/dist'),
  websiteDist: resolve(repoRoot, 'apps/website/dist'),
  storybookDist: resolve(repoRoot, 'apps/storybook/dist'),
  haPanelDist: resolve(repoRoot, 'apps/ha-panel/dist'),
  siblingHacsRepoRoot: resolve(repoRoot, '../navet-hacs'),
};

export const assetPaths = {
  root: resolve(repoRoot, 'assets'),
  public: resolve(repoRoot, 'assets/public'),
  referenceRoot: resolve(repoRoot, 'assets/reference'),
  wallpapersRoot: resolve(repoRoot, 'assets/reference/wallpapers'),
  wallpapersSource: resolve(repoRoot, 'assets/reference/wallpapers/source'),
  marketingRoot: resolve(repoRoot, 'assets/reference/marketing'),
  marketingScreenshots: resolve(repoRoot, 'assets/reference/marketing/screenshots'),
  marketingUseCases: resolve(repoRoot, 'assets/reference/marketing/use-cases'),
  referenceMedia: resolve(repoRoot, 'assets/reference/media'),
  generatedWallpapers: resolve(repoRoot, 'assets/public/wallpapers/generated'),
};

export const homeAssistantPaths = {
  root: resolve(repoRoot, 'platform/home-assistant'),
  addonsRoot: resolve(repoRoot, 'platform/home-assistant/addons'),
  addonNavet: resolve(repoRoot, 'platform/home-assistant/addons/navet'),
  addonNavetDev: resolve(repoRoot, 'platform/home-assistant/addons/navet-dev'),
  platformCustomComponentsRoot: resolve(repoRoot, 'platform/home-assistant/custom_components'),
  platformNavetCustomComponent: resolve(repoRoot, 'platform/home-assistant/custom_components/navet'),
  platformNavetFrontend: resolve(
    repoRoot,
    'platform/home-assistant/custom_components/navet/frontend'
  ),
  platformNavetManifest: resolve(
    repoRoot,
    'platform/home-assistant/custom_components/navet/manifest.json'
  ),
  rootRepositoryMetadata: resolve(repoRoot, 'repository.yaml'),
  addonConfig: resolve(repoRoot, 'platform/home-assistant/addons/navet/config.yaml'),
  addonChangelog: resolve(repoRoot, 'platform/home-assistant/addons/navet/CHANGELOG.md'),
  addonDockerfile: resolve(repoRoot, 'platform/home-assistant/addons/navet/Dockerfile'),
  hacsReadmeTemplate: resolve(repoRoot, 'platform/home-assistant/repo-templates/hacs/README.md'),
  hacsMetadataTemplate: resolve(repoRoot, 'platform/home-assistant/repo-templates/hacs/hacs.json'),
};
