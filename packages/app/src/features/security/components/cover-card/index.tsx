import { memo } from 'react';
import { CoverCardContainer } from './container';
import type { CoverCardProps } from './types';

export const CoverCard = memo(function CoverCard(props: CoverCardProps) {
  return <CoverCardContainer {...props} />;
});
