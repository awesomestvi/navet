import { useI18n } from '@navet/app/hooks';
import type { CSSProperties, MouseEvent } from 'react';

interface MediaVisualizerButtonProps {
  isPlaying: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: CSSProperties;
}

const BAR_DELAYS = ['0ms', '180ms', '320ms', '120ms'];

export function MediaVisualizerButton({
  isPlaying,
  onClick,
  className = '',
  style,
}: MediaVisualizerButtonProps) {
  const { t } = useI18n();
  return (
    <>
      <button
        type="button"
        aria-label={t('media.openDetails')}
        onClick={onClick}
        className={`flex h-7 w-7 items-center justify-center ${className}`}
        style={style}
      >
        <span className="flex h-5 items-center gap-[3px]">
          {BAR_DELAYS.map((delay, index) => (
            <span
              key={delay}
              data-preserve-animation-duration="true"
              className={`media-visualizer-bar rounded-full bg-current ${
                isPlaying ? 'media-visualizer-bar-active' : ''
              } ${index === 1 ? 'h-5 w-[3px]' : index === 2 ? 'h-3 w-[3px]' : 'h-4 w-[3px]'}`}
              style={{ animationDelay: delay }}
            />
          ))}
        </span>
      </button>

      <style>
        {`
          @keyframes navet-media-visualizer {
            0%, 100% {
              transform: scaleY(0.4);
              opacity: 0.72;
            }
            50% {
              transform: scaleY(1);
              opacity: 1;
            }
          }

          .media-visualizer-bar {
            transform-origin: center;
          }

          .media-visualizer-bar-active {
            animation-name: navet-media-visualizer;
            animation-duration: 920ms !important;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
          }
        `}
      </style>
    </>
  );
}
