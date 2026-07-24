import { describe, expect, it } from 'vitest';
import { getLocaleForLanguage, resolveAppLanguage } from '../config';
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

  it.each([
    ['no', 'Avbryt'],
    ['da', 'Annuller'],
    ['fi', 'Peruuta'],
  ] as const)('loads and caches the %s dictionary on demand', async (language, cancelLabel) => {
    const messages = await loadMessages(language);

    expect(messages['common.cancel']).toBe(cancelLabel);
    expect(getLoadedMessages(language)).toBe(messages);
  });

  it.each([
    ['no', 'nb-NO'],
    ['da', 'da-DK'],
    ['fi', 'fi-FI'],
  ] as const)('uses the expected locale for %s', (language, locale) => {
    expect(getLocaleForLanguage(language)).toBe(locale);
  });

  it('recognizes the Norwegian Bokmål browser locale', () => {
    expect(resolveAppLanguage('nb-NO')).toBe('no');
  });
});
