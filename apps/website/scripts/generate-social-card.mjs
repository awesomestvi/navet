import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const backgroundPath = path.join(
  repoRoot,
  'assets/reference/marketing/use-cases/navet-hero-background-room.png'
);
const dashboardPath = path.join(
  repoRoot,
  'assets/reference/marketing/use-cases/navet-hero-dashboard-overlay.png'
);
const logoPath = path.join(repoRoot, 'assets/public/logo-horizontal-light.svg');
const outputPath = path.join(repoRoot, 'assets/public/navet-social-card.jpg');

const dashboard = await sharp(dashboardPath).resize({ width: 620 }).png().toBuffer();
const logo = await sharp(logoPath).resize({ width: 180 }).png().toBuffer();

const treatment = Buffer.from(`
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#06080d" stop-opacity="0.96" />
        <stop offset="0.48" stop-color="#06080d" stop-opacity="0.82" />
        <stop offset="0.78" stop-color="#06080d" stop-opacity="0.24" />
        <stop offset="1" stop-color="#06080d" stop-opacity="0.08" />
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ff9b3f" />
        <stop offset="1" stop-color="#ffd18a" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#shade)" />
    <g font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" font-weight="700" font-size="56" letter-spacing="-3.35">
      <text x="72" y="226" fill="#ffffff">A calmer</text>
      <text x="72" y="286" fill="#ffffff">dashboard for</text>
      <text x="72" y="346" fill="url(#accent)">your smart home.</text>
    </g>
    <text x="74" y="407" fill="#ffffff" fill-opacity="0.75" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" font-size="21">Local-first · Home Assistant · Homey · openHAB</text>
    <text x="74" y="447" fill="#ffffff" fill-opacity="0.54" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" font-size="19">Wall panels, tablets, desktops, and phones.</text>
  </svg>
`);

await sharp(backgroundPath)
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .composite([
    { input: treatment, left: 0, top: 0 },
    { input: dashboard, left: 570, top: 112 },
    { input: logo, left: 70, top: 55 },
  ])
  .jpeg({ quality: 88, progressive: true, chromaSubsampling: '4:4:4' })
  .toFile(outputPath);

console.log(`Generated ${outputPath}`);
