export interface ClimateModeControlOption {
  key: 'cool' | 'heat' | 'fan' | 'auto';
  mode: string;
}

const DEFAULT_Climate_MODE_CONTROLS: ClimateModeControlOption[] = [
  { key: 'cool', mode: 'cool' },
  { key: 'heat', mode: 'heat' },
  { key: 'fan', mode: 'fan' },
];

export function resolveClimateModeControlOptions(
  supportedClimateModes?: string[]
): ClimateModeControlOption[] {
  if (!supportedClimateModes) {
    return DEFAULT_Climate_MODE_CONTROLS;
  }

  const supportedModes = new Set(supportedClimateModes.map((mode) => mode.toLowerCase()));
  const options: ClimateModeControlOption[] = [];

  if (supportedModes.has('cool')) {
    options.push({ key: 'cool', mode: 'cool' });
  }

  if (supportedModes.has('heat')) {
    options.push({ key: 'heat', mode: 'heat' });
  }

  if (supportedModes.has('heat_cool')) {
    options.push({ key: 'auto', mode: 'heat_cool' });
  } else if (supportedModes.has('auto')) {
    options.push({ key: 'auto', mode: 'auto' });
  }

  if (supportedModes.has('fan_only') || supportedModes.has('fan')) {
    options.push({
      key: 'fan',
      mode: supportedModes.has('fan_only') ? 'fan_only' : 'fan',
    });
  }

  return options;
}
