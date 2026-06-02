import path from 'node:path'

export const LAZY_HTML_PRELOAD_CHUNKS = [
  'dashboard-card-item-draggable',
  'dashboard-widget-battery',
  'dashboard-widget-button',
  'dashboard-widget-energy',
  'dashboard-widget-map',
  'dashboard-widget-note',
  'dashboard-widget-photo',
  'dashboard-widget-rss',
  'dashboard-widget-shared',
  'dashboard-widgets',
  'dnd-vendor',
  'energy',
  'entity-card-calendar',
  'entity-card-camera',
  'entity-card-climate',
  'entity-card-cover',
  'entity-card-lighting',
  'entity-card-lock',
  'entity-card-media',
  'entity-card-person',
  'entity-card-scenes',
  'entity-card-security',
  'entity-card-sensors',
  'entity-card-vacuum',
  'entity-card-weather',
  'home-dashboard-overview-edit',
  'leaflet-vendor',
  'sections',
  'settings',
] as const

export function normalizeModuleId(id: string) {
  return id.split(path.sep).join('/')
}

export function isLazyHtmlPreload(dependency: string) {
  return LAZY_HTML_PRELOAD_CHUNKS.some((chunkName) =>
    new RegExp(`(?:^|/)${chunkName}-[^/]+\\.(?:js|css)$`).test(dependency)
  )
}

function getPackageName(id: string) {
  const parts = id.split('node_modules/')
  const packagePath = parts.at(-1)
  if (!packagePath) {
    return null
  }

  const segments = packagePath.split('/')

  if (segments[0]?.startsWith('@') && segments[1]) {
    return `${segments[0]}/${segments[1]}`
  }

  return segments[0] ?? null
}

export function getAppChunkName(id: string) {
  const moduleId = normalizeModuleId(id)

  if (!moduleId.includes('/packages/app/src/')) {
    return undefined
  }

  if (
    moduleId.includes('/packages/app/src/features/energy/') ||
    moduleId.includes('/packages/app/src/hooks/ha-battery-sensor-rows')
  ) {
    return 'energy'
  }

  if (moduleId.includes('/packages/app/src/features/settings/')) {
    return 'settings'
  }

  if (moduleId.includes('/packages/app/src/features/calendar/')) {
    return 'entity-card-calendar'
  }

  if (moduleId.includes('/packages/app/src/features/climate/')) {
    return 'entity-card-climate'
  }

  if (moduleId.includes('/packages/app/src/features/lighting/')) {
    return 'entity-card-lighting'
  }

  if (moduleId.includes('/packages/app/src/features/media/')) {
    return 'entity-card-media'
  }

  if (moduleId.includes('/packages/app/src/features/person/')) {
    return 'entity-card-person'
  }

  if (moduleId.includes('/packages/app/src/features/scenes/')) {
    return 'entity-card-scenes'
  }

  if (moduleId.includes('/packages/app/src/features/security/')) {
    if (moduleId.includes('/packages/app/src/features/security/components/camera-card/')) {
      return 'entity-card-camera'
    }

    if (moduleId.includes('/packages/app/src/features/security/components/cover-card/')) {
      return 'entity-card-cover'
    }

    if (moduleId.includes('/packages/app/src/features/security/components/lock-card')) {
      return 'entity-card-lock'
    }

    return 'entity-card-security'
  }

  if (moduleId.includes('/packages/app/src/features/sensors/')) {
    return 'entity-card-sensors'
  }

  if (moduleId.includes('/packages/app/src/features/vacuum/')) {
    return 'entity-card-vacuum'
  }

  if (moduleId.includes('/packages/app/src/features/weather/')) {
    return 'entity-card-weather'
  }

  if (
    moduleId.includes('/packages/app/src/features/dashboard/components/widgets/map-') ||
    moduleId.includes('/packages/app/src/features/dashboard/components/widgets/map-widget')
  ) {
    return 'dashboard-widget-map'
  }

  if (moduleId.includes('/packages/app/src/features/dashboard/components/widgets/photo-frame')) {
    return 'dashboard-widget-photo'
  }

  if (moduleId.includes('/packages/app/src/features/dashboard/components/widgets/battery-')) {
    return 'dashboard-widget-battery'
  }

  if (
    moduleId.includes('/packages/app/src/features/dashboard/components/widgets/energy-now') ||
    moduleId.includes('/packages/app/src/features/energy/')
  ) {
    return 'dashboard-widget-energy'
  }

  if (
    moduleId.includes('/packages/app/src/features/dashboard/components/widgets/button-widget') ||
    moduleId.includes('/packages/app/src/features/dashboard/utils/button-widget-security')
  ) {
    return 'dashboard-widget-button'
  }

  if (moduleId.includes('/packages/app/src/features/dashboard/components/widgets/note-widget')) {
    return 'dashboard-widget-note'
  }

  if (
    moduleId.includes('/packages/app/src/features/dashboard/components/widgets/') ||
    moduleId.includes('/packages/app/src/components/shared/theme/dashboard-widget-surface-tokens') ||
    moduleId.includes('/packages/app/src/features/rss/')
  ) {
    return moduleId.includes('/packages/app/src/features/rss/')
      ? 'dashboard-widget-rss'
      : 'dashboard-widget-shared'
  }

  if (moduleId.includes('/packages/app/src/features/dashboard/components/home-dashboard-overview-edit')) {
    return 'home-dashboard-overview-edit'
  }

  if (
    moduleId.includes('/packages/app/src/components/layout/') ||
    moduleId.includes('/packages/app/src/components/shared/entity-room-selector') ||
    moduleId.includes('/packages/app/src/components/primitives/room-eyebrow') ||
    moduleId.includes('/packages/app/src/components/primitives/select') ||
    moduleId.includes('/packages/app/src/hooks/use-registry-device-topology')
  ) {
    return 'sections'
  }

  return undefined
}

export function getVendorChunkName(id: string) {
  const moduleId = normalizeModuleId(id)
  if (!moduleId.includes('node_modules')) {
    return undefined
  }

  const packageName = getPackageName(moduleId)
  if (!packageName) {
    return undefined
  }

  if (packageName === 'react' || packageName === 'react-dom' || packageName === 'scheduler') {
    return 'react-vendor'
  }

  if (packageName.startsWith('@radix-ui/')) {
    return 'radix-vendor'
  }

  if (
    packageName === '@dnd-kit/core' ||
    packageName === '@dnd-kit/sortable' ||
    packageName === '@dnd-kit/utilities'
  ) {
    return 'dnd-vendor'
  }

  if (packageName === 'home-assistant-js-websocket') {
    return 'ha-vendor'
  }

  if (packageName === 'hls.js') {
    return 'media-stream-vendor'
  }

  if (packageName === 'lucide-react') {
    return 'icons-vendor'
  }

  if (packageName === 'leaflet' || packageName === 'react-leaflet') {
    return 'leaflet-vendor'
  }

  return 'vendor'
}
