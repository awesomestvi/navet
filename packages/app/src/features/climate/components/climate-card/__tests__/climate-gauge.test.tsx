import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClimateGauge } from '../climate-gauge';

const rotaryKnobSpy = vi.fn();

vi.mock('@navet/app/components/primitives', () => ({
  RotaryKnob: (props: Record<string, unknown>) => {
    rotaryKnobSpy(props);
    return <div data-testid="rotary-knob" />;
  },
}));

describe('ClimateGauge', () => {
  it('uses the Climate mode palette for docked fan gauge bands', () => {
    renderWithProviders(
      <ClimateGauge
        id="climate.hallway"
        mode="fan"
        targetTemp={21}
        currentTemp={21}
        isOn
        variant="docked-card"
      />
    );

    expect(screen.getByTestId('rotary-knob')).toBeInTheDocument();
    expect(rotaryKnobSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        bandPrimaryColor: '#22c55e',
        bandSecondaryColor: '#4ade80',
      })
    );
  });
});
