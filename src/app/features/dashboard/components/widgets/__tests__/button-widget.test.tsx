import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { buttonEntityFixtures } from '@/test/fixtures/home-assistant/entities/button';
import { sceneEntityFixtures } from '@/test/fixtures/home-assistant/entities/scene';
import { renderWithProviders } from '@/test/render';
import { ButtonWidget } from '../button-widget';

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: {
    callService: vi.fn(),
  },
}));

describe('ButtonWidget', () => {
  beforeEach(() => {
    vi.mocked(homeAssistantService.callService).mockReset();
    vi.mocked(homeAssistantService.callService).mockResolvedValue(undefined);
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
      expect(homeAssistantService.callService).toHaveBeenCalledWith(
        'scene',
        'turn_on',
        {},
        { entity_id: sceneEntityFixtures.normal.entity_id }
      );
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
      expect(homeAssistantService.callService).toHaveBeenCalledWith(
        'button',
        'press',
        { volume: 'high' },
        { entity_id: buttonEntityFixtures.normal.entity_id }
      );
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
      expect(homeAssistantService.callService).not.toHaveBeenCalled();
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

    expect(screen.getByText('Action Button')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Button label')).toBeInTheDocument();
  });
});
