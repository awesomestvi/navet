import type { DeviceCollection } from '../types/device.types';

/**
 * Mock device data
 * In production, this would be fetched from an API
 */
export const DEVICES: DeviceCollection = {
  calendars: [],
  lights: [],
  hvac: [],
  climate: [],
  power: [],
  media: [],
  weather: [],
  switches: [],
  covers: [],
  locks: [],
  scenes: [],
  persons: [],
  sensors: [],
  cameras: [],
  'grouped-sensors': [
    {
      id: 'energy-sensors-1',
      name: 'Energy Monitor',
      room: 'Living Room',
      accentColor: 'amber' as const,
      size: 'medium' as const,
      sensors: [
        { id: 'energy-today', label: 'Today', value: '12.4', unit: 'kWh', icon: 'zap' as const },
        {
          id: 'energy-current',
          label: 'Current',
          value: '2.3',
          unit: 'kW',
          icon: 'activity' as const,
        },
        { id: 'energy-bathroom', label: 'Bathroom', value: '450', unit: 'W', icon: 'zap' as const },
        { id: 'energy-kitchen', label: 'Kitchen', value: '1.2', unit: 'kW', icon: 'zap' as const },
      ],
    },
    {
      id: 'climate-sensors-1',
      name: 'Climate Sensors',
      room: 'Bedroom',
      accentColor: 'blue' as const,
      size: 'medium' as const,
      sensors: [
        {
          id: 'climate-temp',
          label: 'Temperature',
          value: '21',
          unit: '°C',
          icon: 'thermometer' as const,
        },
        {
          id: 'climate-humidity',
          label: 'Humidity',
          value: '55',
          unit: '%',
          icon: 'droplets' as const,
        },
        { id: 'climate-air', label: 'Air Quality', value: 'Good', unit: '', icon: 'wind' as const },
      ],
    },
  ],
  vacuums: [],
};
