#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const GUARDED_DIRS = [
  'packages/core/src',
  'packages/ui/src',
  'src/app/components/primitives',
  'src/app/components/patterns',
  'src/app/components/shared',
  'src/app/components/system',
  'src/app/features/lighting/components/light-card',
  'src/app/ui-kit',
  'src/providers/core',
];

const FORBIDDEN_PATTERNS = [
  {
    pattern: /from ['"][^'"]*home-assistant-js-websocket['"]/,
    message: 'shared UI layers must not import Home Assistant websocket types or clients',
  },
  {
    pattern: /from ['"][^'"]*\/home-assistant(?:\/|['"])/,
    message: 'provider-neutral layers must not import Home Assistant-specific modules',
  },
  {
    pattern:
      /import\s*\{[^}]*homeAssistantService[^}]*\}\s*from ['"][^'"]*home-assistant\.service['"]/,
    message: 'shared lighting and provider-neutral layers must not import Home Assistant services',
  },
  {
    pattern:
      /import\s*\{[^}]*dispatchEntityAction[^}]*\}\s*from ['"][^'"]*integration-action\.service['"]/,
    message: 'shared lighting and provider-neutral layers must not use legacy entity service dispatch',
  },
  {
    pattern: /\bproviderId\s*===\s*['"]home_assistant['"]/,
    message: 'provider-neutral layers must not branch on the Home Assistant provider id',
  },
  {
    pattern: /\bentity_id\b/,
    message: 'provider-neutral layers must not depend on raw Home Assistant entity_id fields',
  },
  {
    pattern: /\bsupported_features\b/,
    message: 'provider-neutral layers must not depend on Home Assistant supported_features bitmasks',
  },
  {
    pattern: /\bdevice_class\b/,
    message: 'provider-neutral layers must not depend on Home Assistant device_class values',
  },
  {
    pattern: /\bcallService\b/,
    message: 'provider-neutral layers must not depend on provider service callers',
  },
];

