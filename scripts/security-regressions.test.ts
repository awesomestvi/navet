import njsRecordSafety from '../docker/shared/record-safety.js';
import profilePolicy from '../docker/shared/dashboard-profile-policy.js';
import { assertSafeRecord, setOwnRecordValue } from '../packages/core/src/record-safety';
import {
  openHABItemName,
  stripOpenHABNameSuffix,
} from '../packages/provider-openhab/src/openhab-item-state';
import { isValidDevAddonVersion } from './release-surfaces.mjs';
import { decodeHtmlEntities } from './vite-public-media-plugins';
import { inlineElementContents } from './inline-script-csp.mjs';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import boundedFile from '../docker/shared/bounded-file.js';
import { getSpotifyTrackId } from '../packages/app/src/features/media/catalog/media-catalog';

describe('security alert regressions', () => {
  it.each([setOwnRecordValue, njsRecordSafety.setOwnRecordValue])(
    'defines own properties without invoking inherited setters',
    (setValue) => {
      let inheritedSetterCalled = false;
      const record = Object.create({
        set household(_value: unknown) {
          inheritedSetterCalled = true;
        },
      });
      setValue(record, 'household', 42);
      expect(inheritedSetterCalled).toBe(false);
      expect(Object.getOwnPropertyDescriptor(record, 'household')?.value).toBe(42);
      for (const key of ['__proto__', 'constructor', 'prototype']) {
        expect(() => setValue(record, key, {})).toThrow('Unsafe record key');
      }
    }
  );
  it('pins file reads to one descriptor and limits the actual bytes', () => {
    const directory = fs.mkdtempSync(join(tmpdir(), 'navet-security-file-'));
    const file = join(directory, 'record.json');
    const replacement = join(directory, 'replacement.json');
    try {
      fs.writeFileSync(file, 'safe');
      fs.writeFileSync(replacement, 'x'.repeat(100));
      const replacingFs = {
        ...fs,
        openSync(...args: Parameters<typeof fs.openSync>) {
          const descriptor = fs.openSync(...args);
          fs.renameSync(replacement, file);
          return descriptor;
        },
      };
      expect(boundedFile.readBoundedText(replacingFs, file, 8)).toBe('safe');
      expect(() => boundedFile.readBoundedText(fs, file, 8)).toThrow('safe read limit');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects lookalike Spotify hosts and embedded URI substrings', () => {
    const trackId = '1234567890123456789012';
    const item = (mediaContentId: string) =>
      ({ mediaContentId }) as Parameters<typeof getSpotifyTrackId>[0];
    expect(getSpotifyTrackId(item(`https://open.spotify.com/track/${trackId}`))).toBe(trackId);
    expect(getSpotifyTrackId(item(`spotify:track:${trackId}`))).toBe(trackId);
    expect(getSpotifyTrackId(item(`https://evilspotify.com/track/${trackId}`))).toBeNull();
    expect(getSpotifyTrackId(item(`https://attacker.example/spotify/track/${trackId}`))).toBeNull();
  });
  it('finds browser-parsed inline scripts and ignores commented markup and external scripts', () => {
    expect(
      inlineElementContents(
        '<!-- <script>ignored()</script> --><SCRIPT data-test="a>b">run()</SCRIPT ><script src="a.js">ignored()</script>'
      )
    ).toEqual(['run()']);
  });
  it.each([assertSafeRecord, njsRecordSafety.assertSafeRecord])(
    'rejects inherited-property keys and identifiers before chore mutations',
    (validate) => {
      for (const key of ['__proto__', 'constructor', 'prototype']) {
        expect(() => validate(JSON.parse(`{"participantsById":{"${key}":{}}}`))).toThrow(
          'Unsafe record'
        );
        expect(() => validate({ participant: { id: key } })).toThrow('Unsafe record');
        expect(() => validate({ action: { assigneeIds: [key] } })).toThrow('Unsafe record');
      }
      expect(() =>
        validate({ participant: { id: 'maya', displayName: 'constructor' } })
      ).not.toThrow();
    }
  );

  it('does not let imported dashboard records change their output prototype', () => {
    const profile = JSON.parse(
      '{"app":"navet","version":4,"settings":{"customSidebarActions":[{"label":"Safe","__proto__":{"polluted":true}}]},"cardZones":{"__proto__":"living"}}'
    );
    const result = profilePolicy.sanitizeDashboardProfile(profile);
    expect(JSON.stringify(result)).not.toContain('__proto__');
    expect(Object.getPrototypeOf(result.settings.customSidebarActions[0])).toBe(Object.prototype);
  });

  it('decodes HTML entities once and tolerates invalid numeric entities', () => {
    expect(decodeHtmlEntities('&#38;quot; &amp;lt; &#x26;amp;')).toBe('&quot; &lt; &amp;');
    expect(decodeHtmlEntities('&#x110000; &#55296;')).toBe('&#x110000; &#55296;');
    expect(decodeHtmlEntities('&#x1f600; &quot; &#39;')).toBe('😀 " \u0027');
  });

  it('treats release version regex metacharacters literally', () => {
    expect(isValidDevAddonVersion('1x2x3-dev.20261008000000', '1.2.3')).toBe(false);
    expect(isValidDevAddonVersion('123-dev.20261008000000', '.*')).toBe(false);
    expect(isValidDevAddonVersion('1.2.3-dev.20261008000000', '1.2.3')).toBe(true);
  });

  it('handles long provider labels without regex backtracking', () => {
    const label = 'Light' + ' '.repeat(100000) + '[%.1f]';
    expect(openHABItemName({ name: 'light', label } as never)).toBe('Light');
    expect(stripOpenHABNameSuffix('Living room   State', 'state')).toBe('Living room');
    expect(stripOpenHABNameSuffix('Living roomState', 'state')).toBe('Living roomState');
  });
});
