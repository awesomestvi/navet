export interface ClimateModeControlOption {
  key: 'cool' | 'heat' | 'fan' | 'auto';
  mode: string;
}

export function resolveClimateModeControlOptions(
  supportedClimateModes?: string[]
): ClimateModeControlOption[] {
  if (!supportedClimateModes) {
    return [];
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
