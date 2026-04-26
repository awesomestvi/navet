import type { CardSize } from '@/app/components/shared/card-size-selector';

interface PassageWaveOverlaySvgProps {
  size: CardSize;
  layerOneColor: string;
  layerTwoColor: string;
  layerThreeColor: string;
  rimColor?: string;
  className?: string;
}

export function PassageWaveOverlaySvg({
  size,
  layerOneColor,
  layerTwoColor,
  layerThreeColor,
  rimColor,
  className = '',
}: PassageWaveOverlaySvgProps) {
  const cloudTransform =
    size === 'large'
      ? 'translateY(-24%) scaleY(1)'
      : size === 'medium'
        ? 'translateY(-24%) scaleY(0.94)'
        : 'translateY(-23%) scaleY(0.88)';

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ transform: cloudTransform, transformOrigin: 'center top' }}
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1600 900"
        aria-hidden="true"
        preserveAspectRatio="xMidYMin slice"
      >
        <g transform="translate(0 780) scale(1 -1)">
          <path
            d="M0 346C98 302 192 282 312 290C418 298 514 334 630 348C742 362 844 356 962 322C1086 286 1196 260 1324 274C1422 286 1522 328 1600 362V580H0V346Z"
            fill={layerOneColor}
          />
          <path
            d="M0 416C74 378 150 358 252 376C344 394 410 442 504 472C590 500 674 506 766 490C862 474 944 428 1048 406C1152 384 1256 396 1358 440C1432 472 1514 502 1600 518V700H0V416Z"
            fill={layerTwoColor}
          />
          <path
            d="M0 510C60 476 128 460 208 482C298 506 372 554 464 586C554 616 648 628 746 616C852 604 940 560 1044 520C1146 480 1252 462 1362 490C1442 510 1526 550 1600 576V780H0V510Z"
            fill={layerThreeColor}
          />
          {rimColor ? (
            <path
              d="M0 616C0 616 400 582 798 592C1200 602 1600 616 1600 616V664H0V616Z"
              fill={rimColor}
            />
          ) : null}
        </g>
      </svg>
    </div>
  );
}
