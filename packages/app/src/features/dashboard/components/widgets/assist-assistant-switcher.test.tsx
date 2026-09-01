import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssistAssistantSwitcher } from './assist-assistant-switcher';

describe('AssistAssistantSwitcher', () => {
  it('shows a compact selected logo and branded menu options', async () => {
    const onChange = vi.fn();
    const { container } = renderWithProviders(
      <AssistAssistantSwitcher
        value="navet_ai"
        ariaLabel="Choose assistant"
        homeAssistantLabel="Home Assistant"
        navetAiLabel="Navet Assist"
        onChange={onChange}
      />
    );

    const trigger = screen.getByRole('button', { name: 'Choose assistant: Navet Assist' });
    expect(trigger).toHaveClass('h-9', 'w-9');
    expect(container.querySelector('[data-assistant-logo="navet_ai"]')).toBeInTheDocument();

    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });

    expect(
      (await screen.findByRole('menuitemradio', { name: 'Home Assistant' })).querySelector(
        '[data-assistant-logo="home_assistant"]'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(2);

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Home Assistant' }));
    expect(onChange).toHaveBeenCalledWith('home_assistant');
  });
});