const TARGETED_GUARDS = [
  {
    paths: [
      'packages/provider-hubitat/src/hubitat-adapter.ts',
      'packages/provider-hubitat/src/hubitat-runtime-registration.ts',
      'packages/provider-hubitat/src/internal-planned-provider.ts',
      'packages/provider-smartthings/src/smartthings-adapter.ts',
      'packages/provider-smartthings/src/smartthings-runtime-registration.ts',
      'packages/provider-smartthings/src/internal-planned-provider.ts',
      'src/app/core/provider-snapshot-builders.ts',
      'src/app/features/climate/components/hvac-card/use-hvac-card-controller.ts',
      'src/app/features/climate/components/hvac-settings-dialog/index.tsx',
      'src/app/features/auth/login-page.tsx',
      'src/app/features/tasks/components/automation-task-row.tsx',
      'src/app/features/lighting/components/use-switch-card-controller.tsx',
      'src/app/features/lighting/components/use-switch-toggle-action.ts',
      'src/app/features/media/components/media-card/use-media-card-controller.ts',
      'src/app/features/media/components/media-card/use-media-entity-sync.ts',
      'src/app/features/media/components/media/media-spotify-playback.tsx',
      'src/app/features/security/components/camera-card/use-provider-camera-live-data.ts',
      'src/app/features/security/components/camera-card/container.tsx',
      'src/app/features/security/components/cover-card/container.tsx',
      'src/app/features/security/components/lock-card.tsx',
      'src/app/features/person/components/person-card.tsx',
      'src/app/features/sensors/components/sensor-card.tsx',
      'src/app/features/scenes/components/scene-card.tsx',
      'src/app/features/tasks/components/quick-action-grid.tsx',
      'src/app/features/lighting/components/fan-card/index.tsx',
      'src/app/features/climate/components/hvac-card/use-hvac-card-controller.ts',
      'src/app/features/lighting/components/switch-settings-dialog.tsx',
      'src/app/features/media/components/media-card/use-media-playback.ts',
      'src/app/features/media/components/media-card/use-media-grouping.ts',
      'src/app/features/media/components/media-card/use-media-volume.ts',
      'src/app/features/media/components/media/media-spotify-playback.tsx',
      'src/app/features/vacuum/components/vacuum-card/index.tsx',
      'src/app/features/vacuum/components/vacuum/use-vacuum-control.ts',
      'src/app/features/dashboard/components/widgets/button-widget.tsx',
      'src/app/features/dashboard/components/widgets/use-provider-info-widget-data.ts',
      'src/app/features/dashboard/components/widgets/use-provider-ups-widget-data.ts',
      'src/app/features/dashboard/components/widgets/ups-widget-data.ts',
      'src/app/features/dashboard/utils/card-renderer.tsx',
      'src/app/components/layout/use-header-controller.ts',
      'src/app/features/sensors/hooks/use-sensor-statistics-history.ts',
      'src/app/features/energy/hooks/use-energy-load-history.ts',
      'src/app/features/energy/hooks/use-energy-statistics-periods.ts',
      'src/app/hooks/use-provider-calendar-devices.ts',
      'src/app/hooks/use-provider-weather-devices.ts',
      'src/app/hooks/use-aggregated-rooms.ts',
      'src/app/hooks/index.ts',
      'src/app/services/integration-action.service.ts',
      'src/app/services/integration-registry.service.ts',
      'src/app/services/integration-camera-runtime.service.ts',
      'src/auth/integration-session-runtime.ts',
      'src/auth/session-runtime-registry.ts',
      'src/providers/provider-contract-registry.ts',
      'src/providers/provider-runtime-registry.ts',
      'src/providers/core/snapshot-backed-adapter.ts',
      'src/app/utils/provider-entity-id.ts',
    ],
    patterns: [
      {
        pattern:
          /import\s*\{[^}]*homeAssistantService[^}]*\}\s*from ['"][^'"]*home-assistant\.service['"]/,
        message:
          'migrated shared feature files must not import Home Assistant services directly',
      },
      {
        pattern:
          /import\s*\{[^}]*dispatchEntityAction[^}]*\}\s*from ['"][^'"]*integration-action\.service['"]/,
        message: 'migrated shared feature files must not use legacy entity service dispatch',
      },
      {
        pattern:
          /import\s*\{[^}]*dispatchServiceAction[^}]*\}\s*from ['"][^'"]*integration-action\.service['"]/,
        message: 'migrated shared feature files must not use legacy service dispatch',
      },
      {
        pattern: /\bproviderId\s*===\s*['"]home_assistant['"]/,
        message: 'migrated shared feature files must not branch on the Home Assistant provider id',
      },
      {
        pattern: /\bsupported_features\b/,
        message:
          'migrated shared feature files must not depend on Home Assistant supported_features bitmasks',
      },
      {
        pattern: /\bdevice_class\b/,
        message: 'migrated shared feature files must not depend on Home Assistant device_class values',
      },
      {
        pattern: /from ['"][^'"]*auth-session-manager['"]/,
        message: 'migrated app-owned files must not import authSessionManager directly',
      },
      {
        pattern: /from ['"][^'"]*legacy-compat['"]/,
        message: 'migrated app-owned files must not import the legacy compatibility adapter',
      },
      {
        pattern: /from ['"]@\/app\/services\/integration-action\.service['"]/,
        message:
          'package-ready shared and app-owned files must not import the legacy action module directly',
      },
      {
        pattern: /from ['"]@navet\/app\/navet-compat['"]/,
        message: 'package-ready files must not import the removed public navet-compat surface',
      },
      {
        pattern: /from ['"]@\/providers\/core\//,
        message: 'package-ready files must import provider-neutral contracts through @navet/core',
      },
      {
        pattern: /from ['"]@\/app\/core\/navet['"]/,
        message:
          'package-ready provider and app-owned files must not import compatibility models from src/app/core/navet',
      },
      {
        pattern: /from ['"]@\/providers\/homeassistant\//,
        message:
          'package-ready files must import Home Assistant provider code through @navet/provider-homeassistant',
      },
      {
        pattern: /from ['"]@\/providers\/homey\//,
        message: 'package-ready files must import Homey provider code through @navet/provider-homey',
      },
      {
        pattern: /from ['"]@\/providers\/openhab\//,
        message:
          'package-ready files must import openHAB provider code through @navet/provider-openhab',
      },
      {
        pattern: /from ['"]@\/providers\/planned\//,
        message:
          'package-ready files must not import planned provider helpers directly once package-shaped planned providers exist',
      },
      {
        pattern: /from ['"]@\/providers\/provider-(?:contract|runtime)-registry['"]/,
        message: 'package-ready app-owned files must import registries through @navet/app entry surfaces',
      },
      {
        pattern: /from ['"][^'"]*\/app\/services\/home-assistant-[^'"]+['"]/,
        message:
          'package-ready app-owned files must not import Home Assistant feature wrappers from app services',
      },
      {
        pattern: /from ['"]@navet\/app\/internal\/legacy-actions['"]/,
        message:
          'package-ready shared and app-owned files must not use the internal legacy action bridge',
      },
      {
        pattern: /from ['"]@navet\/app\/internal\/compat-selectors['"]/,
        message:
          'package-ready shared and app-owned files must not import compatibility selectors directly',
      },
      {
        pattern: /from ['"]@navet\/app\/internal\/compat-hooks['"]/,
        message:
          'package-ready shared and app-owned files must not import compatibility hooks directly',
      },
      {
        pattern: /useProviderDevice\(/,
        message:
          'migrated shared feature files must not use compatibility-first provider device readers',
      },
      {
        pattern: /useNavetDevices\(|useNavetRooms\(|useNavetProviderDevices\(/,
        message:
          'package-ready shared and app-owned files must not use compatibility-first room or device hooks',
      },
      {
        pattern: /devicesByCanonicalId/,
        message:
          'migrated shared feature files must not depend on compatibility device indexes',
      },
      {
        pattern: /from ['"]@navet\/core\/navet-device-entity['"]/,
        message:
          'package-ready files must use the app internal compatibility entity bridge instead of @navet/core/navet-device-entity',
      },
    ],
  },
  {
    paths: [
      'src/app/stores/integration-store.ts',
    ],
    patterns: [
      {
        pattern:
          /import\s*\{[^}]*homeAssistantService[^}]*\}\s*from ['"][^'"]*home-assistant\.service['"]/,
        message:
          'migrated shared feature files must not import Home Assistant services directly',
      },
      {
        pattern: /from ['"][^'"]*auth-session-manager['"]/,
        message: 'migrated app-owned files must not import authSessionManager directly',
      },
      {
        pattern: /from ['"][^'"]*legacy-compat['"]/,
        message: 'migrated app-owned files must not import the legacy compatibility adapter',
      },
      {
        pattern: /from ['"]@\/providers\/core\//,
        message: 'package-ready files must import provider-neutral contracts through @navet/core',
      },
      {
        pattern: /from ['"]@\/app\/core\/navet['"]/,
        message:
          'package-ready provider and app-owned files must not import compatibility models from src/app/core/navet',
      },
    ],
  },
  {
    paths: [
      'src/providers/homeassistant/homeassistant-mappers.ts',
      'src/providers/homey/homey-mappers.ts',
      'src/providers/openhab/openhab-mappers.ts',
    ],
    patterns: [
      {
        pattern: /from ['"]@\/app\/core\/navet['"]/,
        message:
          'provider mapper files must not import compatibility models from src/app/core/navet',
      },
      {
        pattern: /from ['"]@\/providers\/core\//,
        message: 'provider mapper files must import provider-neutral helpers through package/internal entries',
      },
      {
        pattern: /from ['"]@navet\/core\/navet-device-entity['"]/,
        message:
          'provider mapper files must use the app internal compatibility entity bridge instead of @navet/core/navet-device-entity',
      },
      {
        pattern: /from ['"]@navet\/app\/internal\/compat-models['"]/,
        message:
          'provider mapper files must not depend on app-owned compatibility models for their primary outputs',
      },
      {
        pattern: /from ['"]@navet\/app\/internal\/compat-entity['"]/,
        message:
          'provider mapper files must not depend on app-owned compatibility entity bridges for their primary outputs',
      },
    ],
  },
];

const REMOVED_LEGACY_FILES = [
  'src/app/core/navet-mappers.ts',
  'src/app/internal/legacy-actions.ts',
  'src/providers/core/legacy-compat.ts',
  'src/providers/core/navet-device-entity.ts',
  'src/providers/homeassistant/homeassistant-feature-services.ts',
  'src/app/services/home-assistant-admin-feature.service.ts',
  'src/app/services/home-assistant-calendar-feature.service.ts',
  'src/app/services/home-assistant-camera-feature.service.ts',
  'src/app/services/home-assistant-climate-feature.service.ts',
  'src/app/services/home-assistant-energy-feature.service.ts',
  'src/app/services/home-assistant-entity-runtime.service.ts',
  'src/app/services/home-assistant-history-feature.service.ts',
  'src/app/services/home-assistant-light-feature.service.ts',
  'src/app/services/home-assistant-media-feature.service.ts',
  'src/app/services/home-assistant-notification-feature.service.ts',
  'src/app/services/home-assistant-security-feature.service.ts',
  'src/app/services/home-assistant-task-feature.service.ts',
  'src/app/services/home-assistant-weather-feature.service.ts',
  'src/providers/planned/planned-provider-adapter.ts',
  'src/providers/planned/planned-provider-runtime-registration.ts',
  'src/app/hooks/use-navet-devices.ts',
];

function walk(dir) {
  const entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '__tests__') {
        continue;
      }
      files.push(...walk(relativePath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) || entry.name.includes('.stories.')) {
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

const violations = [];

for (const dir of GUARDED_DIRS) {
  for (const relativePath of walk(dir)) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

    for (const { pattern, message } of FORBIDDEN_PATTERNS) {
      if (pattern.test(source)) {
        violations.push(`${relativePath}: ${message}`);
      }
    }
  }
}

for (const guard of TARGETED_GUARDS) {
  for (const relativePath of guard.paths) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    for (const { pattern, message } of guard.patterns) {
      if (pattern.test(source)) {
        violations.push(`${relativePath}: ${message}`);
      }
    }
  }
}

for (const relativePath of REMOVED_LEGACY_FILES) {
  if (fs.existsSync(path.join(ROOT, relativePath))) {
    violations.push(`${relativePath}: legacy Home Assistant mapping file must not exist`);
  }
}

if (violations.length > 0) {
  console.error('\nProvider boundary check failed:\n');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Provider boundary check passed.');
