import { dispatchEditModeSettingsRequest } from '@navet/app/components/shared/edit-mode-settings-request';
import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WidgetCard } from '../widget-card';

const { buttonWidgetMock } = vi.hoisted(() => ({
  buttonWidgetMock: vi.fn(),
}));

vi.mock('../widgets/button-widget', () => ({
  ButtonWidget: (props: unknown) => {
    buttonWidgetMock(props);
    return <button type="button">widget</button>;
  },
}));

describe('WidgetCard button widget', () => {
  it('opens the button settings dialog from the shared edit-mode settings request', async () => {
    renderWithProviders(
      <WidgetCard
        isEditMode
        onUpdate={vi.fn()}
        card={{
          id: 'custom-button',
          type: 'button',
          size: 'small',
          room: 'Kitchen',
          createdAt: 1,
          data: {
            label: 'Movie Mode',
          },
        }}
      />
    );

    expect(await screen.findByRole('button', { name: 'widget' })).toBeInTheDocument();
    expect(buttonWidgetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 'small',
      })
    );

    dispatchEditModeSettingsRequest('custom-button');
  });
});
