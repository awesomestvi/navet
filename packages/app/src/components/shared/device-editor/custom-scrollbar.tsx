import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { useTheme } from '@navet/app/hooks';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { memo, type ReactNode } from 'react';

interface CustomScrollbarProps {
  children: ReactNode;
  isOn?: boolean;
  className?: string;
}

export const CustomScrollbar = memo(function CustomScrollbar({
  children,
  isOn = false,
  className = '',
}: CustomScrollbarProps) {
  const { primaryColor } = useTheme();
  const accentColor = getThemeColorValue(primaryColor);

  return (
    <ScrollArea.Root className={`h-full overflow-hidden ${className}`}>
      <ScrollArea.Viewport className="w-full h-full">{children}</ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="hidden" orientation="vertical">
        <ScrollArea.Thumb
          className="relative flex-1 rounded-full transition-colors duration-500"
          style={{
            backgroundColor: isOn ? `${accentColor}66` : 'rgba(107, 114, 128, 0.4)',
          }}
        />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
});
