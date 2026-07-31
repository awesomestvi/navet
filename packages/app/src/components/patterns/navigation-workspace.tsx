import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getThemeFocusRingClassName } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import {
  type ComponentPropsWithRef,
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
} from 'react';

interface NavigationWorkspaceContextValue {
  border: string;
  borderStrong: string;
  hoverBg: string;
  iconBg: string;
  panelMuted: string;
  subtleBg: string;
  textMuted: string;
  textPrimary: string;
}

const NavigationWorkspaceContext = createContext<NavigationWorkspaceContextValue | null>(null);

function useNavigationWorkspace() {
  const value = useContext(NavigationWorkspaceContext);
  if (!value) {
    throw new Error('NavigationWorkspace components must be used inside NavigationWorkspace.Frame');
  }
  return value;
}

export function NavigationWorkspaceFrame({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <NavigationWorkspaceContext.Provider
      value={{
        border: surface.border,
        borderStrong: surface.borderStrong,
        hoverBg: surface.hoverBg,
        iconBg: surface.iconBg,
        panelMuted: surface.panelMuted,
        subtleBg: surface.subtleBg,
        textMuted: surface.textMuted,
        textPrimary: surface.textPrimary,
      }}
    >
      <section
        className={cn(
          'flex min-h-0 w-full flex-col overflow-hidden rounded-[28px] border',
          surface.shellPanel,
          surface.border,
          surface.cardShadow,
          className
        )}
        {...props}
      >
        {children}
      </section>
    </NavigationWorkspaceContext.Provider>
  );
}

export function NavigationWorkspaceItem({
  active,
  accentColor,
  children,
  className,
  style,
  ...props
}: ComponentPropsWithRef<'div'> & { active: boolean; accentColor: string }) {
  const { borderStrong, hoverBg } = useNavigationWorkspace();

  return (
    <div
      className={cn(
        'relative flex min-w-0 items-center rounded-[22px] border transition-[background-color,border-color] motion-reduce:transition-none',
        active ? borderStrong : 'border-transparent',
        !active && hoverBg,
        className
      )}
      style={{
        ...(active ? { backgroundColor: `${accentColor}14` } : undefined),
        ...style,
      }}
      {...props}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <span
            className="absolute inset-y-2.5 -left-0.5 w-1 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        </span>
      ) : null}
      {children}
    </div>
  );
}

export function NavigationWorkspaceItemButton({
  className,
  ...props
}: ComponentPropsWithRef<'button'>) {
  const { theme } = useTheme();

  return (
    <button
      type="button"
      className={cn(
        'flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-[22px] px-2.5 py-1 text-left',
        getThemeFocusRingClassName(theme),
        className
      )}
      {...props}
    />
  );
}

export function NavigationWorkspaceItemIcon({
  className,
  ...props
}: ComponentPropsWithRef<'span'>) {
  const { borderStrong, iconBg, textPrimary } = useNavigationWorkspace();

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] border text-sm font-semibold',
        borderStrong,
        iconBg,
        textPrimary,
        className
      )}
      {...props}
    />
  );
}

export function NavigationWorkspaceItemText({
  className,
  description,
  title,
  ...props
}: Omit<ComponentPropsWithRef<'span'>, 'title'> & { description?: ReactNode; title: ReactNode }) {
  const { textMuted, textPrimary } = useNavigationWorkspace();

  return (
    <span className={cn('min-w-0 flex-1', className)} {...props}>
      <span className={cn('block truncate text-sm font-semibold', textPrimary)}>{title}</span>
      {description ? (
        <span className={cn('mt-0.5 block truncate text-xs', textMuted)}>{description}</span>
      ) : null}
    </span>
  );
}

export function NavigationWorkspaceGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { borderStrong, subtleBg } = useNavigationWorkspace();

  return (
    <div
      className={cn(
        'grid gap-0 overflow-hidden rounded-[22px] border',
        borderStrong,
        subtleBg,
        className
      )}
      data-navigation-workspace-group
      {...props}
    />
  );
}

export function NavigationWorkspaceSeparator({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const { border } = useNavigationWorkspace();

  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn('mr-2.5 ml-[3.25rem] border-t', border, className)}
      data-navigation-workspace-separator
    />
  );
}

export function NavigationWorkspaceHeader({ className, ...props }: HTMLAttributes<HTMLElement>) {
  const { border } = useNavigationWorkspace();
  return <header className={cn('border-b', border, className)} {...props} />;
}

export function NavigationWorkspaceBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid min-h-0 flex-1', className)} {...props} />;
}

export function NavigationWorkspaceSidebar({ className, ...props }: HTMLAttributes<HTMLElement>) {
  const { border, panelMuted } = useNavigationWorkspace();
  return (
    <aside
      className={cn('min-h-0 overflow-hidden border-r', border, panelMuted, className)}
      {...props}
    />
  );
}

export function NavigationWorkspaceContent({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <main className={cn('min-h-0 min-w-0 overflow-hidden', className)} {...props}>
      {children}
    </main>
  );
}

export const NavigationWorkspace = {
  Frame: NavigationWorkspaceFrame,
  Group: NavigationWorkspaceGroup,
  Header: NavigationWorkspaceHeader,
  Item: NavigationWorkspaceItem,
  ItemButton: NavigationWorkspaceItemButton,
  ItemIcon: NavigationWorkspaceItemIcon,
  ItemText: NavigationWorkspaceItemText,
  Separator: NavigationWorkspaceSeparator,
  Body: NavigationWorkspaceBody,
  Sidebar: NavigationWorkspaceSidebar,
  Content: NavigationWorkspaceContent,
};
