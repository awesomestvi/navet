import {
  type RenderHookOptions,
  type RenderOptions,
  render,
  renderHook,
} from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { I18nProvider } from '@/app/i18n/i18n-provider';

function TestProviders({ children }: PropsWithChildren) {
  return <I18nProvider>{children}</I18nProvider>;
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: TestProviders,
    ...options,
  });
}

export function renderHookWithProviders<Result, Props>(
  renderCallback: (initialProps: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, 'wrapper'>
) {
  return renderHook(renderCallback, {
    wrapper: TestProviders,
    ...options,
  });
}
