import {
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@navet/app/components/patterns';
import { Button } from '@navet/app/components/primitives/button';
import { settingsDialogContentClass } from '@navet/app/components/primitives/dialog-primitives';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import { CustomCardTintPicker, CustomScrollbar } from '@navet/app/components/shared/device-editor';
import { CompactRoomSelector } from '@navet/app/components/shared/device-editor/compact-room-selector';
import { getBaseCardDialogSurface } from '@navet/app/components/shared/theme/base-card-dialog-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import * as Dialog from '@radix-ui/react-dialog';
import { type LucideIcon, Palette, Sliders } from 'lucide-react';
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
}

interface BaseCardDialogSheetProps extends BaseCardDialogSharedProps {
  variant: 'sheet';
  contentTitle?: string;
  contentDescription?: string;
  accentColor?: string;
  closeLabel?: string;
}

interface BaseCardDialogFullscreenProps extends BaseCardDialogSharedProps {
  variant: 'fullscreen';
  contentTitle?: string;
  contentDescription?: string;
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
  contentStyle?: CSSProperties;
  contentGlowClassName?: string;
  contentGlowStyle?: CSSProperties;
  contentOverlayClassName?: string | null;
  contentOverlayStyle?: CSSProperties;
  bodyClassName?: string;
  children: ReactNode;
}

