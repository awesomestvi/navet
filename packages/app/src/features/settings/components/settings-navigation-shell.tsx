import { NavigationWorkspace } from '@navet/app/components/patterns';
import { Input } from '@navet/app/components/primitives/input';
import { navetIconSizeTokens, navetTypographyTokens } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { ArrowLeft, ChevronRight, type LucideIcon, Search } from 'lucide-react';
import { Fragment, type ReactNode, type Ref, useMemo, useState } from 'react';
import type { SettingsSectionStyles } from '../hooks/settings-section-styles';

export interface SettingsNavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface SettingsNavigationGroup {
  id: string;
  label?: string;
  items: SettingsNavigationItem[];
}

export interface SettingsSearchItem {
  description: string;
  id: string;
  label: string;
  sectionId: string;
  sectionLabel: string;
  targetLabel?: string;
}

interface SettingsNavigationShellProps {
  activeId: string;
  children: ReactNode;
  emptySearchLabel: string;
  groups: SettingsNavigationGroup[];
  isMobile: boolean;
  mobileDetailOpen: boolean;
  onBack: () => void;
  onSearchSelect: (item: SettingsSearchItem) => void;
  onSelect: (id: string) => void;
  rootRef?: Ref<HTMLDivElement>;
  searchLabel: string;
  searchItems: SettingsSearchItem[];
  styles: SettingsSectionStyles;
  title: string;
}

