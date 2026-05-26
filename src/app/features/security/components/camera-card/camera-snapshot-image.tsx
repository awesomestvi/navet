import { useEffect, useState } from 'react';

interface CameraSnapshotImageProps {
  src: string;
  alt: string;
  className: string;
  onError: () => void;
}

export function CameraSnapshotImage({ src, alt, className, onError }: CameraSnapshotImageProps) {
  const [displayedSrc, setDisplayedSrc] = useState(src);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setDisplayedSrc(src);
      setPendingSrc(null);
      return;
    }

    if (!displayedSrc) {
      setDisplayedSrc(src);
      setPendingSrc(null);
      return;
    }

    if (src === displayedSrc) {
      setPendingSrc(null);
      return;
    }

    setPendingSrc(src);
  }, [displayedSrc, src]);

  return (
    <>
      {displayedSrc ? (
        <img
          src={displayedSrc}
          alt={alt}
          className={className}
          draggable={false}
          onError={onError}
        />
      ) : null}
      {pendingSrc ? (
        <img
          src={pendingSrc}
          alt=""
          aria-hidden="true"
          className="hidden"
          draggable={false}
          onLoad={() => {
            setDisplayedSrc(pendingSrc);
            setPendingSrc(null);
          }}
          onError={onError}
        />
      ) : null}
    </>
  );
}
