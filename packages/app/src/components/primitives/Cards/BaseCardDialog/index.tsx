import {
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@navet/app/components/patterns';
import { Button } from '@navet/app/components/primitives/button';
import {
  coverSheetHeaderClassName,
  settingsDialogContentClass,
} from '@navet/app/components/primitives/dialog-primitives';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import { CompactRoomSelector } from '@navet/app/components/shared/device-editor/compact-room-selector';
import { CustomCardTintPicker } from '@navet/app/components/shared/device-editor/custom-card-tint-picker';
import { CustomScrollbar } from '@navet/app/components/shared/device-editor/custom-scrollbar';
import { getBaseCardDialogSurface } from '@navet/app/components/shared/theme/base-card-dialog-surface';
import { getInheritedDialogSectionStyle } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import * as Dialog from '@radix-ui/react-dialog';
import { type LucideIcon, Palette, Sliders, X } from 'lucide-react';
import type { CSSProperties, ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

export type BaseCardDialogVariant = 'card' | 'modal' | 'sheet' | 'fullscreen';

export interface BaseCardDialogTab {
  key: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
}

export interface BaseCardDialogRoomSelector {
  value: string;
  label: string;
  options: Array<{ label: string; value: string }>;
  onChange?: (room: string) => void;
}

interface BaseCardDialogSharedProps {
  variant?: BaseCardDialogVariant;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  theme: ThemeType;
  overlayClassName?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  contentGlowClassName?: string;
  contentGlowStyle?: CSSProperties;
  contentOverlayClassName?: string | null;
  contentOverlayStyle?: CSSProperties;
  disableOpenAutoFocus?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg';
  height?: 'tall' | 'capped';
  scrollClassName?: string;
  shellBodyClassName?: string;
  bodyClassName?: string;
  footerContent?: ReactNode;
  footerActionLabel?: string;
  children?: ReactNode;
}

interface BaseCardDialogCardProps extends BaseCardDialogSharedProps {
  variant?: 'card';
  entityId?: string;
  entityType?: string;
  tabs: BaseCardDialogTab[];
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
  defaultTintAccent?: string;
  roomSelector?: BaseCardDialogRoomSelector;
  roomSelectorFallbackRoomName?: string;
  editableTitle?: boolean;
  onTitleChange?: (title: string) => void | Promise<void>;
  headerSupportingContent?: ReactNode;
  headerTrailing?: ReactNode;
  headerClassName?: string;
  contentSurface?: { panel: string; border: string };
  activeTab?: string;
  defaultTab?: string;
  onActiveTabChange?: (key: string) => void;
}

interface BaseCardDialogModalProps extends BaseCardDialogSharedProps {
  variant: 'modal';
  contentTitle?: string;
  contentDescription?: string;
  bodyPadding?: boolean;
  mobileCoverSheet?: boolean;
  persistentMobileDismiss?: boolean;
}

interface BaseCardDialogSheetProps extends BaseCardDialogSharedProps {
  variant: 'sheet';
  contentTitle?: string;
  contentDescription?: string;
  accentColor?: string;
  closeLabel?: string;
  persistentMobileDismiss?: boolean;
}

interface BaseCardDialogFullscreenProps extends BaseCardDialogSharedProps {
  variant: 'fullscreen';
  contentTitle?: string;
  contentDescription?: string;
  persistentMobileDismiss?: boolean;
}

export type BaseCardDialogProps =
  | BaseCardDialogCardProps
  | BaseCardDialogModalProps
  | BaseCardDialogSheetProps
  | BaseCardDialogFullscreenProps;

interface BaseCardDialogRootProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  overlayClassName: string;
  contentClassName: string;
  contentAriaDescribedBy?: string;
  contentTitle?: string;
  contentDescription?: string;
  disableOpenAutoFocus?: boolean;
  mobileCoverSheet?: boolean;
  persistentMobileDismiss?: boolean;
  mobileDismissLabel?: string;
  mobileDismissStyle?: CSSProperties;
  contentStyle?: CSSProperties;
  contentGlowClassName?: string;
  contentGlowStyle?: CSSProperties;
  contentOverlayClassName?: string | null;
  contentOverlayStyle?: CSSProperties;
  bodyClassName?: string;
  children: ReactNode;
}

const mobileCoverSheetClassName = [
  'max-sm:!top-[var(--mobile-cover-sheet-top)] max-sm:!right-0 max-sm:!bottom-0 max-sm:!left-0',
  'max-sm:!mx-0 max-sm:!h-[80dvh] max-sm:!max-h-[100dvh] max-sm:!w-auto max-sm:!max-w-none',
  'max-sm:!flex max-sm:!flex-col',
  'max-sm:![translate:0_var(--mobile-cover-sheet-drag-y)] max-sm:!rounded-t-[30px] max-sm:!rounded-b-none',
  'max-sm:!transition-[height,top,translate] max-sm:!duration-200 max-sm:!ease-out',
].join(' ');

const mobileCoverSheetFullscreenClassName = [
  'max-sm:!h-auto',
  'max-sm:!transition-[height,top,translate] max-sm:!duration-200 max-sm:!ease-out',
].join(' ');

const mobileCoverSheetDraggingClassName = 'max-sm:!transition-none';
const mobileCoverSheetTopInsetPx = 8;

function blurActiveElement() {
  if (typeof document === 'undefined') {
    return;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

function getMobileCoverSheetStyle(
  contentStyle: CSSProperties | undefined,
  dragOffset: number,
  topInset: string
): CSSProperties {
  return {
    ...contentStyle,
    '--mobile-cover-sheet-drag-y': `${dragOffset}px`,
    '--mobile-cover-sheet-top': topInset,
  } as CSSProperties;
}

function BaseCardDialogRoot({
  isOpen,
  onOpenChange,
  overlayClassName,
  contentClassName,
  contentAriaDescribedBy,
  contentTitle,
  contentDescription,
  disableOpenAutoFocus = false,
  mobileCoverSheet = true,
  persistentMobileDismiss = false,
  mobileDismissLabel,
  mobileDismissStyle,
  contentStyle,
  contentGlowClassName,
  contentGlowStyle,
  contentOverlayClassName,
  contentOverlayStyle,
  bodyClassName,
  children,
}: BaseCardDialogRootProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const generatedDescriptionId = useId();
  const [isMobileCoverSheetFullscreen, setIsMobileCoverSheetFullscreen] = useState(false);
  const [mobileCoverSheetDragOffset, setMobileCoverSheetDragOffset] = useState(0);
  const [mobileCoverSheetTopInset, setMobileCoverSheetTopInset] = useState('auto');
  const [isMobileCoverSheetDragging, setIsMobileCoverSheetDragging] = useState(false);
  const mobileCoverSheetContentRef = useRef<HTMLDivElement | null>(null);
  const mobileCoverSheetDragStartYRef = useRef(0);
  const mobileCoverSheetDragStartTopRef = useRef(0);
  const mobileCoverSheetRestingTopRef = useRef(0);
  const mobileCoverSheetDragDeltaRef = useRef(0);
  const mobileCoverSheetPointerIdRef = useRef<number | null>(null);
  const suppressMobileCoverSheetHandleClickRef = useRef(false);
  const hasDecoratedContent = Boolean(
    contentGlowClassName || contentGlowStyle || contentOverlayClassName
  );
  const resolvedBodyClassName = [
    bodyClassName,
    mobileCoverSheet ? 'max-sm:flex max-sm:min-h-0 max-sm:flex-1 max-sm:flex-col' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const resolvedAriaDescribedBy = contentDescription
    ? generatedDescriptionId
    : contentAriaDescribedBy;

  useLayoutEffect(() => {
    if (isOpen) {
      blurActiveElement();
    }
  }, [isOpen]);

  const resetMobileCoverSheetDragState = useCallback(() => {
    mobileCoverSheetDragDeltaRef.current = 0;
    mobileCoverSheetPointerIdRef.current = null;
    suppressMobileCoverSheetHandleClickRef.current = false;
    setMobileCoverSheetDragOffset(0);
    setMobileCoverSheetTopInset('auto');
    setIsMobileCoverSheetFullscreen(false);
    setIsMobileCoverSheetDragging(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetMobileCoverSheetDragState();
    }
  }, [isOpen, resetMobileCoverSheetDragState]);

  useEffect(() => {
    if (!mobileCoverSheet || !isMobileCoverSheetDragging) {
      return;
    }

    const closeThresholdPx = isMobileCoverSheetFullscreen
      ? Math.max(360, window.innerHeight * 0.7)
      : 72;
    const collapseThresholdPx = isMobileCoverSheetFullscreen
      ? Math.max(56, window.innerHeight * 0.1)
      : 72;
    const fullscreenThresholdPx = 56;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== mobileCoverSheetPointerIdRef.current) {
        return;
      }

      const deltaY = event.clientY - mobileCoverSheetDragStartYRef.current;
      if (Math.abs(deltaY) > 6) {
        suppressMobileCoverSheetHandleClickRef.current = true;
      }

      mobileCoverSheetDragDeltaRef.current = deltaY;
      if (isMobileCoverSheetFullscreen && deltaY > 0) {
        const restingTop =
          mobileCoverSheetRestingTopRef.current || mobileCoverSheetDragStartTopRef.current;
        const topInset = Math.min(restingTop, mobileCoverSheetTopInsetPx + deltaY);
        setMobileCoverSheetTopInset(`${Math.max(mobileCoverSheetTopInsetPx, topInset)}px`);
        setMobileCoverSheetDragOffset(
          Math.max(0, deltaY - (restingTop - mobileCoverSheetTopInsetPx))
        );
        return;
      }

      setMobileCoverSheetDragOffset(Math.max(0, deltaY));
      setMobileCoverSheetTopInset(
        deltaY < 0
          ? `${Math.max(
              mobileCoverSheetTopInsetPx,
              mobileCoverSheetDragStartTopRef.current + deltaY
            )}px`
          : 'auto'
      );
    };

    const finishDrag = (event: PointerEvent) => {
      if (event.pointerId !== mobileCoverSheetPointerIdRef.current) {
        return;
      }

      const dragDelta = mobileCoverSheetDragDeltaRef.current;
      setIsMobileCoverSheetDragging(false);
      mobileCoverSheetPointerIdRef.current = null;
      mobileCoverSheetDragDeltaRef.current = 0;
      setMobileCoverSheetDragOffset(0);

      if (dragDelta >= closeThresholdPx) {
        blurActiveElement();
        onOpenChange(false);
        return;
      }

      if (isMobileCoverSheetFullscreen && dragDelta >= collapseThresholdPx) {
        setIsMobileCoverSheetFullscreen(false);
        setMobileCoverSheetTopInset('auto');
        return;
      }

      if (dragDelta <= -fullscreenThresholdPx) {
        setMobileCoverSheetTopInset('0.5rem');
        setIsMobileCoverSheetFullscreen(true);
      } else {
        setMobileCoverSheetTopInset(isMobileCoverSheetFullscreen ? '0.5rem' : 'auto');
      }

      window.setTimeout(() => {
        suppressMobileCoverSheetHandleClickRef.current = false;
      }, 0);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, [isMobileCoverSheetDragging, isMobileCoverSheetFullscreen, mobileCoverSheet, onOpenChange]);

  const handleMobileCoverSheetPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    mobileCoverSheetPointerIdRef.current = event.pointerId;
    mobileCoverSheetDragStartYRef.current = event.clientY;
    mobileCoverSheetDragStartTopRef.current =
      mobileCoverSheetContentRef.current?.getBoundingClientRect().top ?? mobileCoverSheetTopInsetPx;
    if (!isMobileCoverSheetFullscreen) {
      mobileCoverSheetRestingTopRef.current = mobileCoverSheetDragStartTopRef.current;
    }
    mobileCoverSheetDragDeltaRef.current = 0;
    suppressMobileCoverSheetHandleClickRef.current = false;
    setIsMobileCoverSheetDragging(true);
    setMobileCoverSheetDragOffset(0);
  };

  const handleMobileCoverSheetHandleClick = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    if (suppressMobileCoverSheetHandleClickRef.current) {
      suppressMobileCoverSheetHandleClickRef.current = false;
      return;
    }

    onOpenChange(false);
  };

  const resolvedContentClassName = [
    contentClassName,
    mobileCoverSheet ? mobileCoverSheetClassName : '',
    persistentMobileDismiss ? 'max-sm:[&_[data-cover-sheet-inline-dismiss]]:!hidden' : '',
    mobileCoverSheet && isMobileCoverSheetFullscreen ? mobileCoverSheetFullscreenClassName : '',
    mobileCoverSheet && isMobileCoverSheetDragging ? mobileCoverSheetDraggingClassName : '',
  ]
    .filter(Boolean)
    .join(' ');
  const resolvedContentStyle = mobileCoverSheet
    ? getMobileCoverSheetStyle(contentStyle, mobileCoverSheetDragOffset, mobileCoverSheetTopInset)
    : contentStyle;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(nextOpen) => {
        blurActiveElement();
        onOpenChange(nextOpen);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={`fixed inset-0 z-50 ${overlayClassName}`} />
        <Dialog.Content
          ref={mobileCoverSheetContentRef}
          className={resolvedContentClassName}
          style={resolvedContentStyle}
          aria-describedby={resolvedAriaDescribedBy}
          onOpenAutoFocus={
            disableOpenAutoFocus
              ? (event) => {
                  event.preventDefault();
                  blurActiveElement();
                }
              : undefined
          }
        >
          {contentTitle ? <Dialog.Title className="sr-only">{contentTitle}</Dialog.Title> : null}
          {contentDescription ? (
            <Dialog.Description id={generatedDescriptionId} className="sr-only">
              {contentDescription}
            </Dialog.Description>
          ) : null}
          {persistentMobileDismiss ? (
            <div className="pointer-events-none absolute top-3 right-3 z-30 hidden max-sm:block">
              <button
                type="button"
                data-mobile-cover-sheet-dismiss
                aria-label={mobileDismissLabel ?? t('common.close')}
                onClick={() => {
                  blurActiveElement();
                  onOpenChange(false);
                }}
                className={cn(
                  'pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm backdrop-blur-xl transition-colors',
                  surface.borderStrong,
                  surface.subtleBg,
                  surface.hoverBg,
                  surface.textPrimary
                )}
                style={mobileDismissStyle}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
          {mobileCoverSheet ? (
            <button
              type="button"
              onPointerDown={handleMobileCoverSheetPointerDown}
              onClick={handleMobileCoverSheetHandleClick}
              className="relative z-[3] mx-auto mt-1 mb-0 hidden h-9 w-20 touch-none items-center justify-center max-sm:flex"
              aria-label={
                isMobileCoverSheetFullscreen ? 'Close dialog' : 'Drag dialog to fullscreen or close'
              }
            >
              <span className="h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
            </button>
          ) : null}
          {contentGlowClassName || contentGlowStyle ? (
            <div
              className={`absolute inset-0 ${contentGlowClassName ?? ''}`}
              style={contentGlowStyle}
            />
          ) : null}
          {contentOverlayClassName ? (
            <div
              className={`pointer-events-none absolute inset-0 ${contentOverlayClassName}`}
              style={contentOverlayStyle}
            />
          ) : null}
          {hasDecoratedContent ? (
            <div className={`relative z-[2] ${resolvedBodyClassName}`}>{children}</div>
          ) : mobileCoverSheet ? (
            <div className={resolvedBodyClassName}>{children}</div>
          ) : (
            children
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function getWidgetRoomSelector(roomSelector: BaseCardDialogRoomSelector, theme: ThemeType) {
  const isLightTheme = theme === 'light';

  return (
    <div className="relative inline-flex items-center">
      <div
        className={`inline-flex min-w-0 items-center text-xs font-medium ${
          isLightTheme ? 'text-slate-700' : 'text-white/82'
        }`}
      >
        <CompactRoomSelector
          value={roomSelector.value}
          label={roomSelector.label}
          options={roomSelector.options}
          onChange={roomSelector.onChange}
          contentClassName="gap-1 text-xs"
          labelClassName="max-w-[10rem]"
          iconClassName="h-3 w-3"
        />
      </div>
    </div>
  );
}

function BaseCardDialogCardVariant({
  isOpen,
  onOpenChange,
  title,
  entityId,
  entityType,
  description,
  tabs,
  theme,
  tintColor,
  defaultTintAccent,
  footerContent,
  footerActionLabel,
  roomSelector,
  roomSelectorFallbackRoomName,
  editableTitle = true,
  onTitleChange,
  headerSupportingContent,
  headerTrailing,
  headerClassName,
  bodyClassName,
  scrollClassName,
  contentSurface,
  contentClassName,
  contentStyle,
  contentGlowClassName,
  contentGlowStyle,
  contentOverlayClassName,
  contentOverlayStyle,
  disableOpenAutoFocus = false,
  maxWidth = 'md',
  height,
  activeTab,
  defaultTab,
  onActiveTabChange,
}: BaseCardDialogCardProps) {
  const { t } = useI18n();
  const { accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const dialogSurface = contentSurface ?? getBaseCardDialogSurface(theme);
  const firstTabKey = tabs[0]?.key;
  const shouldRenderTabs = tabs.length > 1;
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab ?? firstTabKey ?? '');
  const resolvedActiveTab = activeTab ?? internalActiveTab;
  const resolvedDescription = description ?? entityType;

  useEffect(() => {
    if (!firstTabKey) return;
    if (!defaultTab && activeTab === undefined) setInternalActiveTab(firstTabKey);
  }, [activeTab, defaultTab, firstTabKey]);

  useEffect(() => {
    if (!isOpen || activeTab !== undefined || !resolvedActiveTab) return;
    setInternalActiveTab(resolvedActiveTab);
  }, [activeTab, isOpen, resolvedActiveTab]);

  const handleActiveTabChange = (nextTab: string) => {
    if (activeTab === undefined) setInternalActiveTab(nextTab);
    onActiveTabChange?.(nextTab);
  };

  const paletteControlStyle = useMemo(
    () => getInheritedDialogSectionStyle(theme, tintColor, defaultTintAccent ?? accentColor),
    [accentColor, defaultTintAccent, theme, tintColor]
  );
  const widgetRoomSelector = useMemo(
    () => (roomSelector ? getWidgetRoomSelector(roomSelector, theme) : null),
    [roomSelector, theme]
  );

  const resolvedContentClassName = cn(
    settingsDialogContentClass(dialogSurface, {
      maxWidth,
      height,
      padding: false,
    }),
    contentClassName
  );

  const cardHeader = (
    <header
      data-card-dialog-header
      className={cn(
        coverSheetHeaderClassName,
        'shrink-0 border-b max-sm:pt-2 max-sm:pr-4',
        dialogSurface.border
      )}
    >
      <CardDialogHeader
        title={title}
        description={resolvedDescription}
        entityId={roomSelector ? undefined : entityId}
        eyebrow={widgetRoomSelector}
        showRoomSelector={!roomSelector}
        theme={theme}
        roomSelectorFallbackRoomName={roomSelectorFallbackRoomName}
        editableTitle={editableTitle}
        onTitleChange={onTitleChange}
        supportingContent={headerSupportingContent}
        trailing={headerTrailing}
        className={cn('mb-0 max-sm:pr-0', headerClassName)}
      />

      {shouldRenderTabs ? (
        <CardDialogTabList className="mt-3 mb-0 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <CardDialogTabTrigger
              key={tab.key}
              active={resolvedActiveTab === tab.key}
              icon={tab.icon}
              onClick={() => handleActiveTabChange(tab.key)}
            >
              {tab.label}
            </CardDialogTabTrigger>
          ))}
        </CardDialogTabList>
      ) : null}
    </header>
  );

  const cardBody = (
    <CardDialogBody className={bodyClassName}>
      {shouldRenderTabs
        ? tabs.map((tab) => (
            <TabPanel key={tab.key} value={tab.key}>
              {tab.content}
            </TabPanel>
          ))
        : (tabs[0]?.content ?? null)}

      {footerContent ? (
        footerContent
      ) : (
        <CardDialogFooter>
          <Dialog.Close asChild>
            <Button variant="soft" style={paletteControlStyle}>
              {footerActionLabel ?? t('common.done')}
            </Button>
          </Dialog.Close>
        </CardDialogFooter>
      )}
    </CardDialogBody>
  );

  return (
    <BaseCardDialogRoot
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus={disableOpenAutoFocus}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={resolvedContentClassName}
      contentStyle={contentStyle}
      contentGlowClassName={contentGlowClassName}
      contentGlowStyle={contentGlowStyle}
      contentOverlayClassName={contentOverlayClassName}
      contentOverlayStyle={contentOverlayStyle}
      persistentMobileDismiss
      mobileDismissStyle={paletteControlStyle}
    >
      <CustomScrollbar
        isOn={theme !== 'light'}
        className={cn('max-sm:-mt-5 max-sm:min-h-0 max-sm:flex-1', scrollClassName)}
      >
        {shouldRenderTabs ? (
          <Tabs
            value={resolvedActiveTab}
            defaultValue={defaultTab ?? firstTabKey}
            onValueChange={handleActiveTabChange}
          >
            {cardHeader}
            {cardBody}
          </Tabs>
        ) : (
          <>
            {cardHeader}
            {cardBody}
          </>
        )}
      </CustomScrollbar>
    </BaseCardDialogRoot>
  );
}

function BaseCardDialogModalVariant({
  isOpen,
  onOpenChange,
  title,
  description,
  theme,
  overlayClassName,
  contentClassName,
  contentStyle,
  contentGlowClassName,
  contentGlowStyle,
  contentOverlayClassName,
  contentOverlayStyle,
  disableOpenAutoFocus = false,
  maxWidth = 'md',
  height,
  bodyClassName,
  shellBodyClassName,
  children,
  contentTitle,
  contentDescription,
  bodyPadding = true,
  mobileCoverSheet = false,
  persistentMobileDismiss = false,
}: BaseCardDialogModalProps) {
  const surface = getThemeSurfaceTokens(theme);

  return (
    <BaseCardDialogRoot
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus={disableOpenAutoFocus}
      overlayClassName={overlayClassName ?? surface.dialogBackdrop}
      contentTitle={contentTitle ?? title}
      contentDescription={contentDescription ?? description}
      contentClassName={cn(
        settingsDialogContentClass(surface, {
          maxWidth,
          height,
          overflow: Boolean(height),
          padding: false,
          animate: true,
        }),
        contentClassName
      )}
      contentStyle={contentStyle}
      contentGlowClassName={contentGlowClassName}
      contentGlowStyle={contentGlowStyle}
      contentOverlayClassName={contentOverlayClassName}
      contentOverlayStyle={contentOverlayStyle}
      bodyClassName={shellBodyClassName}
      mobileCoverSheet={mobileCoverSheet}
      persistentMobileDismiss={persistentMobileDismiss}
    >
      <div
        className={cn(
          bodyPadding ? 'p-6 max-sm:px-3.5 max-sm:pt-2 max-sm:pb-3' : '',
          bodyClassName
        )}
      >
        {children}
      </div>
    </BaseCardDialogRoot>
  );
}

function BaseCardDialogSheetVariant({
  isOpen,
  onOpenChange,
  title,
  description,
  theme,
  overlayClassName,
  contentClassName,
  contentStyle,
  contentGlowClassName,
  contentGlowStyle,
  bodyClassName,
  children,
  accentColor,
  contentTitle,
  contentDescription,
  persistentMobileDismiss = true,
  closeLabel,
}: BaseCardDialogSheetProps) {
  const resolvedContentStyle: CSSProperties = {
    ...(theme === 'glass' && accentColor
      ? {
          boxShadow: `0 -24px 64px -40px ${accentColor}66, 0 24px 48px -36px rgba(0,0,0,0.72)`,
        }
      : {}),
    ...contentStyle,
  };

  return (
    <BaseCardDialogRoot
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      contentTitle={contentTitle ?? title}
      contentDescription={contentDescription ?? description}
      overlayClassName={overlayClassName ?? 'animate-in fade-in bg-black/55 backdrop-blur-sm'}
      contentClassName={cn(
        'fixed inset-x-0 bottom-0 z-50 mx-auto max-w-none overflow-hidden rounded-t-[30px] rounded-b-none border border-white/12 bg-zinc-950/96 shadow-2xl backdrop-blur-2xl outline-none sm:inset-x-2 sm:bottom-2 sm:max-w-xl sm:rounded-[30px]',
        contentClassName
      )}
      contentGlowClassName={contentGlowClassName}
      contentGlowStyle={contentGlowStyle}
      contentStyle={resolvedContentStyle}
      mobileCoverSheet
      persistentMobileDismiss={persistentMobileDismiss}
      mobileDismissLabel={closeLabel}
      bodyClassName={cn(
        'relative pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:touch-pan-y',
        bodyClassName
      )}
    >
      {children}
    </BaseCardDialogRoot>
  );
}

function BaseCardDialogFullscreenVariant({
  isOpen,
  onOpenChange,
  title,
  description,
  theme,
  overlayClassName,
  contentClassName,
  contentStyle,
  disableOpenAutoFocus = false,
  shellBodyClassName,
  children,
  contentTitle,
  contentDescription,
  persistentMobileDismiss = true,
}: BaseCardDialogFullscreenProps) {
  const surface = getThemeSurfaceTokens(theme);

  return (
    <BaseCardDialogRoot
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus={disableOpenAutoFocus}
      mobileCoverSheet
      persistentMobileDismiss={persistentMobileDismiss}
      overlayClassName={overlayClassName ?? `animate-in fade-in ${surface.dialogBackdrop}`}
      contentTitle={contentTitle ?? title}
      contentDescription={contentDescription ?? description}
      contentClassName={cn(
        'fixed inset-3 z-50 overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-200 md:inset-8',
        contentClassName
      )}
      contentStyle={contentStyle}
      bodyClassName={shellBodyClassName}
    >
      {children}
    </BaseCardDialogRoot>
  );
}

export function BaseCardDialog(props: BaseCardDialogProps) {
  if (props.variant === 'modal') {
    return <BaseCardDialogModalVariant {...props} />;
  }

  if (props.variant === 'sheet') {
    return <BaseCardDialogSheetVariant {...props} />;
  }

  if (props.variant === 'fullscreen') {
    return <BaseCardDialogFullscreenVariant {...props} />;
  }

  return <BaseCardDialogCardVariant {...props} />;
}

export interface BaseCardDialogWithStateProps
  extends Omit<BaseCardDialogCardProps, 'tabs' | 'variant'> {
  controlsTabContent: ReactNode;
  controlsTabIcon?: LucideIcon;
  customizeTabContent?: ReactNode;
  extraTabs?: BaseCardDialogTab[];
}

export function BaseCardDialogWithState({
  controlsTabContent,
  controlsTabIcon = Sliders,
  customizeTabContent,
  extraTabs = [],
  ...props
}: BaseCardDialogWithStateProps) {
  const { t } = useI18n();

  const tabs: BaseCardDialogTab[] = [
    {
      key: 'controls',
      label: t('common.controls'),
      icon: controlsTabIcon,
      content: controlsTabContent,
    },
    ...(customizeTabContent || props.onTintColorChange
      ? [
          {
            key: 'card',
            label: t('common.customize'),
            icon: Palette,
            content: (
              <>
                {customizeTabContent}
                {props.onTintColorChange ? (
                  <CardDialogSection>
                    <CustomCardTintPicker
                      value={props.tintColor}
                      onChange={props.onTintColorChange}
                      defaultColor={props.defaultTintAccent ?? '#3b82f6'}
                      className={getThemeSurfaceTokens(props.theme).textMuted}
                    />
                  </CardDialogSection>
                ) : null}
              </>
            ),
          } as BaseCardDialogTab,
        ]
      : []),
    ...extraTabs,
  ];

  return <BaseCardDialog {...props} variant="card" tabs={tabs} />;
}
