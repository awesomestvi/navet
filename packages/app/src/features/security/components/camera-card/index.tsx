import { memo } from 'react';
import { CameraCardContainer } from './container';
import type { CameraCardProps } from './types';

export const CameraCard = memo(function CameraCard(props: CameraCardProps) {
  return <CameraCardContainer {...props} />;
});
