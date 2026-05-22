/**
 * Home Assistant entity utilities
 * Refactored: Main logic extracted to entity-utils/ for better maintainability
 */

export {
  brightnessToPercent,
  formatCalendarTime,
  formatClock,
  formatDaylight,
  formatEntityType,
  formatMediaEntityType,
  formatMetricNumber,
  formatSensorValue,
  getMetricLabel,
  getName,
  helperLabelForDomain,
  inferCalendarEventType,
  inferMetricIcon,
  isAllDayCalendarValue,
  normalizeKelvin,
  normalizeMetric,
  parseCalendarDate,
  parseNumberish,
  parseRoundedNumberish,
  resolveClimateTemperatureUnit,
  resolveEntityRoom,
  resolveHomeAssistantTemperatureUnit,
  toKilowattHours,
  toVolts,
  toWatts,
} from './entity-utils';
