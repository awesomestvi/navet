/**
 * Device mapper registry - Re-exports all device mappers
 * Individual mappers are extracted to reduce file size and improve maintainability
 */

export {
  mapCalendarSources,
  mapCameraDevice,
  mapClimateDevice,
  mapCoverDevice,
  mapFanDevice,
  mapLightDevice,
  mapLockDevice,
  mapMediaDevice,
  mapPersonDevice,
  mapSceneDevice,
  mapSensorDevice,
  mapSwitchDevice,
  mapVacuumDevice,
  mapWeatherDevice,
} from './device-mappers';