const mobileCoverSheetClassName = [
  'max-sm:!top-[var(--mobile-cover-sheet-top)] max-sm:!right-2 max-sm:!bottom-2 max-sm:!left-2',
  'max-sm:!mx-0 max-sm:!max-h-[calc(100dvh-1rem)] max-sm:!w-auto max-sm:!max-w-none',
  'max-sm:![translate:0_var(--mobile-cover-sheet-drag-y)] max-sm:!rounded-[30px]',
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
  contentStyle,
  contentGlowClassName,
  contentGlowStyle,
  contentOverlayClassName,
  contentOverlayStyle,
  bodyClassName,
  children,
}: BaseCardDialogRootProps) {
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
  const resolvedBodyClassName = bodyClassName ?? (mobileCoverSheet ? 'min-h-0' : '');
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
    setMobileCoverSheetTopInset(isMobileCoverSheetFullscreen ? '0.5rem' : 'auto');
    setIsMobileCoverSheetDragging(false);
  }, [isMobileCoverSheetFullscreen]);

  useEffect(() => {
    if (!isOpen) {
      resetMobileCoverSheetDragState();
      setMobileCoverSheetTopInset('auto');
      setIsMobileCoverSheetFullscreen(false);
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
          {mobileCoverSheet ? (
            <button
              type="button"
              onPointerDown={handleMobileCoverSheetPointerDown}
              onClick={handleMobileCoverSheetHandleClick}
              className="relative z-[3] mx-auto mt-3 mb-1 hidden h-5 w-20 touch-none items-center justify-center max-sm:flex"
              aria-label={
                isMobileCoverSheetFullscreen ? 'Close dialog' : 'Drag dialog to fullscreen or close'
              }
            >
              <span className="h-1 w-16 rounded-full bg-white/20" aria-hidden="true" />
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

function getWidgetRoomSelector(roomSelector: BaseCardDialogRoomSelector) {
  return (
    <div className="relative inline-flex items-center">
      {roomSelector.onChange ? (
        <select
          aria-label={roomSelector.label}
          value={roomSelector.value}
          onChange={(event) => roomSelector.onChange?.(event.target.value)}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
        >
          {roomSelector.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      <div className="inline-flex h-[34px] min-w-0 items-center rounded-full border border-white/12 bg-white/8 px-2.5 text-white/82">
        <CompactRoomSelector
          value={roomSelector.value}
          label={roomSelector.label}
          options={roomSelector.options}
          onChange={roomSelector.onChange}
          contentClassName="gap-1.5 text-xs"
          labelClassName="max-w-[10rem]"
          iconClassName="h-3.5 w-3.5"
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

  const widgetRoomSelector = useMemo(
    () => (roomSelector ? getWidgetRoomSelector(roomSelector) : null),
    [roomSelector]
  );
  const headerRoomSelectorStyle = useMemo<CSSProperties>(
    () => ({
      height: '34px',
      paddingInline: '10px',
      fontSize: '0.75rem',
      lineHeight: '1rem',
    }),
    []
  );

  const resolvedContentClassName = cn(
    settingsDialogContentClass(dialogSurface, {
      maxWidth,
      height,
      padding: false,
    }),
    contentClassName
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
    >
      <CustomScrollbar
        isOn={theme !== 'light'}
        className={scrollClassName ?? 'max-sm:min-h-0 max-sm:flex-1'}
      >
        <CardDialogBody className={bodyClassName}>
          <CardDialogHeader
            title={title}
            description={resolvedDescription}
            entityId={roomSelector ? undefined : entityId}
            showRoomSelector={!roomSelector}
            roomSelectorFallbackRoomName={roomSelectorFallbackRoomName}
            roomSelectorCompactContentStyle={headerRoomSelectorStyle}
            editableTitle={editableTitle}
            onTitleChange={onTitleChange}
            supportingContent={headerSupportingContent}
            trailing={widgetRoomSelector ?? headerTrailing}
            className={headerClassName}
          />

          {shouldRenderTabs ? (
            <Tabs
              value={resolvedActiveTab}
              defaultValue={defaultTab ?? firstTabKey}
              onValueChange={handleActiveTabChange}
            >
              <CardDialogTabList>
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

              {tabs.map((tab) => (
                <TabPanel key={tab.key} value={tab.key}>
                  {tab.content}
                </TabPanel>
              ))}
            </Tabs>
          ) : tabs.length === 1 ? (
            tabs[0]?.content
          ) : null}

          {footerContent ? (
            footerContent
          ) : (
            <CardDialogFooter>
              <Dialog.Close asChild>
                <Button variant="secondary" size="small">
                  {footerActionLabel ?? t('common.done')}
                </Button>
              </Dialog.Close>
            </CardDialogFooter>
          )}
        </CardDialogBody>
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
  closeLabel,
}: BaseCardDialogSheetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const dragPointerIdRef = useRef<number | null>(null);
  const suppressHandleClickRef = useRef(false);

  const resetDragState = useCallback(() => {
    dragOffsetRef.current = 0;
    dragPointerIdRef.current = null;
    suppressHandleClickRef.current = false;
    setDragOffset(0);
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetDragState();
    }
  }, [isOpen, resetDragState]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const dismissThresholdPx = 72;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragPointerIdRef.current) {
        return;
      }

      const deltaY = Math.max(0, event.clientY - dragStartYRef.current);
      if (deltaY > 6) {
        suppressHandleClickRef.current = true;
      }
      dragOffsetRef.current = deltaY;
      setDragOffset(deltaY);
    };

    const finishDrag = (event: PointerEvent) => {
      if (event.pointerId !== dragPointerIdRef.current) {
        return;
      }

      const shouldClose = dragOffsetRef.current >= dismissThresholdPx;
      setIsDragging(false);
      dragPointerIdRef.current = null;

      if (shouldClose) {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        onOpenChange(false);
        dragOffsetRef.current = 0;
        setDragOffset(0);
        return;
      }

      dragOffsetRef.current = 0;
      setDragOffset(0);
      window.setTimeout(() => {
        suppressHandleClickRef.current = false;
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
  }, [isDragging, onOpenChange]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    dragPointerIdRef.current = event.pointerId;
    dragStartYRef.current = event.clientY;
    dragOffsetRef.current = 0;
    suppressHandleClickRef.current = false;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleClick = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    if (suppressHandleClickRef.current) {
      suppressHandleClickRef.current = false;
      return;
    }

    onOpenChange(false);
  };

  const resolvedContentStyle: CSSProperties = {
    ...(theme === 'glass' && accentColor
      ? {
          boxShadow: `0 -24px 64px -40px ${accentColor}66, 0 24px 48px -36px rgba(0,0,0,0.72)`,
        }
      : {}),
    ...contentStyle,
    transform: `translateY(${dragOffset}px)`,
    transition: isDragging ? 'none' : 'transform 180ms ease-out',
  };

  return (
    <BaseCardDialogRoot
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      contentTitle={contentTitle ?? title}
      contentDescription={contentDescription ?? description}
      overlayClassName={overlayClassName ?? 'animate-in fade-in bg-black/55 backdrop-blur-sm'}
      contentClassName={cn(
        'fixed inset-x-2 bottom-2 z-50 mx-auto max-w-xl overflow-hidden rounded-[30px] border border-white/12 bg-zinc-950/96 shadow-2xl backdrop-blur-2xl outline-none',
        contentClassName
      )}
      contentGlowClassName={contentGlowClassName}
      contentGlowStyle={contentGlowStyle}
      contentStyle={resolvedContentStyle}
      mobileCoverSheet={false}
    >
      <div
        className={cn(
          'relative pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] pt-3',
          bodyClassName
        )}
      >
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          className="mx-auto mb-3 flex h-5 w-16 touch-none items-center justify-center"
          aria-label={closeLabel ?? `Close ${title}`}
        >
          <span className="h-1.5 w-12 rounded-full bg-white/20" aria-hidden="true" />
        </button>
        {children}
      </div>
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
}: BaseCardDialogFullscreenProps) {
  const surface = getThemeSurfaceTokens(theme);

  return (
    <BaseCardDialogRoot
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus={disableOpenAutoFocus}
      mobileCoverSheet={false}
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
  customizeTabContent?: ReactNode;
  extraTabs?: BaseCardDialogTab[];
}

export function BaseCardDialogWithState({
  controlsTabContent,
  customizeTabContent,
  extraTabs = [],
  ...props
}: BaseCardDialogWithStateProps) {
  const { t } = useI18n();

  const tabs: BaseCardDialogTab[] = [
    {
      key: 'controls',
      label: t('common.controls'),
      icon: Sliders,
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
