import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/app/i18n/i18n-provider';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { LockCard } from '../lock-card';

const { updateLockMock, toastErrorMock } = vi.hoisted(() => ({
  updateLockMock: vi.fn().mockResolvedValue(undefined),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/app/services/home-assistant.service', async () => {
  const actual = await vi.importActual<typeof import('@/app/services/home-assistant.service')>(
    '@/app/services/home-assistant.service'
  );

  return {
    ...actual,
    homeAssistantService: {
      ...actual.homeAssistantService,
      updateLock: updateLockMock,
    },
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}));

function renderLockCard() {
  return render(
    <I18nProvider>
      <LockCard
        id="lock.front_door"
        name="Front Door"
        initialState
        size="small"
        isEditMode={false}
      />
    </I18nProvider>
  );
}

function setLockEntity(state: 'locked' | 'unlocked') {
  const now = new Date().toISOString();

  homeAssistantStore.setState({
    entities: {
      'lock.front_door': {
        entity_id: 'lock.front_door',
        state,
        attributes: {},
        last_changed: now,
        last_updated: now,
        context: {
          id: 'test-context',
          parent_id: null,
          user_id: null,
        },
      },
    },
  });
}

describe('LockCard', () => {
  beforeEach(() => {
    homeAssistantStore.setState({ entities: null });
    updateLockMock.mockReset();
    updateLockMock.mockResolvedValue(undefined);
    toastErrorMock.mockReset();
  });

  it('shows a loading state until the Home Assistant entity echoes the unlock', async () => {
    setLockEntity('locked');
    renderLockCard();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Slide to unlock' }), { key: ' ' });

    await waitFor(() => expect(updateLockMock).toHaveBeenCalledWith('lock.front_door', 'unlocked'));
    expect(screen.getByText('Unlocking...')).toBeInTheDocument();
    expect(screen.queryByText('Unlocked')).not.toBeInTheDocument();

    act(() => setLockEntity('unlocked'));

    expect(screen.getByText('Unlocked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Slide to lock' })).toBeInTheDocument();
  });

  it('shows the target locked state while waiting for the lock echo', async () => {
    setLockEntity('unlocked');
    renderLockCard();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Slide to lock' }), { key: ' ' });

    await waitFor(() => expect(updateLockMock).toHaveBeenCalledWith('lock.front_door', 'locked'));
    expect(screen.getByText('Locking...')).toBeInTheDocument();
    expect(screen.queryByText('Unlocked')).not.toBeInTheDocument();

    act(() => setLockEntity('locked'));

    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Slide to unlock' })).toBeInTheDocument();
  });

  it('restores the previous state when the lock service fails', async () => {
    updateLockMock.mockRejectedValue(new Error('Unable to update lock'));
    renderLockCard();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Slide to unlock' }), { key: ' ' });

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Unable to update lock'));
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Slide to unlock' })).toBeInTheDocument();
  });
});
