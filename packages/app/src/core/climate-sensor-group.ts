export type ClimateSensorGroup = 'temperature' | 'humidity' | 'airQuality' | 'pressure';

export function getClimateSensorGroup(deviceClass: unknown): ClimateSensorGroup | null {
  switch (String(deviceClass ?? '').toLowerCase()) {
    case 'temperature':
      return 'temperature';
    case 'humidity':
      return 'humidity';
    case 'air_quality':
    case 'carbon_dioxide':
    case 'pm1':
    case 'pm10':
    case 'pm25':
    case 'volatile_organic_compounds':
    case 'volatile_organic_compounds_parts':
      return 'airQuality';
    case 'pressure':
      return 'pressure';
    default:
      return null;
  }
}
