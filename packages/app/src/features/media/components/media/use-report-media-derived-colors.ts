import { useEffect } from 'react';

export type MediaDerivedColorsReporter = (backgroundColor: string) => void;

export function useReportMediaDerivedColors(
  onDerivedBackgroundChange: MediaDerivedColorsReporter | undefined,
  backgroundColor: string
) {
  useEffect(() => {
    onDerivedBackgroundChange?.(backgroundColor);
  }, [backgroundColor, onDerivedBackgroundChange]);
}
