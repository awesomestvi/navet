import { getHVACModeButtonColor } from '../../utils/hvac-styles';

export function getHVACSettingsDialogStyles(mode: string, isOn: boolean) {
  const modeSurface = getModeSurface(mode, isOn);
  const activePresetClassName = getActivePresetClassName(mode, isOn);

  return {
    contentClassName: `bg-gradient-to-br from-${modeSurface.from}/95 to-${modeSurface.to}/95 border-${modeSurface.border}`,
    sectionLabelClassName: 'text-gray-300',
    currentValueClassName: 'text-gray-300',
    modeButtonClassName: (buttonMode: string) => {
      const shadowClass = getModeButtonShadow(buttonMode, mode, isOn);
      return `${getHVACModeButtonColor(buttonMode, mode, isOn)} ${shadowClass}`.trim();
    },
    modeIconWrapClassName: (buttonMode: string) =>
      mode === buttonMode && isOn ? 'bg-white/20' : 'bg-white/10',
    presetButtonClassName:
      'border-white/10 bg-white/6 text-white hover:bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
    presetButtonActiveClassName: activePresetClassName,
  };
}

function getActivePresetClassName(mode: string, isOn: boolean) {
  if (!isOn) {
    return 'border-white/10 bg-white/10 text-white';
  }

  switch (mode) {
    case 'cool':
      return 'border-blue-400/40 bg-blue-500/18 text-white';
    case 'heat':
      return 'border-red-400/40 bg-red-500/18 text-white';
    case 'fan':
      return 'border-green-400/40 bg-green-500/18 text-white';
    default:
      return 'border-white/10 bg-white/10 text-white';
  }
}

function getModeSurface(mode: string, isOn: boolean) {
  if (!isOn) {
    return { from: 'gray-900', to: 'gray-950', border: 'gray-500/10' };
  }

  switch (mode) {
    case 'cool':
      return { from: 'blue-900', to: 'blue-950', border: 'blue-500/20' };
    case 'heat':
      return { from: 'red-900', to: 'red-950', border: 'red-500/20' };
    case 'fan':
      return { from: 'green-900', to: 'green-950', border: 'green-500/20' };
    default:
      return { from: 'gray-900', to: 'gray-950', border: 'gray-500/10' };
  }
}

function getModeButtonShadow(buttonMode: string, currentMode: string, isOn: boolean) {
  if (currentMode !== buttonMode || !isOn) {
    return '';
  }

  switch (buttonMode) {
    case 'cool':
      return 'shadow-lg shadow-blue-500/30';
    case 'heat':
      return 'shadow-lg shadow-red-500/30';
    case 'fan':
      return 'shadow-lg shadow-green-500/30';
    default:
      return '';
  }
}
