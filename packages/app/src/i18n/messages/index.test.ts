import { describe, expect, it } from 'vitest';
import { getLoadedMessages, loadMessages } from '.';

describe('locale message loading', () => {
  it('loads and caches non-default dictionaries on demand', async () => {
    const messages = await loadMessages('sv');

    expect(messages['common.cancel']).toBe('Avbryt');
    expect(getLoadedMessages('sv')).toBe(messages);
  });
});
