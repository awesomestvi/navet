import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  createContext,
  type ForwardedRef,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
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
const TAB_LIST_SCROLLBAR_INSET = 12;

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
  size?: 'default' | 'small' | 'compact';
}

export type TabListVariant = NonNullable<TabListProps['variant']>;
export type TabListSize = NonNullable<TabListProps['size']>;

interface TabListScrollbarStyle extends CSSProperties {
  '--tab-list-scrollbar-left': string;
  '--tab-list-scrollbar-width': string;
}

function assignForwardedRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

export const TabList = forwardRef<HTMLDivElement, TabListProps>(function TabList(
  { className, children, onScroll, style, variant = 'default', size = 'default', ...props },
  ref
) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const isSmall = size === 'small';
  const isCompact = size === 'compact';
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const [hasScrollbarOverflow, setHasScrollbarOverflow] = useState(false);
  const [scrollbarStyle, setScrollbarStyle] = useState<TabListScrollbarStyle>({
    '--tab-list-scrollbar-left': '0px',
    '--tab-list-scrollbar-width': '0px',
  });
  const compactShellClassName =
    variant === 'segmented'
      ? isSmall
        ? 'grid min-w-0 items-stretch gap-2 rounded-[22px] border p-1.5'
        : isCompact
          ? 'grid min-w-0 items-stretch gap-0.75 rounded-[18px] border p-0.75'
          : 'grid min-w-0 items-stretch gap-2 rounded-[24px] border p-2.5'
      : isSmall
        ? 'flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide border rounded-[22px] p-2 md:flex-wrap md:overflow-visible'
        : isCompact
          ? 'flex min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-hide border rounded-[18px] p-1 md:flex-wrap md:overflow-visible'
          : 'flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide border rounded-[24px] p-2.5 md:flex-wrap md:overflow-visible';
  const updateScrollbarMetrics = useCallback(() => {
    const tabList = tabListRef.current;

    if (!tabList) {
      return;
    }

    const { clientWidth, scrollLeft, scrollWidth } = tabList;
    const maxScrollLeft = scrollWidth - clientWidth;

    if (maxScrollLeft <= 1) {
      setHasScrollbarOverflow(false);
      setScrollbarStyle({
        '--tab-list-scrollbar-left': '0px',
        '--tab-list-scrollbar-width': '0px',
      });
      return;
    }

    const trackWidth = Math.max(0, clientWidth - TAB_LIST_SCROLLBAR_INSET * 2);
    const thumbWidth = Math.max(32, (clientWidth / scrollWidth) * trackWidth);
    const maxThumbLeft = trackWidth - thumbWidth;
    const thumbLeft = TAB_LIST_SCROLLBAR_INSET + (scrollLeft / maxScrollLeft) * maxThumbLeft;

    setHasScrollbarOverflow(true);
    setScrollbarStyle({
      '--tab-list-scrollbar-left': `${thumbLeft}px`,
      '--tab-list-scrollbar-width': `${thumbWidth}px`,
    });
  }, []);
  const setTabListRef = useCallback(
    (node: HTMLDivElement | null) => {
      tabListRef.current = node;
      assignForwardedRef(ref, node);
      updateScrollbarMetrics();
    },
    [ref, updateScrollbarMetrics]
  );

  useEffect(() => {
    updateScrollbarMetrics();
  }, [updateScrollbarMetrics]);

  useEffect(() => {
    const tabList = tabListRef.current;

    if (!tabList || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(updateScrollbarMetrics);
    observer.observe(tabList);

    return () => observer.disconnect();
  }, [updateScrollbarMetrics]);

  return (
    <div
      {...props}
      ref={setTabListRef}
      role="tablist"
      data-scrollbar-overflow={hasScrollbarOverflow ? 'true' : undefined}
      onScroll={(event) => {
        updateScrollbarMetrics();
        onScroll?.(event);
      }}
      className={cn(
        variant === 'default'
          ? isCompact
            ? 'tab-list-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-hide border rounded-[18px] px-1.5 py-1 md:flex-wrap md:overflow-visible md:rounded-[20px] md:px-2 md:py-1.5'
            : isSmall
              ? 'tab-list-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-hide border px-2 py-1.5 md:flex-wrap md:overflow-visible md:px-2.5 md:py-2 rounded-[22px] md:rounded-[24px]'
              : 'tab-list-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide border px-3 py-2.5 md:flex-wrap md:overflow-visible md:px-4 md:py-3 rounded-[24px] md:rounded-[28px]'
          : variant === 'segmented'
            ? compactShellClassName
            : `tab-list-scrollbar ${compactShellClassName}`,
        surface.borderStrong,
        surface.panel,
        className
      )}
      style={{ ...scrollbarStyle, ...style }}
    >
      {children}
    </div>
  );
});

export interface TabTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
  children: ReactNode;
  size?: 'default' | 'small' | 'compact';
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
  const triggerSizeClassName =
    size === 'small'
      ? 'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-sm font-medium transition-[background-color,border-color,box-shadow,color] md:px-3.5'
      : size === 'compact'
        ? 'inline-flex min-h-8 shrink-0 items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,box-shadow,color] md:min-h-8 md:px-4'
        : 'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,box-shadow,color] md:px-4';

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
        triggerSizeClassName,
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
