import type { ReactNode } from 'react';

export function EntityCardStoryFrame({ children }: { children: ReactNode }) {
  return <div className="h-55 w-90">{children}</div>;
}

export function noopCardSizeChange() {
  return;
}
