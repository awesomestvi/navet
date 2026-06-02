import type { ImgHTMLAttributes } from 'react';

export type MarketingResponsiveImageSource = {
  srcSet: string;
  type: 'image/avif' | 'image/webp';
};

type MarketingResponsiveImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  sources?: readonly MarketingResponsiveImageSource[];
  pictureClassName?: string;
};

export function MarketingResponsiveImage({
  src,
  sources,
  pictureClassName,
  alt,
  ...imgProps
}: MarketingResponsiveImageProps) {
  const filteredSources = sources?.filter((source) => Boolean(source.srcSet)) ?? [];

  if (filteredSources.length === 0) {
    return <img src={src} alt={alt} {...imgProps} />;
  }

  return (
    <picture className={pictureClassName}>
      {filteredSources.map((source) => (
        <source key={`${source.type}:${source.srcSet}`} srcSet={source.srcSet} type={source.type} />
      ))}
      <img src={src} alt={alt} {...imgProps} />
    </picture>
  );
}
