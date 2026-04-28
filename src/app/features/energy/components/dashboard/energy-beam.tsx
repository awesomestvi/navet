import { memo } from 'react';

interface EnergyBeamProps {
  id: string;
  path: string;
  color: string;
  railColor: string;
  valueKw: number;
  animated: boolean;
}

function clampBeamWidth(valueKw: number) {
  return Math.max(0.52, Math.min(1.05, 0.44 + valueKw * 0.05));
}

function clampBeamOpacity(valueKw: number) {
  return Math.max(0.74, Math.min(0.96, 0.68 + valueKw * 0.04));
}

export const EnergyBeam = memo(function EnergyBeam({
  id,
  path,
  color,
  railColor,
  valueKw,
  animated,
}: EnergyBeamProps) {
  const width = clampBeamWidth(valueKw);
  const opacity = clampBeamOpacity(valueKw);
  const segmentLength = Math.max(8, Math.min(14, 7 + valueKw * 0.55));
  const segmentGap = Math.max(86, 100 - segmentLength);

  return (
    <g data-testid={`beam-${id}`}>
      <path
        d={path}
        fill="none"
        stroke={railColor}
        strokeOpacity={1}
        strokeWidth={width}
        strokeLinecap="round"
        pathLength={100}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={width + 0.1}
        strokeLinecap="round"
        strokeDasharray={`${segmentLength} ${segmentGap}`}
        strokeDashoffset={animated ? 0 : 18}
        pathLength={100}
        data-animated={animated ? 'true' : 'false'}
      >
        {animated ? (
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-100"
            dur={`${Math.max(3.4, 5.4 - valueKw * 0.18)}s`}
            repeatCount="indefinite"
          />
        ) : null}
      </path>
    </g>
  );
});
