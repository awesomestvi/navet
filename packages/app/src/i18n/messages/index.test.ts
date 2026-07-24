import { describe, expect, it } from 'vitest';
import { getLoadedMessages, loadMessages } from '.';

describe('locale message loading', () => {
  it('loads and caches non-default dictionaries on demand', async () => {
    const messages = await loadMessages('sv');

    expect(messages['common.cancel']).toBe('Avbryt');
    expect(getLoadedMessages('sv')).toBe(messages);
  });

  it('loads the Dutch dictionary on demand', async () => {
    const messages = await loadMessages('nl');

    expect(messages['common.cancel']).toBe('Annuleer');
    expect(getLoadedMessages('nl')).toBe(messages);
  });

  it('loads the Polish dictionary on demand', async () => {
    const messages = await loadMessages('pl');

    expect(messages['common.cancel']).toBe('Anuluj');
    expect(getLoadedMessages('pl')).toBe(messages);
  });
});
