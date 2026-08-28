import { describe, expect, it } from 'vitest';
import { getSmallLightActionLayout } from '../light-card-small';

describe('getSmallLightActionLayout', () => {
  it('keeps compact light-card action rows within three controls', () => {
    expect(
      getSmallLightActionLayout({
        brightnessPresetCount: 3,
        inlineControlCount: 0,
        showSettingsButton: true,
      })
    ).toEqual({
      presetMaxVisible: 1,
      presetOverflow: 'menu',
    });

    expect(
      getSmallLightActionLayout({
        brightnessPresetCount: 3,
        inlineControlCount: 1,
        showSettingsButton: true,
      })
    ).toEqual({
      presetMaxVisible: 0,
      presetOverflow: 'menu',
    });
  });

  it('hides brightness shortcuts when color controls and settings use every slot', () => {
    expect(
      getSmallLightActionLayout({
        brightnessPresetCount: 3,
        inlineControlCount: 2,
        showSettingsButton: true,
      })
    ).toEqual({
      presetMaxVisible: 0,
      presetOverflow: 'hide',
    });
  });

  it('shows presets directly when the compact row has enough space', () => {
    expect(
      getSmallLightActionLayout({
        brightnessPresetCount: 3,
        inlineControlCount: 0,
        showSettingsButton: false,
      })
    ).toEqual({
      presetMaxVisible: 3,
      presetOverflow: 'hide',
    });
  });
});
