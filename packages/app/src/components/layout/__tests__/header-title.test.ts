import { describe, expect, it } from 'vitest';
import { resolveHeaderTitle } from '../header-title';

describe('resolveHeaderTitle', () => {
  it('keeps the automatic greeting by default', () => {
    expect(
      resolveHeaderTitle({
        mode: 'auto_greeting',
        customText: '',
        formattedDate: 'Mon, May 12',
        formattedTime: '13:05',
        greetingText: 'Good afternoon, Jane!',
      })
    ).toEqual({
      secondaryText: null,
      supportingText: null,
      text: 'Good afternoon, Jane!',
      mode: 'auto_greeting',
      showTimeMetadata: true,
    });
  });

  it('uses custom text when it is present', () => {
    expect(
      resolveHeaderTitle({
        mode: 'custom_text',
        customText: '  Movie night  ',
        formattedDate: 'Mon, May 12',
        formattedTime: '13:05',
        greetingText: 'Good afternoon, Jane!',
      })
    ).toEqual({
      secondaryText: null,
      supportingText: null,
      text: 'Movie night',
      mode: 'custom_text',
      showTimeMetadata: true,
    });
  });

  it('falls back to the greeting when custom text is blank', () => {
    expect(
      resolveHeaderTitle({
        mode: 'custom_text',
        customText: '   ',
        formattedDate: 'Mon, May 12',
        formattedTime: '13:05',
        greetingText: 'Good afternoon, Jane!',
      })
    ).toEqual({
      secondaryText: null,
      supportingText: null,
      text: 'Good afternoon, Jane!',
      mode: 'auto_greeting',
      showTimeMetadata: true,
    });
  });

  it('uses the live date and time for date-and-time mode and suppresses duplicate metadata', () => {
    expect(
      resolveHeaderTitle({
        mode: 'clock',
        customText: 'Movie night',
        formattedDate: 'Mon, May 12',
        formattedTime: '13:05',
        greetingText: 'Good afternoon, Jane!',
      })
    ).toEqual({
      secondaryText: null,
      supportingText: null,
      text: 'Mon, May 12 · 13:05',
      mode: 'clock',
      showTimeMetadata: false,
    });
  });
});
