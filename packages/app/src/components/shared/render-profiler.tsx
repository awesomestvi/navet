import { Profiler, type ReactNode, useRef } from 'react';

interface RenderProfilerProps {
  id: string;
  children: ReactNode;
  thresholdMs?: number;
  metadata?: Record<string, unknown>;
}

export function RenderProfiler({ id, children, thresholdMs = 12, metadata }: RenderProfilerProps) {
  const commitCountRef = useRef(0);

  if (!import.meta.env.DEV) {
    return children;
  }

  return (
    <Profiler
      id={id}
      onRender={(profileId, phase, actualDuration, baseDuration, startTime, commitTime) => {
        commitCountRef.current += 1;
        if (actualDuration < thresholdMs) {
          return;
        }

        console.debug('[Navet][RenderProfiler]', {
          id: profileId,
          commitCount: commitCountRef.current,
          phase,
          actualDuration: Number(actualDuration.toFixed(2)),
          baseDuration: Number(baseDuration.toFixed(2)),
          startTime: Number(startTime.toFixed(2)),
          commitTime: Number(commitTime.toFixed(2)),
          ...metadata,
        });
      }}
    >
      {children}
    </Profiler>
  );
}
