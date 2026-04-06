import {
  type ButtonHTMLAttributes,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useId,
  useMemo,
  useState,
} from 'react';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { getThemeFocusRingClassName, navetTypographyTokens } from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs primitives must be used within <Tabs>.');
  }

  return context;
}

export interface TabsProps {
  value?: string;
  defaultValue: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

// Status: in-progress. Shared tabs primitive for small view switches and section tabs.
// TODO: Revisit whether vertical tabs are ever needed before adding orientation props.
export function Tabs({ value, defaultValue, onValueChange, children }: TabsProps) {
  const baseId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const currentValue = value ?? uncontrolledValue;

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      value: currentValue,
      setValue: (nextValue) => {
        if (value === undefined) {
          setUncontrolledValue(nextValue);
        }
        onValueChange?.(nextValue);
      },
      baseId,
    }),
    [baseId, currentValue, onValueChange, value]
  );

  return <TabsContext.Provider value={contextValue}>{children}</TabsContext.Provider>;
}

export interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'compact' | 'segmented';
  size?: 'default' | 'compact';
}

export type TabListVariant = NonNullable<TabListProps['variant']>;
export type TabListSize = NonNullable<TabListProps['size']>;

export const TabList = forwardRef<HTMLDivElement, TabListProps>(function TabList(
  { className, children, variant = 'default', size = 'default', ...props },
  ref
) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const compactShellClassName =
    variant === 'segmented'
      ? size === 'compact'
        ? 'grid min-w-0 items-stretch gap-2 rounded-[22px] border p-1.5'
        : 'grid min-w-0 items-stretch gap-2 rounded-[24px] border p-2.5'
      : size === 'compact'
        ? 'flex min-w-0 items-center gap-2 overflow-x-auto border rounded-[22px] p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible'
        : 'flex min-w-0 items-center gap-2 overflow-x-auto border rounded-[24px] p-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible';

  return (
    <div
      {...props}
      ref={ref}
      role="tablist"
      className={cn(
        variant === 'default'
          ? 'flex min-w-0 items-center gap-2 overflow-x-auto border px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible md:px-4 md:py-3 rounded-[24px] md:rounded-[28px]'
          : compactShellClassName,
        surface.borderStrong,
        surface.panel,
        className
      )}
    >
      {children}
    </div>
  );
});

export interface TabTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
  children: ReactNode;
  size?: 'default' | 'compact';
}

export type TabTriggerSize = NonNullable<TabTriggerProps['size']>;

export const TabTrigger = forwardRef<HTMLButtonElement, TabTriggerProps>(function TabTrigger(
  { value, className, children, onClick, size = 'default', ...props },
  ref
) {
  const { theme, accentColor, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const { value: currentValue, setValue, baseId } = useTabsContext();
  const isActive = currentValue === value;
  const triggerId = `${baseId}-${value}-tab`;
  const panelId = `${baseId}-${value}-panel`;
  const resolvedAccentColor = accentColor || getThemeColorValue(primaryColor);

  const inactiveClassName =
    theme === 'light'
      ? 'border-transparent text-gray-700 hover:bg-gray-200'
      : theme === 'black'
        ? 'border-transparent text-gray-300 hover:bg-black'
        : theme === 'glass'
          ? 'border-transparent text-white/82 hover:bg-white/16'
          : `${surface.textSecondary} border-transparent hover:bg-white/10`;

  return (
    <button
      {...props}
      ref={ref}
      id={triggerId}
      type={props.type ?? 'button'}
      role="tab"
      aria-selected={isActive}
      aria-controls={panelId}
      data-state={isActive ? 'active' : 'inactive'}
      tabIndex={isActive ? 0 : -1}
      onClick={(event) => {
        setValue(value);
        onClick?.(event);
      }}
      className={cn(
        size === 'compact'
          ? 'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-sm font-medium transition-[background-color,border-color,box-shadow,color] md:px-3.5'
          : 'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,box-shadow,color] md:px-4',
        navetTypographyTokens.control,
        getThemeFocusRingClassName(theme),
        isActive ? surface.textPrimary : inactiveClassName,
        className
      )}
      style={
        isActive
          ? {
              borderColor: `${resolvedAccentColor}55`,
              backgroundColor: `${resolvedAccentColor}12`,
              boxShadow: `inset 0 0 0 1px ${resolvedAccentColor}22`,
            }
          : undefined
      }
    >
      {children}
    </button>
  );
});

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  children: ReactNode;
}

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(function TabPanel(
  { value, className, children, ...props },
  ref
) {
  const { value: currentValue, baseId } = useTabsContext();
  const isActive = currentValue === value;
  const triggerId = `${baseId}-${value}-tab`;
  const panelId = `${baseId}-${value}-panel`;

  return (
    <div
      {...props}
      ref={ref}
      id={panelId}
      role="tabpanel"
      aria-labelledby={triggerId}
      hidden={!isActive}
      className={cn(isActive ? 'block' : 'hidden', className)}
    >
      {children}
    </div>
  );
});
