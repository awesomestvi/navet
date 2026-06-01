import { buttonEntityFixtures } from '@navet/app/test/fixtures/home-assistant/entities/button';
import { sceneEntityFixtures } from '@navet/app/test/fixtures/home-assistant/entities/scene';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ButtonWidget } from '../button-widget';

const { callIntegrationServiceMock } = vi.hoisted(() => ({
  callIntegrationServiceMock: vi.fn(),
}));

vi.mock('@navet/app/services/integration-service-call.service', () => ({
  callIntegrationService: callIntegrationServiceMock,
}));

describe('ButtonWidget', () => {
  beforeEach(() => {
    callIntegrationServiceMock.mockReset();
    callIntegrationServiceMock.mockResolvedValue(undefined);
  });

  it('runs the configured Home Assistant action without bubbling to the card container', async () => {
    const onCardClick = vi.fn();

    renderWithProviders(
      <button aria-label="Card container" type="button" onClick={onCardClick}>
        <ButtonWidget
          data={{
            label: 'Movie Mode',
            service: 'scene.turn_on',
            entityId: sceneEntityFixtures.normal.entity_id,
            icon: 'Film',
          }}
        />
      </button>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Movie Mode' }));

    await waitFor(() => {
      expect(callIntegrationServiceMock).toHaveBeenCalledWith({
        entityId: sceneEntityFixtures.normal.entity_id,
        domain: 'scene',
        service: 'turn_on',
        serviceData: {},
      });
    });
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('passes through additional Home Assistant service data for button-style actions', async () => {
    renderWithProviders(
      <ButtonWidget
        data={{
          label: 'Doorbell Chime',
          service: 'button.press',
          entityId: buttonEntityFixtures.normal.entity_id,
          serviceData: { volume: 'high' },
          icon: 'Bell',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Doorbell Chime' }));

    await waitFor(() => {
      expect(callIntegrationServiceMock).toHaveBeenCalledWith({
        entityId: buttonEntityFixtures.normal.entity_id,
        domain: 'button',
        service: 'press',
        serviceData: { volume: 'high' },
      });
    });
  });

  it('ignores malformed service definitions instead of issuing invalid Home Assistant calls', async () => {
    renderWithProviders(
      <ButtonWidget
        data={{
          label: 'Unsafe',
          service: 'javascript:alert(1)',
          entityId: sceneEntityFixtures.normal.entity_id,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Unsafe' }));

    await waitFor(() => {
      expect(callIntegrationServiceMock).not.toHaveBeenCalled();
    });
  });

  it('does not open the settings dialog just because an unconfigured card mounts', () => {
    const { rerender } = renderWithProviders(<ButtonWidget data={{ label: 'Movie Mode' }} />);

    expect(screen.getByText('Action Button')).toBeInTheDocument();
    expect(screen.getByText('Tap to set up')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<ButtonWidget data={{ label: 'Movie Mode' }} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the settings dialog from the unconfigured empty state action', () => {
    renderWithProviders(<ButtonWidget data={{ label: 'Movie Mode' }} onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));

    const dialog = screen.getByRole('dialog');

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('Button label')).toBeInTheDocument();
  });

  it('preserves draft field edits while the dialog is open across parent rerenders', () => {
    const onUpdate = vi.fn();
    const view = renderWithProviders(
      <ButtonWidget data={{ label: 'Movie Mode' }} onUpdate={onUpdate} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));

    const dialog = screen.getByRole('dialog');
    const labelInput = within(dialog).getByPlaceholderText('Button label');

    fireEvent.change(labelInput, { target: { value: 'Evening Scene' } });
    view.rerender(<ButtonWidget data={{ label: 'Movie Mode' }} onUpdate={onUpdate} />);

    expect(within(dialog).getByDisplayValue('Evening Scene')).toBeInTheDocument();
  });

  it('does not render an in-card settings button for configured action cards', () => {
    renderWithProviders(
      <ButtonWidget
        data={{
          label: 'Movie Mode',
          service: 'scene.turn_on',
          entityId: sceneEntityFixtures.normal.entity_id,
          icon: 'Film',
        }}
        onUpdate={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Configure' })).not.toBeInTheDocument();
  });
});
