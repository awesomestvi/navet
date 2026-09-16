'use strict';

module.exports = [
  {
    id: 'living-room-color-lamp',
    name: 'Living room color lamp',
    zoneCandidates: ['Living Room'],
    deviceClass: 'light',
    icon: '/icons/light.svg',
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_mode'],
    initialState: { onoff: true, dim: 0.6, light_hue: 0.08, light_saturation: 0.75, light_mode: 'color' },
  },
  {
    id: 'kitchen-leak-sensor',
    name: 'Kitchen leak sensor',
    zoneCandidates: ['Kitchen'],
    deviceClass: 'sensor',
    icon: '/icons/sensor.svg',
    capabilities: ['alarm_water', 'measure_battery'],
    initialState: { alarm_water: true, measure_battery: 24 },
  },
  {
    id: 'living-room-ceiling',
    name: 'Living room ceiling',
    zoneCandidates: ['Living Room'],
    deviceClass: 'light',
    icon: '/icons/light.svg',
    capabilities: ['onoff', 'dim', 'light_temperature', 'measure_power'],
    initialState: { onoff: true, dim: 0.72, light_temperature: 0.38, measure_power: 9.4 },
  },
  {
    id: 'bedroom-fan',
    name: 'Bedroom fan',
    zoneCandidates: ['Bedroom', 'Master Bedroom'],
    deviceClass: 'fan',
    icon: '/icons/fan.svg',
    capabilities: ['onoff', 'dim', 'measure_power'],
    initialState: { onoff: true, dim: 0.4, measure_power: 18.2 },
  },
  {
    id: 'kitchen-coffee-maker',
    name: 'Coffee maker',
    zoneCandidates: ['Kitchen'],
    deviceClass: 'socket',
    icon: '/icons/socket.svg',
    capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    initialState: {
      onoff: false,
      measure_power: 0,
      meter_power: 12.45,
      measure_voltage: 230.1,
      measure_current: 0,
    },
  },
  {
    id: 'living-room-climate',
    name: 'Living room climate',
    zoneCandidates: ['Living Room'],
    deviceClass: 'thermostat',
    icon: '/icons/thermostat.svg',
    capabilities: ['onoff', 'target_temperature', 'measure_temperature', 'measure_humidity'],
    capabilitiesOptions: {
      target_temperature: { min: 5, max: 35, step: 0.5 },
    },
    initialState: {
      onoff: true,
      target_temperature: 21.5,
      measure_temperature: 21.6,
      measure_humidity: 46,
    },
  },
  {
    id: 'hallway-multisensor',
    name: 'Hallway multisensor',
    zoneCandidates: ['Hallway', 'Entrance'],
    deviceClass: 'sensor',
    icon: '/icons/sensor.svg',
    capabilities: [
      'alarm_contact',
      'alarm_motion',
      'alarm_smoke',
      'alarm_water',
      'measure_temperature',
      'measure_humidity',
      'measure_co2',
      'measure_luminance',
      'measure_battery',
    ],
    initialState: {
      alarm_contact: false,
      alarm_motion: false,
      alarm_smoke: false,
      alarm_water: false,
      measure_temperature: 20.8,
      measure_humidity: 43,
      measure_co2: 590,
      measure_luminance: 120,
      measure_battery: 87,
    },
  },
  {
    id: 'front-door-lock',
    name: 'Front door lock',
    zoneCandidates: ['Hallway', 'Entrance'],
    deviceClass: 'lock',
    icon: '/icons/lock.svg',
    capabilities: ['locked', 'alarm_contact', 'measure_battery'],
    initialState: { locked: true, alarm_contact: false, measure_battery: 78 },
  },
  {
    id: 'bedroom-blind',
    name: 'Bedroom blind',
    zoneCandidates: ['Bedroom', 'Master Bedroom'],
    deviceClass: 'blinds',
    icon: '/icons/blinds.svg',
    capabilities: ['windowcoverings_set'],
    initialState: { windowcoverings_set: 0.35 },
  },
  {
    id: 'living-room-speaker',
    name: 'Living room speaker',
    zoneCandidates: ['Living Room'],
    deviceClass: 'speaker',
    icon: '/icons/speaker.svg',
    capabilities: ['speaker_playing', 'volume_set', 'volume_mute'],
    initialState: { speaker_playing: false, volume_set: 0.32, volume_mute: false },
  },
  {
    "id": "bedroom-window",
    "name": "Bedroom window",
    "zoneCandidates": [
      "Bedroom",
      "Master Bedroom"
    ],
    "deviceClass": "sensor",
    "icon": "/icons/sensor.svg",
    "capabilities": [
      "alarm_contact",
      "measure_battery"
    ],
    "initialState": {
      "alarm_contact": true,
      "measure_battery": 15
    }
  },
  {
    "id": "hallway-motion",
    "name": "Hallway motion sensor",
    "zoneCandidates": [
      "Hallway",
      "Entrance"
    ],
    "deviceClass": "sensor",
    "icon": "/icons/sensor.svg",
    "capabilities": [
      "alarm_motion",
      "measure_luminance",
      "measure_battery"
    ],
    "initialState": {
      "alarm_motion": true,
      "measure_luminance": 18,
      "measure_battery": 92
    }
  },
  {
    "id": "office-presence",
    "name": "Office presence sensor",
    "zoneCandidates": [
      "Office"
    ],
    "deviceClass": "sensor",
    "icon": "/icons/sensor.svg",
    "capabilities": [
      "alarm_presence",
      "measure_luminance"
    ],
    "initialState": {
      "alarm_presence": true,
      "measure_luminance": 240
    }
  },
  {
    "id": "hallway-smoke-co",
    "name": "Hallway smoke and CO alarm",
    "zoneCandidates": [
      "Hallway",
      "Entrance"
    ],
    "deviceClass": "smokealarm",
    "icon": "/icons/sensor.svg",
    "capabilities": [
      "alarm_smoke",
      "alarm_co",
      "alarm_battery",
      "measure_battery"
    ],
    "initialState": {
      "alarm_smoke": false,
      "alarm_co": false,
      "alarm_battery": true,
      "measure_battery": 12
    }
  },
  {
    "id": "office-air-quality",
    "name": "Office air quality",
    "zoneCandidates": [
      "Office"
    ],
    "deviceClass": "sensor",
    "icon": "/icons/sensor.svg",
    "capabilities": [
      "measure_co2",
      "measure_pm25",
      "measure_tvoc",
      "measure_temperature",
      "measure_humidity"
    ],
    "initialState": {
      "measure_co2": 1240,
      "measure_pm25": 28,
      "measure_tvoc": 350,
      "measure_temperature": 23.4,
      "measure_humidity": 39
    }
  },
  {
    "id": "bathroom-climate",
    "name": "Bathroom temperature and humidity",
    "zoneCandidates": [
      "Bathroom"
    ],
    "deviceClass": "sensor",
    "icon": "/icons/sensor.svg",
    "capabilities": [
      "measure_temperature",
      "measure_humidity",
      "measure_battery"
    ],
    "initialState": {
      "measure_temperature": 24.2,
      "measure_humidity": 78,
      "measure_battery": 65
    }
  },
  {
    "id": "bedroom-radiator",
    "name": "Bedroom radiator valve",
    "zoneCandidates": [
      "Bedroom",
      "Master Bedroom"
    ],
    "deviceClass": "thermostat",
    "icon": "/icons/thermostat.svg",
    "capabilities": [
      "target_temperature",
      "measure_temperature",
      "thermostat_mode",
      "measure_battery"
    ],
    "capabilitiesOptions": {
      "target_temperature": {
        "min": 5,
        "max": 30,
        "step": 0.5
      }
    },
    "initialState": {
      "target_temperature": 19.5,
      "measure_temperature": 18.8,
      "thermostat_mode": "heat",
      "measure_battery": 54
    }
  },
  {
    "id": "laundry-washer",
    "name": "Washing machine plug",
    "zoneCandidates": [
      "Laundry",
      "Utility Room"
    ],
    "deviceClass": "socket",
    "icon": "/icons/socket.svg",
    "capabilities": [
      "onoff",
      "measure_power",
      "meter_power",
      "measure_current",
      "measure_voltage"
    ],
    "initialState": {
      "onoff": true,
      "measure_power": 485,
      "meter_power": 38.72,
      "measure_current": 2.11,
      "measure_voltage": 230
    }
  },
  {
    "id": "kitchen-freezer",
    "name": "Freezer temperature alarm",
    "zoneCandidates": [
      "Kitchen"
    ],
    "deviceClass": "sensor",
    "icon": "/icons/sensor.svg",
    "capabilities": [
      "measure_temperature",
      "alarm_heat",
      "alarm_contact",
      "measure_battery"
    ],
    "initialState": {
      "measure_temperature": -8.5,
      "alarm_heat": true,
      "alarm_contact": false,
      "measure_battery": 73
    }
  },
  {
    "id": "garden-plant",
    "name": "Garden soil sensor",
    "zoneCandidates": [
      "Garden"
    ],
    "deviceClass": "sensor",
    "icon": "/icons/sensor.svg",
    "capabilities": [
      "measure_moisture",
      "measure_temperature",
      "measure_battery"
    ],
    "initialState": {
      "measure_moisture": 18,
      "measure_temperature": 17.6,
      "measure_battery": 81
    }
  },
  {
    "id": "garden-irrigation",
    "name": "Garden irrigation valve",
    "zoneCandidates": [
      "Garden"
    ],
    "deviceClass": "sprinkler",
    "icon": "/icons/socket.svg",
    "capabilities": [
      "onoff"
    ],
    "initialState": {
      "onoff": false
    }
  },
  {
    "id": "utility-water-valve",
    "name": "Main water shutoff valve",
    "zoneCandidates": [
      "Laundry",
      "Utility Room"
    ],
    "deviceClass": "watervalve",
    "icon": "/icons/socket.svg",
    "capabilities": [
      "onoff"
    ],
    "initialState": {
      "onoff": true
    }
  },
  {
    "id": "utility-meters",
    "name": "Household utility meters",
    "zoneCandidates": [
      "Laundry",
      "Utility Room"
    ],
    "deviceClass": "sensor",
    "icon": "/icons/sensor.svg",
    "capabilities": [
      "measure_power",
      "meter_power",
      "meter_water",
      "measure_water",
      "meter_gas"
    ],
    "initialState": {
      "measure_power": 1260,
      "meter_power": 824.35,
      "meter_water": 42.875,
      "measure_water": 4.2,
      "meter_gas": 168.43
    }
  },
  {
    "id": "garden-weather",
    "name": "Garden weather station",
    "zoneCandidates": [
      "Garden"
    ],
    "deviceClass": "sensor",
    "icon": "/icons/sensor.svg",
    "capabilities": [
      "measure_temperature",
      "measure_humidity",
      "measure_pressure",
      "measure_wind_strength",
      "measure_rain",
      "measure_luminance"
    ],
    "initialState": {
      "measure_temperature": 16.8,
      "measure_humidity": 68,
      "measure_pressure": 1012,
      "measure_wind_strength": 4.2,
      "measure_rain": 0.4,
      "measure_luminance": 18000
    }
  },
  {
    "id": "living-room-curtains",
    "name": "Living room curtains",
    "zoneCandidates": [
      "Living Room"
    ],
    "deviceClass": "blinds",
    "icon": "/icons/blinds.svg",
    "capabilities": [
      "windowcoverings_state",
      "windowcoverings_set",
      "windowcoverings_closed"
    ],
    "initialState": {
      "windowcoverings_state": "idle",
      "windowcoverings_set": 0.65,
      "windowcoverings_closed": false
    }
  },
  {
    "id": "kitchen-speaker",
    "name": "Kitchen speaker",
    "zoneCandidates": [
      "Kitchen"
    ],
    "deviceClass": "speaker",
    "icon": "/icons/speaker.svg",
    "capabilities": [
      "speaker_playing",
      "volume_set",
      "volume_mute",
      "speaker_track",
      "speaker_artist",
      "speaker_album",
      "speaker_shuffle",
      "speaker_next",
      "speaker_prev"
    ],
    "initialState": {
      "speaker_playing": true,
      "volume_set": 0.24,
      "volume_mute": false,
      "speaker_track": "Morning light",
      "speaker_artist": "Navet Lab",
      "speaker_album": "Demo radio",
      "speaker_shuffle": false
    }
  },
];
