import { memo } from 'react';
import { RSSFeedCardContainer } from './container';
import type { RSSFeedCardProps } from './types';

export const RSSFeedCard = memo(function RSSFeedCard(props: RSSFeedCardProps) {
  return <RSSFeedCardContainer {...props} />;
});
