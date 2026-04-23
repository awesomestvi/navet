export type HVACMode = 'cool' | 'heat' | 'fan';

export const getHVACBackgroundColor = (mode: HVACMode | string, isOn: boolean): string => {
  if (!isOn) return 'from-gray-900/40 to-gray-950/40';
  switch (mode) {
    case 'cool':
      return 'from-blue-900/40 to-blue-950/40';
    case 'heat':
      return 'from-orange-900/40 to-orange-950/40';
    case 'fan':
      return 'from-green-900/40 to-green-950/40';
    default:
      return 'from-gray-900/40 to-gray-950/40';
  }
};

export const getHVACBorderColor = (mode: HVACMode | string, isOn: boolean): string => {
  if (!isOn) return 'border-gray-700/20';
  switch (mode) {
    case 'cool':
      return 'border-blue-700/20';
    case 'heat':
      return 'border-orange-700/20';
    case 'fan':
      return 'border-green-700/20';
    default:
      return 'border-gray-700/20';
  }
};

export const getHVACIconColor = (mode: HVACMode | string, isOn: boolean): string => {
  if (!isOn) return 'text-gray-300';
  switch (mode) {
    case 'cool':
      return 'text-blue-400';
    case 'heat':
      return 'text-orange-400';
    case 'fan':
      return 'text-green-400';
    default:
      return 'text-gray-300';
  }
};

export const getHVACIconBgColor = (mode: HVACMode | string, isOn: boolean): string => {
  if (!isOn) return 'bg-gray-500/20';
  switch (mode) {
    case 'cool':
      return 'bg-blue-500/20';
    case 'heat':
      return 'bg-orange-500/20';
    case 'fan':
      return 'bg-green-500/20';
    default:
      return 'bg-gray-500/20';
  }
};

export const getHVACModeButtonColor = (
  buttonMode: string,
  currentMode: string,
  isOn: boolean,
  theme?: string
): string => {
  if (currentMode === buttonMode && isOn) {
    switch (buttonMode) {
      case 'cool':
        return '!border-0 shadow-none bg-gradient-to-br from-blue-400 to-blue-600 text-white';
      case 'heat':
        return '!border-0 shadow-none bg-gradient-to-br from-orange-400 to-orange-600 text-white';
      case 'fan':
        return '!border-0 shadow-none bg-gradient-to-br from-green-400 to-green-600 text-white';
      default:
        return theme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-white/10 text-gray-200';
    }
  }
  return theme === 'light'
    ? 'bg-gray-900/10 text-gray-700 hover:bg-gray-900/20'
    : 'bg-white/10 text-gray-200 hover:bg-white/20';
};

export const getHVACGaugeColor = (
  mode: HVACMode | string
): { primary: string; secondary: string } => {
  switch (mode) {
    case 'cool':
      return { primary: '#3b82f6', secondary: '#60a5fa' };
    case 'heat':
      return { primary: '#f97316', secondary: '#fb923c' };
    case 'fan':
      return { primary: '#22c55e', secondary: '#4ade80' };
    default:
      return { primary: '#6b7280', secondary: '#9ca3af' };
  }
};

export const getHVACGlowColor = (mode: HVACMode | string): string => {
  switch (mode) {
    case 'cool':
      return '#60a5fa';
    case 'heat':
      return '#fb923c';
    case 'fan':
      return '#4ade80';
    default:
      return '#9ca3af';
  }
};

export const getHVACTextShadow = (mode: HVACMode | string): string => {
  switch (mode) {
    case 'cool':
      return 'rgba(96, 165, 250, 0.5)';
    case 'heat':
      return 'rgba(251, 146, 60, 0.5)';
    case 'fan':
      return 'rgba(74, 222, 128, 0.5)';
    default:
      return 'rgba(156, 163, 175, 0.5)';
  }
};

export const getHVACBackgroundGlowColor = (mode: HVACMode | string): string => {
  switch (mode) {
    case 'cool':
      return 'bg-blue-400';
    case 'heat':
      return 'bg-orange-400';
    case 'fan':
      return 'bg-green-400';
    default:
      return 'bg-gray-400';
  }
};
