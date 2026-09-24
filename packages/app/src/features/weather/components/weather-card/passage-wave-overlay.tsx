import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { EffectsQuality } from '@navet/app/stores/settings-store';

interface PassageWaveOverlaySvgProps {
  size: CardSize;
  layerOneColor: string;
  layerTwoColor: string;
  layerThreeColor: string;
  rimColor?: string;
  className?: string;
  effectsQuality: EffectsQuality;
}

const FAR_CLOUD_PATH =
  'M0 346C110 346 190 282 312 290C418 298 514 334 630 348C742 362 844 356 962 322C1086 286 1196 260 1324 274C1422 286 1500 346 1600 346V580H0V346Z';
const MIDDLE_CLOUD_PATH =
  'M0 416C90 416 150 358 252 376C344 394 410 442 504 472C590 500 674 506 766 490C862 474 944 428 1048 406C1152 384 1256 396 1358 440C1432 472 1510 416 1600 416V700H0V416Z';
const NEAR_CLOUD_PATH =
  'M0 510C80 510 128 460 208 482C298 506 372 554 464 586C554 616 648 628 746 616C852 604 940 560 1044 520C1146 480 1252 462 1362 490C1442 510 1520 510 1600 510V780H0V510Z';
const CLOUD_RIM_PATH = 'M0 616C0 616 400 582 798 592C1200 602 1600 616 1600 616V664H0V616Z';

export function PassageWaveOverlaySvg({
  size,
  layerOneColor,
  layerTwoColor,
  layerThreeColor,
  rimColor,
  className = '',
  effectsQuality,
}: PassageWaveOverlaySvgProps) {
  const cloudTransform =
    size === 'large'
      ? 'translateY(-24%) scaleY(1)'
      : size === 'medium'
        ? 'translateY(-30%) scaleY(0.94)'
        : 'translateY(-23%) scaleY(0.88)';
  const cloudMotionClassName =
    effectsQuality === 'low'
      ? undefined
      : 'motion-safe:[animation-name:navet-weather-cloud-loop] motion-safe:[animation-timing-function:linear] motion-safe:[animation-iteration-count:infinite] motion-safe:will-change-transform [transform-box:view-box]';
  // The parent SVG group flips the Y axis, so the first path renders as the
  // lower foreground silhouette and the last path renders farthest back.
  const frontCloudDuration = effectsQuality === 'high' ? '64s' : '96s';
  const middleCloudDuration = effectsQuality === 'high' ? '100s' : '150s';
  const rearCloudDuration = effectsQuality === 'high' ? '240s' : '320s';

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
        data-weather-cloud-motion-quality={
          effectsQuality === 'high' ? 'full' : effectsQuality === 'medium' ? 'reduced' : 'off'
        }
      >
        <g transform="translate(0 780) scale(1 -1)">
          <g
            className={cloudMotionClassName}
            data-weather-cloud-depth="front"
            style={{ animationDuration: frontCloudDuration }}
          >
            <path d={FAR_CLOUD_PATH} fill={layerOneColor} />
            <path d={FAR_CLOUD_PATH} fill={layerOneColor} transform="translate(1600 0)" />
          </g>
          <g
            className={cloudMotionClassName}
            data-weather-cloud-depth="middle"
            style={{ animationDuration: middleCloudDuration }}
          >
            <path d={MIDDLE_CLOUD_PATH} fill={layerTwoColor} />
            <path d={MIDDLE_CLOUD_PATH} fill={layerTwoColor} transform="translate(1600 0)" />
          </g>
          <g
            className={cloudMotionClassName}
            data-weather-cloud-depth="rear"
            style={{ animationDuration: rearCloudDuration }}
          >
            <path d={NEAR_CLOUD_PATH} fill={layerThreeColor} />
            <path d={NEAR_CLOUD_PATH} fill={layerThreeColor} transform="translate(1600 0)" />
            {rimColor ? (
              <>
                <path d={CLOUD_RIM_PATH} fill={rimColor} />
                <path d={CLOUD_RIM_PATH} fill={rimColor} transform="translate(1600 0)" />
              </>
            ) : null}
          </g>
        </g>
      </svg>
    </div>
  );
}
