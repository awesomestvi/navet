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

function formatEyebrowSubtitle(value: string | undefined) {
  if (!value) {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  if (!/^[a-z][a-z\s_-]*$/.test(trimmed)) {
    return value;
  }

  return trimmed.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
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
  const formattedSubtitle = formatEyebrowSubtitle(subtitle);

  if (layout === 'eyebrow-first') {
    return (
      <>
        {formattedSubtitle ? (
          <p className={subtitleClassName} style={subtitleStyle}>
            {formattedSubtitle}
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
      {formattedSubtitle ? (
        <p className={subtitleClassName} style={subtitleStyle}>
          {formattedSubtitle}
        </p>
      ) : null}
    </>
  );
}
