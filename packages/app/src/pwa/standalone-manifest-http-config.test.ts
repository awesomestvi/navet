import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const MANIFEST_CONFIGS = [
  'docker/nginx.conf',
  'docker/nginx.no-proxy.conf',
  'docker/nginx.proxy.conf.template',
  'platform/home-assistant/addons/navet/rootfs/etc/nginx/http.d/default.conf',
];

describe.each(MANIFEST_CONFIGS)('%s', (relativePath) => {
  it('serves the stable web manifest with its correct MIME type and revalidation', () => {
    const source = readFileSync(relativePath, 'utf8');
    const manifestLocation = source.match(
      /location = \/site\.webmanifest \{([\s\S]*?)\n\s*\}/
    )?.[1];

    expect(manifestLocation).toBeDefined();
    expect(manifestLocation).toContain('default_type application/manifest+json;');
    expect(manifestLocation).toContain('add_header Cache-Control "no-cache" always;');
    expect(manifestLocation).toContain('try_files $uri =404;');
    expect(manifestLocation).not.toContain('immutable');
  });
});
