import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { EntityCardTitleBlock } from '@/app/components/shared/entity-card-title-block';

interface TinyActionCardProps {
  rootClassName: string;
  rootProps?: HTMLAttributes<HTMLDivElement>;
  contentClassName?: string;
  metadataClassName?: string;
  titleClassName?: string;
  detailClassName?: string;
  metadataStyle?: CSSProperties;
  titleStyle?: CSSProperties;
  detailStyle?: CSSProperties;
  watermark: ReactNode;
  overlays?: ReactNode;
  actionButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  metadata: string;
  title: string;
  detail?: string | null;
  children?: ReactNode;
}

export function TinyActionCard({
  rootClassName,
  rootProps,
  contentClassName = '',
  metadataClassName = '',
  titleClassName = '',
  detailClassName = '',
  metadataStyle,
  titleStyle,
  detailStyle,
  watermark,
  overlays,
  actionButtonProps,
  metadata,
  title,
  detail,
  children,
}: TinyActionCardProps) {
  const {
    className: actionButtonClassName = '',
    type: actionButtonType = 'button',
    ...restActionButtonProps
  } = actionButtonProps ?? {};

  return (
    <div className={rootClassName} {...rootProps}>
      {overlays}
      {watermark}
      <div
        className={`relative flex h-full w-full flex-col justify-between text-left ${contentClassName}`}
      >
        <div className="min-w-0 w-full pt-1">
          <EntityCardTitleBlock
            title={title}
            subtitle={metadata}
            layout="eyebrow-first"
            titleClassName={`mt-0.5 line-clamp-2 text-[10px] font-semibold leading-tight ${titleClassName}`}
            subtitleClassName={`truncate text-[10px] tracking-normal ${metadataClassName}`}
            titleStyle={titleStyle}
            subtitleStyle={metadataStyle}
          />
          {detail ? (
            <p className={`mt-0.5 truncate text-[9px] ${detailClassName}`} style={detailStyle}>
              {detail}
            </p>
          ) : null}
        </div>
        {children ?? <span />}
      </div>
      {actionButtonProps ? (
        <button
          type={actionButtonType}
          className={`absolute inset-0 ${actionButtonClassName}`}
          {...restActionButtonProps}
        />
      ) : null}
    </div>
  );
}
