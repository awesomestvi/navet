export function getDeviceEditorSurfaceTokens(isOn: boolean) {
  return {
    sectionLabelClassName: isOn ? 'text-gray-200' : 'text-gray-600',
    sectionValueClassName: isOn ? 'text-white' : 'text-gray-700',
    titleClassName: isOn ? 'text-white' : 'text-gray-800',
    descriptionClassName: isOn ? 'text-gray-200' : 'text-gray-600',
    closeButtonClassName: isOn ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 hover:bg-white/10',
    closeIconClassName: isOn ? 'text-gray-200' : 'text-gray-700',
    settingPanelClassName: 'border-white/10 bg-white/5',
    settingLabelClassName: isOn ? 'text-gray-100' : 'text-gray-700',
    settingDescriptionClassName: isOn ? 'text-gray-200' : 'text-gray-600',
    dragHandleClassName: isOn
      ? 'text-white/72 hover:text-white/92 cursor-grab active:cursor-grabbing'
      : 'text-gray-600 cursor-grab active:cursor-grabbing',
    iconChipClassName: 'bg-white/10',
    iconClassName: 'text-white',
    inputClassName: isOn
      ? 'border-white/15 bg-white/10 text-white'
      : 'border-white/10 bg-white/5 text-gray-300',
    suffixClassName: isOn ? 'text-gray-200' : 'text-gray-600',
    disabledCircleClassName: 'cursor-not-allowed opacity-50',
    disabledSurfaceColor: '#4a4a4a',
  };
}