function SettingsSearchResults({
  emptyLabel,
  groups,
  items,
  onSelect,
  styles,
}: {
  emptyLabel: string;
  groups: SettingsNavigationGroup[];
  items: SettingsSearchItem[];
  onSelect: (item: SettingsSearchItem) => void;
  styles: SettingsSectionStyles;
}) {
  const itemBySection = new Map(
    groups.flatMap((group) => group.items).map((item) => [item.id, item])
  );

  if (items.length === 0) {
    return (
      <p role="status" className={cn('px-3 py-6 text-center', styles.subtleColor)}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="grid gap-1" aria-live="polite">
      {items.map((item) => {
        const section = itemBySection.get(item.sectionId);
        const Icon = section?.icon;

        return (
          <button
            key={item.id}
            type="button"
            aria-label={`${item.label}, ${item.sectionLabel}`}
            onClick={() => onSelect(item)}
            className={cn(
              'flex min-h-12 w-full items-center gap-3 rounded-[20px] px-2.5 py-2 text-left',
              'transition-colors motion-reduce:transition-none',
              styles.hoverBg,
              styles.ringClass,
              styles.ringOffsetClass,
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
            )}
          >
            {Icon ? (
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border',
                  styles.iconBg,
                  styles.borderColor,
                  styles.mutedColor
                )}
              >
                <Icon className={navetIconSizeTokens.sm} />
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span
                className={cn('block truncate', navetTypographyTokens.control, styles.textColor)}
              >
                {item.label}
              </span>
              <span className={cn('mt-0.5 block truncate text-xs', styles.subtleColor)}>
                {item.sectionLabel}
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              className={cn('shrink-0', navetIconSizeTokens.sm, styles.subtleColor)}
            />
          </button>
        );
      })}
    </div>
  );
}

function SettingsSearch({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Input
      type="search"
      size="small"
      name="settings-search"
      autoComplete="off"
      spellCheck={false}
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      leading={<Search aria-hidden="true" className={navetIconSizeTokens.sm} />}
      containerClassName="min-w-0"
      inputClassName="[&::-webkit-search-cancel-button]:appearance-none motion-reduce:transition-none"
    />
  );
}

function SettingsNavigationGroups({
  activeId,
  groups,
  mobile,
  onSelect,
  styles,
}: {
  activeId: string;
  groups: SettingsNavigationGroup[];
  mobile: boolean;
  onSelect: (id: string) => void;
  styles: SettingsSectionStyles;
}) {
  return (
    <div className="grid gap-5">
      {groups.map((group) => {
        const items = group.items.map((item, index) => {
          const isActive = item.id === activeId;
          const Icon = item.icon;

          return (
            <Fragment key={item.id}>
              {mobile && index > 0 ? (
                <NavigationWorkspace.Separator className={styles.borderColor} />
              ) : null}
              <NavigationWorkspace.Item
                active={!mobile && isActive}
                accentColor={styles.accentColor}
              >
                <NavigationWorkspace.ItemButton
                  aria-current={!mobile && isActive ? 'page' : undefined}
                  onClick={() => onSelect(item.id)}
                >
                  <NavigationWorkspace.ItemIcon>
                    <Icon className={navetIconSizeTokens.sm} />
                  </NavigationWorkspace.ItemIcon>
                  <NavigationWorkspace.ItemText title={item.label} />
                  {mobile ? (
                    <ChevronRight
                      aria-hidden="true"
                      className={cn('shrink-0', navetIconSizeTokens.sm, styles.subtleColor)}
                    />
                  ) : null}
                </NavigationWorkspace.ItemButton>
              </NavigationWorkspace.Item>
            </Fragment>
          );
        });

        return (
          <section
            key={group.id}
            aria-labelledby={group.label ? `settings-group-${group.id}` : undefined}
          >
            {group.label ? (
              <h2
                id={`settings-group-${group.id}`}
                className={cn(
                  'mb-2 px-2',
                  navetTypographyTokens.caption,
                  'font-semibold',
                  styles.subtleColor
                )}
              >
                {group.label}
              </h2>
            ) : null}

            {mobile ? (
              <NavigationWorkspace.Group className={cn(styles.insetBorderColor, styles.insetBg)}>
                {items}
              </NavigationWorkspace.Group>
            ) : (
              <div className="grid gap-1">{items}</div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function SettingsNavigationShell({
  activeId,
  children,
  emptySearchLabel,
  groups,
  isMobile,
  mobileDetailOpen,
  onBack,
  onSearchSelect,
  onSelect,
  rootRef,
  searchLabel,
  searchItems,
  styles,
  title,
}: SettingsNavigationShellProps) {
  const [query, setQuery] = useState('');
  const searchResults = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return searchItems
      .filter((item) =>
        [item.label, item.description, item.sectionLabel]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery)
      )
      .sort((left, right) => {
        const leftLabel = left.label.toLocaleLowerCase();
        const rightLabel = right.label.toLocaleLowerCase();
        const leftStarts = leftLabel.startsWith(normalizedQuery);
        const rightStarts = rightLabel.startsWith(normalizedQuery);
        return Number(rightStarts) - Number(leftStarts);
      })
      .slice(0, 12);
  }, [query, searchItems]);
  const searchActive = query.trim().length > 0;
  const activeItem = groups.flatMap((group) => group.items).find((item) => item.id === activeId);

  if (isMobile) {
    return (
      <div ref={rootRef} className="min-w-0 overflow-hidden">
        <NavigationWorkspace.Frame className="mx-auto max-w-6xl" data-settings-workspace>
          {mobileDetailOpen ? (
            <div className="min-w-0">
              <header className={cn('border-b px-3 py-2.5', styles.borderColor)}>
                <button
                  type="button"
                  onClick={onBack}
                  className={cn(
                    '-ml-1 inline-flex min-h-11 items-center gap-2 rounded-[16px] px-2.5',
                    navetTypographyTokens.control,
                    styles.mutedColor,
                    styles.hoverBg,
                    styles.ringClass,
                    styles.ringOffsetClass,
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                  )}
                >
                  <ArrowLeft className={navetIconSizeTokens.sm} aria-hidden="true" />
                  <span>{title}</span>
                </button>
              </header>
              <main aria-label={activeItem?.label} className="overflow-x-clip">
                {children}
              </main>
            </div>
          ) : (
            <div className="overflow-x-clip px-3 py-4">
              <header className="pb-4">
                <h1 className={cn('px-2', navetTypographyTokens.pageHeading, styles.textColor)}>
                  {title}
                </h1>
                <div className="mt-4">
                  <SettingsSearch label={searchLabel} onChange={setQuery} value={query} />
                </div>
              </header>
              {searchActive ? (
                <SettingsSearchResults
                  emptyLabel={emptySearchLabel}
                  groups={groups}
                  items={searchResults}
                  onSelect={(item) => {
                    setQuery('');
                    onSearchSelect(item);
                  }}
                  styles={styles}
                />
              ) : (
                <nav aria-label={title}>
                  <SettingsNavigationGroups
                    activeId={activeId}
                    groups={groups}
                    mobile
                    onSelect={onSelect}
                    styles={styles}
                  />
                </nav>
              )}
            </div>
          )}
        </NavigationWorkspace.Frame>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="min-w-0 overflow-hidden">
      <NavigationWorkspace.Frame
        className="mx-auto h-[85dvh] min-h-[36rem] max-h-[calc(100dvh-2rem)] max-w-6xl"
        data-settings-workspace
      >
        <NavigationWorkspace.Header className="px-5 py-4 md:px-6">
          <h1 className={cn(navetTypographyTokens.pageHeading, styles.textColor)}>{title}</h1>
        </NavigationWorkspace.Header>

        <NavigationWorkspace.Body className="grid-cols-[16rem_minmax(0,1fr)]">
          <NavigationWorkspace.Sidebar className="flex flex-col">
            <div className={cn('border-b px-3 py-4', styles.borderColor)}>
              <SettingsSearch label={searchLabel} onChange={setQuery} value={query} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              {searchActive ? (
                <SettingsSearchResults
                  emptyLabel={emptySearchLabel}
                  groups={groups}
                  items={searchResults}
                  onSelect={(item) => {
                    setQuery('');
                    onSearchSelect(item);
                  }}
                  styles={styles}
                />
              ) : (
                <nav aria-label={title}>
                  <SettingsNavigationGroups
                    activeId={activeId}
                    groups={groups}
                    mobile={false}
                    onSelect={onSelect}
                    styles={styles}
                  />
                </nav>
              )}
            </div>
          </NavigationWorkspace.Sidebar>

          <NavigationWorkspace.Content
            className="overflow-x-hidden overflow-y-auto"
            aria-label={activeItem?.label}
          >
            {children}
          </NavigationWorkspace.Content>
        </NavigationWorkspace.Body>
      </NavigationWorkspace.Frame>
    </div>
  );
}
