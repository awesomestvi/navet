import { getSettingsSectionStyles } from '@navet/app/features/settings/hooks/settings-section-styles';
import { renderWithProviders } from '@navet/app/test/render';
import type { ProviderHubFeatureService, ProviderHubSnapshot } from '@navet/core/provider-hub';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProviderHubDialog } from '../provider-hub-dialog';

function setup() {
  const snapshot: ProviderHubSnapshot = {
    sections: {
      devices: [
        {
          id: 'homey:lamp',
          name: 'Lamp',
          available: true,
          controls: [
            {
              id: 'dim',
              name: 'Brightness',
              type: 'number',
              value: 0.4,
              min: 0,
              max: 1,
              writable: true,
            },
          ],
        },
      ],
      rooms: [],
      installations: [],
      automations: [{ id: 'homey:flow/night', name: 'Night', available: true, runnable: true }],
      scenes: [],
      people: [],
      notifications: [],
      apps: [],
      history: [],
    },
    errors: {},
  };
  const service: ProviderHubFeatureService = {
    getSnapshot: vi.fn(async () => snapshot),
    refresh: vi.fn(async () => snapshot),
    subscribe: vi.fn(() => () => {}),
    run: vi.fn(async () => {}),
    setFavorite: vi.fn(async () => {}),
    setControl: vi.fn(async () => {}),
    getHistory: vi.fn(async () => []),
  };
  renderWithProviders(
    <ProviderHubDialog
      name="Homey"
      service={service}
      styles={getSettingsSectionStyles('dark', 'yellow')}
      onClose={vi.fn()}
    />
  );
  return service;
}

describe('provider resource controls', () => {
  it('shows progress, prevents duplicate runs and reports completion', async () => {
    const service = setup();
    await screen.findByText('Lamp');
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), {
      target: { value: 'automations' },
    });
    let finish!: () => void;
    vi.mocked(service.run).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const run = screen.getByRole('button', { name: 'Run' });
    fireEvent.click(run);
    fireEvent.click(run);
    expect(run).toBeDisabled();
    expect(service.run).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(await screen.findByText('Started Night')).toBeVisible();
    expect(run).toBeEnabled();
  });

  it('keeps failed actions visible with a retry', async () => {
    const service = setup();
    await screen.findByText('Lamp');
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), {
      target: { value: 'automations' },
    });
    vi.mocked(service.run).mockRejectedValueOnce(new Error('Homey is offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Homey is offline');
    expect(screen.getByRole('heading', { name: 'Homey details' })).toBeVisible();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findByText('Started Night')).toBeVisible();
  });

  it('validates numeric values before issuing device commands', async () => {
    const service = setup();
    await screen.findByText('Lamp');
    fireEvent.click(screen.getByRole('button', { name: 'Controls for Lamp' }));
    const input = screen.getByRole('spinbutton', { name: 'Lamp: Brightness' });
    fireEvent.change(input, { target: { value: '2' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(service.setControl).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '0.7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(service.setControl).toHaveBeenCalledWith('homey:lamp', 'dim', 0.7));
  });
});
