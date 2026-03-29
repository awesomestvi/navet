import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useI18n } from '@/app/hooks';

interface Props {
  children: ReactNode;
  fallbackMessage: string;
}

interface State {
  hasError: boolean;
}

class CardErrorBoundaryBase extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[CardErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/30">{this.props.fallbackMessage}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function CardErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <CardErrorBoundaryBase fallbackMessage={t('common.cardUnavailable')}>
      {children}
    </CardErrorBoundaryBase>
  );
}
