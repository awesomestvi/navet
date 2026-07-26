const videoFitClassNames = {
  contain: 'object-contain',
  cover: 'object-cover',
} as const;

export function CameraStreamLoadingIndicator({
  label,
  posterUrl,
  fitMode,
}: {
  label: string;
  posterUrl: string | undefined;
  fitMode: 'cover' | 'contain';
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden bg-black">
      {posterUrl ? (
        <img
          src={posterUrl}
          alt=""
          aria-hidden="true"
          className={`h-full w-full ${videoFitClassNames[fitMode]}`}
        />
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center bg-black/24">
        <div
          role="status"
          aria-label={label}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-black/55 backdrop-blur-md"
        >
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/28 border-t-white motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
