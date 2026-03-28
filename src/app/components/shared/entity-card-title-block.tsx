import type { CSSProperties } from 'react';

export type EntityCardTitleLayout = 'title-first' | 'eyebrow-first';

interface EntityCardTitleBlockProps {
  title: string;
  subtitle?: string;
  layout?: EntityCardTitleLayout;
  titleClassName?: string;
  subtitleClassName?: string;
  titleStyle?: CSSProperties;
  subtitleStyle?: CSSProperties;
}

export function EntityCardTitleBlock({
  title,
  subtitle,
  layout = 'title-first',
  titleClassName = '',
  subtitleClassName = '',
  titleStyle,
  subtitleStyle,
}: EntityCardTitleBlockProps) {
  if (layout === 'eyebrow-first') {
    return (
      <>
        {subtitle ? (
          <p className={subtitleClassName} style={subtitleStyle}>
            {subtitle}
          </p>
        ) : null}
        <h3 className={titleClassName} style={titleStyle}>
          {title}
        </h3>
      </>
    );
  }

  return (
    <>
      <h3 className={titleClassName} style={titleStyle}>
        {title}
      </h3>
      {subtitle ? (
        <p className={subtitleClassName} style={subtitleStyle}>
          {subtitle}
        </p>
      ) : null}
    </>
  );
}
