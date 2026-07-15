import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const distDir = path.join(workspaceRoot, 'dist');
const indexPath = path.join(distDir, 'index.html');
const routeClones = [
  {
    path: 'roadmap',
    title: 'Navet Roadmap — What is shipping now and next',
    description:
      'See what Navet supports today, what the team is improving next, and where broader smart-home platform support fits.',
    canonicalUrl: 'https://navet.app/roadmap/',
    robots: 'index,follow',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Navet Roadmap',
      url: 'https://navet.app/roadmap/',
      description:
        'See what Navet supports today, what the team is improving next, and where broader smart-home platform support fits.',
      isPartOf: {
        '@type': 'WebSite',
        name: 'Navet',
        url: 'https://navet.app/',
      },
    },
  },
  {
    path: 'redirect/oauth',
    title: 'Connect Spotify · Navet',
    description: 'Complete the local Spotify connection for Navet.',
    canonicalUrl: 'https://navet.app/redirect/oauth/',
    robots: 'noindex,nofollow',
    structuredData: null,
  },
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceMetaContent(html, attribute, key, content) {
  const tagPattern = new RegExp(
    `<meta\\s+[^>]*${attribute}=["']${escapeRegExp(key)}["'][^>]*>`,
    'i'
  );

  return html.replace(tagPattern, (tag) =>
    tag.replace(/content=["'][^"']*["']/i, `content="${content}"`)
  );
}

function applyRouteMetadata(html, route) {
  let routeHtml = html.replace(/<title>.*?<\/title>/i, `<title>${route.title}</title>`);
  routeHtml = replaceMetaContent(routeHtml, 'name', 'description', route.description);
  routeHtml = replaceMetaContent(routeHtml, 'name', 'robots', route.robots);
  routeHtml = replaceMetaContent(routeHtml, 'property', 'og:title', route.title);
  routeHtml = replaceMetaContent(routeHtml, 'property', 'og:description', route.description);
  routeHtml = replaceMetaContent(routeHtml, 'property', 'og:url', route.canonicalUrl);
  routeHtml = replaceMetaContent(routeHtml, 'name', 'twitter:title', route.title);
  routeHtml = replaceMetaContent(routeHtml, 'name', 'twitter:description', route.description);
  routeHtml = routeHtml.replace(
    /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?\s*>/i,
    `<link rel="canonical" href="${route.canonicalUrl}" />`
  );

  const structuredData = route.structuredData
    ? JSON.stringify(route.structuredData, null, 2)
    : '';
  return routeHtml.replace(
    /<script id=["']navet-structured-data["'] type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i,
    structuredData
      ? `<script id="navet-structured-data" type="application/ld+json">\n${structuredData}\n</script>`
      : ''
  );
}

if (!fs.existsSync(indexPath)) {
  throw new Error(`Website index.html is missing: ${indexPath}`);
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');

for (const route of routeClones) {
  const routeDir = path.join(distDir, route.path);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, 'index.html'), applyRouteMetadata(indexHtml, route));
}

console.log(`Cloned website route entrypoints into ${distDir}`);
