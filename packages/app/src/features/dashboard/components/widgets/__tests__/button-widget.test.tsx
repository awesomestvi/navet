import { buttonEntityFixtures } from '@navet/app/test/fixtures/home-assistant/entities/button';
import { sceneEntityFixtures } from '@navet/app/test/fixtures/home-assistant/entities/scene';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ButtonWidget } from '../button-widget';

const { invokeIntegrationNativeActionMock } = vi.hoisted(() => ({
  invokeIntegrationNativeActionMock: vi.fn(),
}));

vi.mock('@navet/app/services/integration-native-action.service', () => ({
  invokeIntegrationNativeAction: invokeIntegrationNativeActionMock,
}));

describe('ButtonWidget', () => {
  beforeEach(() => {
    invokeIntegrationNativeActionMock.mockReset();
    invokeIntegrationNativeActionMock.mockResolvedValue(undefined);
  });

  it('runs the configured Home Assistant action', async () => {
    renderWithProviders(
      <ButtonWidget
        size="small"
        data={{
          label: 'Movie Mode',
          service: 'scene.turn_on',
          entityId: sceneEntityFixtures.normal.entity_id,
          icon: 'Film',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Movie Mode' }));

    await waitFor(() => {
      expect(invokeIntegrationNativeActionMock).toHaveBeenCalledWith({
        entityId: sceneEntityFixtures.normal.entity_id,
        domain: 'scene',
        service: 'turn_on',
        serviceData: {},
      });
    });
  });

  it('passes through additional Home Assistant service data for button-style actions', async () => {
    renderWithProviders(
      <ButtonWidget
        size="small"
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
      expect(invokeIntegrationNativeActionMock).toHaveBeenCalledWith({
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
        size="small"
        data={{
          label: 'Unsafe',
          service: 'javascript:alert(1)',
          entityId: sceneEntityFixtures.normal.entity_id,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Unsafe' }));

    await waitFor(() => {
      expect(invokeIntegrationNativeActionMock).not.toHaveBeenCalled();
    });
  });

  it('does not open the settings dialog just because an unconfigured card mounts', () => {
    const { rerender } = renderWithProviders(
      <ButtonWidget size="small" data={{ label: 'Movie Mode' }} />
    );

    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Tap to set up')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<ButtonWidget size="small" data={{ label: 'Movie Mode' }} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the settings dialog from the unconfigured empty state action', () => {
    renderWithProviders(
      <ButtonWidget size="small" data={{ label: 'Movie Mode' }} onUpdate={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));

    const dialog = screen.getByRole('dialog');

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('Button label')).toBeInTheDocument();
  });

  it('preserves draft field edits while the dialog is open across parent rerenders', () => {
    const onUpdate = vi.fn();
    const view = renderWithProviders(
      <ButtonWidget size="small" data={{ label: 'Movie Mode' }} onUpdate={onUpdate} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));

    const dialog = screen.getByRole('dialog');
    const labelInput = within(dialog).getByPlaceholderText('Button label');

    fireEvent.change(labelInput, { target: { value: 'Evening Scene' } });
    view.rerender(<ButtonWidget size="small" data={{ label: 'Movie Mode' }} onUpdate={onUpdate} />);

    expect(within(dialog).getByDisplayValue('Evening Scene')).toBeInTheDocument();
  });

  it('does not render an in-card settings button for configured action cards', () => {
    renderWithProviders(
      <ButtonWidget
        size="small"
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
    expect(screen.getByRole('button', { name: 'Movie Mode' })).toBeInTheDocument();
  });

  it('uses a full-card tap target for tiny action cards', async () => {
    renderWithProviders(
      <ButtonWidget
        size="tiny"
        data={{
          label: 'Movie Mode',
          service: 'scene.turn_on',
          entityId: sceneEntityFixtures.normal.entity_id,
          icon: 'Film',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Movie Mode' }));

    await waitFor(() => {
      expect(invokeIntegrationNativeActionMock).toHaveBeenCalledWith({
        entityId: sceneEntityFixtures.normal.entity_id,
        domain: 'scene',
        service: 'turn_on',
        serviceData: {},
      });
    });
  });

  it('uses a full-card tap target for extra-small action cards', () => {
    renderWithProviders(
      <ButtonWidget
        size="extra-small"
        data={{
          label: 'Movie Mode',
          service: 'scene.turn_on',
          entityId: sceneEntityFixtures.normal.entity_id,
          icon: 'Film',
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'Movie Mode' })).toBeInTheDocument();
  });

  it('prevents compact action execution while in edit mode', () => {
    renderWithProviders(
      <ButtonWidget
        size="tiny"
        isEditMode
        data={{
          label: 'Movie Mode',
          service: 'scene.turn_on',
          entityId: sceneEntityFixtures.normal.entity_id,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Movie Mode' }));

    expect(invokeIntegrationNativeActionMock).not.toHaveBeenCalled();
  });
});
