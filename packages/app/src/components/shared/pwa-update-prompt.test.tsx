import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type ToastOptions = {
  action?: { onClick?: () => void };
  cancel?: { onClick?: () => void };
};

const promptHarness = vi.hoisted(() => ({
  applyUpdate: vi.fn(async () => {}),
  dismissToast: vi.fn(),
  snoozeUpdate: vi.fn(),
  toast: vi.fn(),
  toastOptions: null as ToastOptions | null,
}));

vi.mock('@navet/app/hooks', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@navet/app/pwa/pwa-update-store', () => ({
  applyPwaUpdate: promptHarness.applyUpdate,
  snoozePwaUpdate: promptHarness.snoozeUpdate,
  usePwaUpdateState: () => ({ updateAvailable: true }),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(
    (_title: string, options: ToastOptions) => {
      promptHarness.toast(_title, options);
      promptHarness.toastOptions = options;
      return 42;
    },
    { dismiss: promptHarness.dismissToast }
  ),
}));

import { PwaUpdatePrompt } from './pwa-update-prompt';

describe('PWA update prompt', () => {
  beforeEach(() => {
    promptHarness.applyUpdate.mockClear();
    promptHarness.dismissToast.mockClear();
    promptHarness.snoozeUpdate.mockClear();
    promptHarness.toast.mockClear();
    promptHarness.toastOptions = null;
  });

  it('applies an update now or snoozes Later through the bounded store action', async () => {
    render(<PwaUpdatePrompt />);
    await waitFor(() => expect(promptHarness.toast).toHaveBeenCalledOnce());

    promptHarness.toastOptions?.action?.onClick?.();
    expect(promptHarness.applyUpdate).toHaveBeenCalledOnce();

    promptHarness.toastOptions?.cancel?.onClick?.();
    expect(promptHarness.snoozeUpdate).toHaveBeenCalledOnce();
  });
});
