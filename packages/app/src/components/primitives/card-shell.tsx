import type {
  BaseCardActionRowConfig,
  BaseCardFooterMode,
  BaseCardSettingsActionProps,
} from '@navet/app/components/primitives/base-card';
import { BaseCard } from '@navet/app/components/primitives/base-card';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { CardSizeSelector } from '@navet/app/components/shared/card-size-selector';
import type { ReactNode } from 'react';

export interface CardShellProps {
  /** Card size */
  size: CardSize;
  /** Called when size changes */
  onSizeChange?: (size: CardSize) => void;
  /** Card content */
  children: ReactNode;
  /** Card title */
  title?: string;
  /** Card subtitle */
  subtitle?: string;
  /** Leading element in header */
  headerLeading?: ReactNode;
  /** Trailing element in header */
  headerTrailing?: ReactNode;
  /** Custom header (overrides title/subtitle) */
  header?: ReactNode;
  /** Custom footer (overrides actionRow/settingsAction) */
  footer?: ReactNode;
  /** Action row configuration */
  actionRow?: BaseCardActionRowConfig;
  /** Settings action button props */
  settingsAction?: BaseCardSettingsActionProps;
  /** Footer display mode */
  footerMode?: BaseCardFooterMode;
  /** Whether card is in edit mode */
  isEditMode?: boolean;
  /** Called when settings should open */
  /** Settings dialog component (rendered when open) */
  settingsDialog?: ReactNode;
  /** Whether settings dialog is open */
  isSettingsOpen?: boolean;
  /** Called when settings dialog open state changes */
  onSettingsOpenChange?: (open: boolean) => void;
  /** Hide size selector in edit mode */
  hideSizeSelector?: boolean;
  /** Custom class name for frame */
  frameClassName?: string;
  /** Custom class name for content */
  contentClassName?: string;
  /** Custom style for frame */
  frameStyle?: React.CSSProperties;
  /** Disable default sheen overlay */
  disableDefaultSheen?: boolean;
  /** Disable default light overlay */
  disableDefaultLightOverlay?: boolean;
  /** Full bleed layout (no padding) */
  fullBleed?: boolean;
  /** Background overlay */
  overlay?: ReactNode;
  /** Background underlay */
  underlay?: ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * CardShell is a high-level card wrapper that provides:
 * - Edit mode overlay with size selector
 * - Settings dialog integration
 * - Consistent header/footer layout
 * - Common surface theming
 *
 * For cards that need custom rendering logic, use BaseCard directly.
 */
export function CardShell({
  size,
  onSizeChange,
  children,
  title,
  subtitle,
  headerLeading,
  headerTrailing,
  header,
  footer,
  actionRow,
  settingsAction,
  footerMode = 'action-row',
  isEditMode = false,
  settingsDialog,
  isSettingsOpen = false,
  onSettingsOpenChange,
  hideSizeSelector = false,
  frameClassName = '',
  contentClassName = '',
  frameStyle,
  disableDefaultSheen = false,
  disableDefaultLightOverlay = false,
  fullBleed = false,
  overlay,
  underlay,
  className = '',
}: CardShellProps) {
  const showEditOverlay = isEditMode && !!onSizeChange && !hideSizeSelector;

  return (
    <>
      <BaseCard
        size={size}
        title={title}
        subtitle={subtitle}
        header={header}
        headerLeading={headerLeading}
        headerTrailing={headerTrailing}
        footer={footer}
        actionRow={actionRow}
        settingsAction={settingsAction}
        footerMode={footerMode}
        frameClassName={frameClassName}
        contentClassName={contentClassName}
        style={frameStyle}
        disableDefaultSheen={disableDefaultSheen}
        disableDefaultLightOverlay={disableDefaultLightOverlay}
        fullBleed={fullBleed}
        overlay={overlay}
        underlay={underlay}
        className={className}
      >
        {children}
      </BaseCard>

      {showEditOverlay && onSizeChange && (
        <div
          className="absolute inset-x-2 top-2 z-50 flex justify-end opacity-90"
          style={{
            backdropFilter: 'blur(12px)',
          }}
        >
          <CardSizeSelector currentSize={size} onSizeChange={onSizeChange} />
        </div>
      )}

      {isSettingsOpen && onSettingsOpenChange && settingsDialog ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[1000] flex items-center justify-center"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onSettingsOpenChange(false);
            }
          }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => onSettingsOpenChange(false)}
            aria-label="Close dialog"
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto p-4">
            {settingsDialog}
          </div>
        </div>
      ) : null}
    </>
  );
}
