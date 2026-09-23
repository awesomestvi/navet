import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const distDir = path.join(workspaceRoot, 'dist');
const indexPath = path.join(distDir, 'index.html');
const deploymentAssetNames = ['_headers', '_redirects', 'robots.txt', 'sitemap.xml'];
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

for (const assetName of deploymentAssetNames) {
  fs.copyFileSync(path.join(workspaceRoot, assetName), path.join(distDir, assetName));
}

const structuredDataRoutes = [
  { headerPath: '/', htmlPath: indexPath },
  { headerPath: '/roadmap/*', htmlPath: path.join(distDir, 'roadmap', 'index.html') },
];
const headersPath = path.join(distDir, '_headers');
const headerRules = fs.readFileSync(headersPath, 'utf8').split(/\n\n/);

for (const { headerPath, htmlPath } of structuredDataRoutes) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scripts = [
    ...html.matchAll(
      /<script id="navet-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/g
    ),
  ];
  if (scripts.length !== 1) {
    throw new Error(`Expected one structured-data script in ${htmlPath}; found ${scripts.length}`);
  }

  const hash = createHash('sha256').update(scripts[0][1], 'utf8').digest('base64');
  const ruleIndex = headerRules.findIndex((rule) => rule.startsWith(`${headerPath}\n`));
  if (ruleIndex === -1) throw new Error(`Missing CSP rule for ${headerPath}`);

  const scriptDirective = "script-src 'self'";
  if (!headerRules[ruleIndex].includes(scriptDirective)) {
    throw new Error(`Missing script-src directive for ${headerPath}`);
  }
  headerRules[ruleIndex] = headerRules[ruleIndex].replace(
    scriptDirective,
    `${scriptDirective} 'sha256-${hash}'`
  );
}

fs.writeFileSync(headersPath, headerRules.join('\n\n'));

console.log(`Cloned website route entrypoints into ${distDir}`);
