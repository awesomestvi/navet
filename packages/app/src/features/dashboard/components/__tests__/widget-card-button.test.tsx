import { dispatchEditModeSettingsRequest } from '@navet/app/components/shared/edit-mode-settings-request';
import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WidgetCard } from '../widget-card';

describe('WidgetCard button widget', () => {
  it('opens the button settings dialog from the shared edit-mode settings request', async () => {
    renderWithProviders(
      <WidgetCard
        isEditMode
        onUpdate={vi.fn()}
        card={{
          id: 'custom-button',
          type: 'button',
          size: 'medium',
          room: 'Kitchen',
          createdAt: 1,
          data: {
            label: 'Movie Mode',
          },
        }}
      />
    );

    dispatchEditModeSettingsRequest('custom-button');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Button label')).toBeInTheDocument();
  });
});
