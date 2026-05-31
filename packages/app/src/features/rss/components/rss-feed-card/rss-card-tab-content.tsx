import { CustomCardTintPicker } from '@navet/app/components/shared/device-editor';
import type { RSSFeedCardSurfaceTokens } from './surface-tokens';

interface RSSCardTabContentProps {
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
  defaultColor?: string;
  surface: RSSFeedCardSurfaceTokens;
}

export function RSSCardTabContent({
  tintColor,
  onTintColorChange,
  defaultColor = '#06b6d4',
  surface,
}: RSSCardTabContentProps) {
  if (!onTintColorChange) {
    return null;
  }

  return (
    <CustomCardTintPicker
      value={tintColor}
      onChange={onTintColorChange}
      defaultColor={defaultColor}
      className={surface.surface.textMuted}
    />
  );
}
