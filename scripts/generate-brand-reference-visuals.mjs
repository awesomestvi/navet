#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ArrowDown,
  CircleAlert,
  CircleCheck,
  CircleX,
  Disc3,
  Info,
  Lightbulb,
  TriangleAlert,
} from 'lucide-react';
import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..');
const mediaDirectory = path.join(repoRoot, 'docs/branding/media');

const paths = {
  logo: path.join(repoRoot, 'assets/public/logo.svg'),
  logoHorizontal: path.join(repoRoot, 'assets/public/logo-horizontal.svg'),
  logoHorizontalLight: path.join(repoRoot, 'assets/public/logo-horizontal-light.svg'),
  homeAssistant: path.join(repoRoot, 'packages/app/src/assets/providers/home-assistant.svg'),
  demoHome: path.join(
    repoRoot,
    'assets/reference/marketing/screenshots/navet-ipad-landscape-home.jpg'
  ),
};

function dataUri(mimeType, bytes) {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`;
}

function image(href, x, y, width, height, extra = '') {
  return `<image href="${href}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" ${extra}/>`;
}

function lucide(Icon, x, y, size, color = '#ffffff', strokeWidth = 1.8) {
  const markup = renderToStaticMarkup(
    createElement(Icon, {
      width: size,
      height: size,
      color,
      strokeWidth,
      'aria-hidden': true,
    })
  );
  return `<g transform="translate(${x} ${y})">${markup}</g>`;
}

function documentShell({ width, height, title, description, metadata, body }) {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">${description}</desc>
  <metadata>${metadata}</metadata>
  <defs>
    <clipPath id="canvasClip"><rect width="${width}" height="${height}"/></clipPath>
    <linearGradient id="darkCanvas" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0b0f17"/>
      <stop offset="1" stop-color="#06080d"/>
    </linearGradient>
    <linearGradient id="lightCanvas" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fafaf9"/>
      <stop offset="1" stop-color="#f2f1ee"/>
    </linearGradient>
    <linearGradient id="navetOrange" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#f97316"/>
      <stop offset="1" stop-color="#ea580c"/>
    </linearGradient>
    <filter id="softShadow" x="-15%" y="-20%" width="130%" height="150%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#000000" flood-opacity="0.24"/>
    </filter>
    <style>
      text { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .eyebrow { font-size: 11px; font-weight: 720; letter-spacing: 0.9px; }
      .label { font-size: 15px; font-weight: 680; }
      .detail { font-size: 12px; font-weight: 470; }
      .micro { font-size: 10px; font-weight: 680; letter-spacing: 0.45px; }
    </style>
  </defs>
  <g clip-path="url(#canvasClip)">
${body}
  </g>
</svg>
`;
}

function annotation({ number, x, y, title, detail, align = 'left' }) {
  const circleX = align === 'left' ? x + 16 : x + 160;
  const textX = align === 'left' ? x + 42 : x;
  return `<g>
    <circle cx="${circleX}" cy="${y + 16}" r="15" fill="#172554" stroke="#3b82f6"/>
    <text x="${circleX}" y="${y + 20}" class="micro" fill="#bfdbfe" text-anchor="middle">${number}</text>
    <text x="${textX}" y="${y + 12}" class="label" fill="#ffffff">${title}</text>
    <text x="${textX}" y="${y + 32}" class="detail" fill="#a1a1aa">${detail}</text>
  </g>`;
}

async function generateCardAnatomy() {
  const cardPng = await sharp(paths.demoHome)
    .extract({ left: 541, top: 226, width: 430, height: 176 })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const cardUri = dataUri('image/png', cardPng);

  const body = `    <rect width="1200" height="720" fill="url(#darkCanvas)"/>
    <circle cx="1070" cy="40" r="250" fill="#2563eb" fill-opacity="0.07"/>
    <circle cx="90" cy="0" r="210" fill="#f97316" fill-opacity="0.06"/>

    <text x="64" y="58" fill="#ffffff" font-size="30" font-weight="680" letter-spacing="-0.8">Product card anatomy</text>
    <text x="64" y="86" fill="#a1a1aa" font-size="15">The demo Home card is the reference. This specimen is the implemented component, not a redraw.</text>
    <g transform="translate(925 43)">
      <rect width="211" height="34" rx="17" fill="#11151d" stroke="#30343d"/>
      <circle cx="18" cy="17" r="4" fill="#f97316"/>
      <text x="30" y="21" class="micro" fill="#d4d4d8">EXACT PRODUCT CAPTURE</text>
    </g>

    <text x="280" y="151" class="eyebrow" fill="#71717a">DEMO / HOME · MAIN FLOOR CLIMATE</text>
    <g filter="url(#softShadow)">
      <rect x="268" y="172" width="664" height="288" rx="26" fill="#09090b" stroke="#30343d"/>
      ${image(cardUri, 280, 184, 640, 262, 'style="image-rendering:auto"')}
    </g>

    ${annotation({ number: '01', x: 64, y: 190, title: 'Identity', detail: 'Object and place' })}
    ${annotation({ number: '02', x: 64, y: 315, title: 'Live state', detail: 'The answer now' })}
    ${annotation({ number: '03', x: 976, y: 220, title: 'Context', detail: 'Useful interpretation', align: 'right' })}
    ${annotation({ number: '04', x: 976, y: 350, title: 'Actions', detail: 'Obvious and tactile', align: 'right' })}

    <g stroke="#64748b" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M224 206H246L300 218H332"/>
      <path d="M224 331H250L300 321H327"/>
      <path d="M976 236H950L910 338H880"/>
      <path d="M976 366H950L900 405H842"/>
    </g>
    <g fill="#60a5fa">
      <circle cx="332" cy="218" r="4"/>
      <circle cx="327" cy="321" r="4"/>
      <circle cx="880" cy="338" r="4"/>
      <circle cx="842" cy="405" r="4"/>
    </g>

    <g transform="translate(268 492)">
      <rect width="664" height="76" rx="20" fill="#10131a" stroke="#f59e0b" stroke-opacity="0.55"/>
      <rect x="18" y="18" width="40" height="40" rx="13" fill="#422006" stroke="#f59e0b"/>
      ${lucide(CircleAlert, 27, 27, 22, '#fbbf24')}
      <text x="76" y="31" class="label" fill="#fde68a">Exceptions appear only when something is genuinely wrong</text>
      <text x="76" y="52" class="detail" fill="#a1a1aa">This healthy demo state has no invented alert, badge, or warning treatment.</text>
    </g>

    <g transform="translate(64 605)">
      <rect width="1072" height="58" rx="18" fill="#0f1219" stroke="#282c34"/>
      <text x="22" y="23" class="micro" fill="#fdba74">READING ORDER</text>
      <text x="22" y="43" fill="#d4d4d8" font-size="12" font-weight="570">Identity → current state → real exception → common action → secondary detail</text>
    </g>
    <text x="64" y="697" class="detail" fill="#71717a">Source: maintained demo Home screenshot · component: ClimateCard · Storybook: Cards/Entity/Climate → Medium</text>`;

  return documentShell({
    width: 1200,
    height: 720,
    title: 'Navet product card anatomy',
    description:
      'The exact Main floor climate card from the maintained Navet demo Home screenshot, annotated with identity, live state, context, actions, and conditional exception guidance.',
    metadata:
      'Generated from assets/reference/marketing/screenshots/navet-ipad-landscape-home.jpg. UI is the implemented ClimateCard; no card geometry or icon has been redrawn.',
    body,
  });
}

async function generateLogoSystem(assets) {
  const logoUri = dataUri('image/svg+xml', assets.logo);
  const horizontalUri = dataUri('image/svg+xml', assets.logoHorizontal);
  const horizontalLightUri = dataUri('image/svg+xml', assets.logoHorizontalLight);

  const body = `    <rect width="1200" height="620" fill="url(#lightCanvas)"/>
    <circle cx="1120" cy="26" r="230" fill="#f97316" fill-opacity="0.045"/>
    <text x="64" y="60" fill="#18181b" font-size="30" font-weight="680" letter-spacing="-0.8">Logo system</text>
    <text x="64" y="88" fill="#57534e" font-size="15">Use the supplied SVG masters unchanged. Background determines the wordmark variant.</text>
    <g transform="translate(966 43)">
      <rect width="170" height="34" rx="17" fill="#fff7ed" stroke="#fed7aa"/>
      <circle cx="18" cy="17" r="4" fill="#f97316"/>
      <text x="30" y="21" class="micro" fill="#9a3412">EMBEDDED MASTERS</text>
    </g>

    <g filter="url(#softShadow)">
      <rect x="64" y="122" width="516" height="254" rx="26" fill="#ffffff" stroke="#e7e5e4"/>
      <rect x="620" y="122" width="516" height="254" rx="26" fill="#0b0f17" stroke="#27272a"/>
    </g>
    <text x="96" y="158" class="eyebrow" fill="#9a3412">LIGHT NEUTRAL</text>
    <text x="96" y="181" class="label" fill="#57534e">Dark-wordmark horizontal lockup</text>
    ${image(horizontalUri, 182, 229, 280, 84)}
    <text x="96" y="350" class="detail" fill="#78716c">Master: assets/public/logo-horizontal.svg</text>

    <text x="652" y="158" class="eyebrow" fill="#fdba74">DARK NEUTRAL</text>
    <text x="652" y="181" class="label" fill="#a1a1aa">Light-wordmark horizontal lockup</text>
    ${image(horizontalLightUri, 738, 229, 280, 84)}
    <text x="652" y="350" class="detail" fill="#a1a1aa">Master: assets/public/logo-horizontal-light.svg</text>

    <rect x="64" y="410" width="1072" height="154" rx="24" fill="#ffffff" stroke="#e7e5e4"/>
    <text x="96" y="442" class="eyebrow" fill="#78716c">SPACE &amp; SCALE</text>

    <rect x="108" y="460" width="88" height="88" rx="12" stroke="#a8a29e" stroke-width="1.5" stroke-dasharray="5 4"/>
    ${image(logoUri, 118, 470, 68, 68)}
    <text x="220" y="488" class="label" fill="#292524">Clear space</text>
    <text x="220" y="510" class="detail" fill="#78716c">At least 10% of rendered</text>
    <text x="220" y="528" class="detail" fill="#78716c">height on every side.</text>

    <line x1="462" y1="456" x2="462" y2="542" stroke="#e7e5e4"/>
    ${image(logoUri, 510, 479, 48, 48)}
    <text x="580" y="488" class="label" fill="#292524">Minimum mark</text>
    <text x="580" y="510" class="detail" fill="#78716c">32 px digital minimum.</text>
    <text x="580" y="528" class="detail" fill="#78716c">Keep the original aspect ratio.</text>

    <line x1="778" y1="456" x2="778" y2="542" stroke="#e7e5e4"/>
    ${image(logoUri, 818, 466, 72, 72)}
    <text x="916" y="488" class="label" fill="#292524">Compact use</text>
    <text x="916" y="510" class="detail" fill="#78716c">Use the square master when</text>
    <text x="916" y="528" class="detail" fill="#78716c">the wordmark would be too small.</text>

    <text x="64" y="596" class="detail" fill="#78716c">Do not recolor, redraw, crop, stretch, outline, or use the mark as a decorative pattern.</text>`;

  return documentShell({
    width: 1200,
    height: 620,
    title: 'Navet logo system reference',
    description:
      'Approved Navet square mark and horizontal lockups on light and dark backgrounds, with clear-space and digital-size guidance.',
    metadata:
      'The three displayed logos are base64 embeddings of assets/public/logo.svg, assets/public/logo-horizontal.svg, and assets/public/logo-horizontal-light.svg.',
    body,
  });
}

function semanticIcon(Icon, x, y, color, fill) {
  return `<g transform="translate(${x} ${y})">
    <rect width="38" height="38" rx="12" fill="${fill}"/>
    ${lucide(Icon, 9, 9, 20, color)}
  </g>`;
}

function authorityRow({ y, number, rankFill, rankStroke, rankText, title, detail, specimen }) {
  return `<g>
    <rect x="64" y="${y}" width="770" height="84" rx="20" fill="#11151d" stroke="#30343d"/>
    <circle cx="103" cy="${y + 42}" r="18" fill="${rankFill}" stroke="${rankStroke}"/>
    <text x="103" y="${y + 46}" class="eyebrow" fill="${rankText}" text-anchor="middle">${number}</text>
    <text x="139" y="${y + 36}" class="label" fill="#ffffff">${title}</text>
    <text x="139" y="${y + 59}" class="detail" fill="#a1a1aa">${detail}</text>
    ${specimen}
  </g>`;
}

async function generateColorArchitecture(assets) {
  const logoUri = dataUri('image/svg+xml', assets.logo);
  const homeAssistantUri = dataUri('image/svg+xml', assets.homeAssistant);
  const authorityRowHeight = 84;
  const centeredRowTop = (rowY, contentHeight) =>
    rowY + (authorityRowHeight - contentHeight) / 2;

  const semanticSpecimen = `<g transform="translate(632 0)">
      ${semanticIcon(Info, 0, centeredRowTop(132, 38), '#e0f2fe', '#0369a1')}
      ${semanticIcon(CircleCheck, 46, centeredRowTop(132, 38), '#d1fae5', '#047857')}
      ${semanticIcon(TriangleAlert, 92, centeredRowTop(132, 38), '#fef3c7', '#b45309')}
      ${semanticIcon(CircleX, 138, centeredRowTop(132, 38), '#fee2e2', '#b91c1c')}
    </g>`;
  const sourceSpecimen = `<g transform="translate(638 ${centeredRowTop(226, 42)})">
      <rect width="42" height="42" rx="13" fill="#7c2d12"/>
      ${lucide(Lightbulb, 10, 10, 22, '#fed7aa')}
      <rect x="52" width="42" height="42" rx="13" fill="#4c1d95"/>
      ${lucide(Disc3, 62, 10, 22, '#ede9fe')}
      <rect x="104" width="42" height="42" rx="13" fill="#f8fafc"/>
      ${image(homeAssistantUri, 111, 7, 28, 28)}
    </g>`;
  const accentSpecimen = `<g transform="translate(645 ${centeredRowTop(320, 20)})">
      <circle cx="10" cy="10" r="10" fill="#f97316"/>
      <circle cx="38" cy="10" r="10" fill="#3b82f6"/>
      <circle cx="66" cy="10" r="10" fill="#22c55e"/>
      <circle cx="94" cy="10" r="10" fill="#a855f7"/>
      <circle cx="122" cy="10" r="10" fill="#ec4899"/>
      <circle cx="150" cy="10" r="10" fill="#14b8a6"/>
    </g>`;
  const corporateSpecimen = `<g>
      <rect x="650" y="${centeredRowTop(414, 28)}" width="112" height="28" rx="14" fill="url(#navetOrange)"/>
      <text x="706" y="460" class="micro" fill="#ffffff" text-anchor="middle">NAVET ORANGE</text>
      ${image(logoUri, 776, centeredRowTop(414, 42), 42, 42)}
    </g>`;
  const neutralSpecimen = `<g transform="translate(636 ${centeredRowTop(508, 38)})">
      <rect width="38" height="38" rx="11" fill="#fafaf9" stroke="#d6d3d1"/>
      <rect x="48" width="38" height="38" rx="11" fill="#52525b" stroke="#71717a"/>
      <rect x="96" width="38" height="38" rx="11" fill="#27272a" stroke="#52525b"/>
      <rect x="144" width="38" height="38" rx="11" fill="#09090b" stroke="#3f3f46"/>
    </g>`;

  const body = `    <rect width="1200" height="700" fill="url(#darkCanvas)"/>
    <circle cx="1085" cy="12" r="230" fill="#f97316" fill-opacity="0.07"/>
    <circle cx="72" cy="690" r="280" fill="#2563eb" fill-opacity="0.07"/>
    <text x="64" y="58" fill="#ffffff" font-size="30" font-weight="680" letter-spacing="-0.8">Color architecture</text>
    <text x="64" y="86" fill="#a1a1aa" font-size="15">Use the highest-authority color that truthfully describes the situation.</text>
    <text x="64" y="119" class="eyebrow" fill="#71717a">HIGHER AUTHORITY</text>

    ${authorityRow({ y: 132, number: '1', rankFill: '#292524', rankStroke: '#fbbf24', rankText: '#fde68a', title: 'Safety and semantics', detail: 'Meaning wins; pair color with a label, icon, or structure.', specimen: semanticSpecimen })}
    ${authorityRow({ y: 226, number: '2', rankFill: '#172554', rankStroke: '#60a5fa', rankText: '#bfdbfe', title: 'Device, provider, and content', detail: 'Real state or source color stays local to the object it describes.', specimen: sourceSpecimen })}
    ${authorityRow({ y: 320, number: '3', rankFill: '#1e293b', rankStroke: '#94a3b8', rankText: '#e2e8f0', title: 'User-selected accent', detail: 'Preference colors active UI when no stronger signal exists.', specimen: accentSpecimen })}
    ${authorityRow({ y: 414, number: '4', rankFill: '#431407', rankStroke: '#fb923c', rankText: '#fed7aa', title: 'Corporate orange', detail: 'Navet identity and public-brand emphasis—not universal status.', specimen: corporateSpecimen })}
    ${authorityRow({ y: 508, number: '5', rankFill: '#18181b', rankStroke: '#52525b', rankText: '#d4d4d8', title: 'Neutral surfaces', detail: 'Theme architecture, readable structure, and inactive state.', specimen: neutralSpecimen })}

    <g transform="translate(862 132)">
      <rect width="274" height="460" rx="24" fill="#0f1219" stroke="#2b3039"/>
      <text x="28" y="38" class="eyebrow" fill="#fdba74">RESOLVE IN ORDER</text>
      ${lucide(ArrowDown, 218, 24, 24, '#fdba74')}

      <circle cx="35" cy="91" r="5" fill="#fbbf24"/>
      <text x="56" y="86" class="label" fill="#ffffff">Meaning first</text>
      <text x="56" y="108" class="detail" fill="#a1a1aa">Warnings and success states</text>
      <text x="56" y="126" class="detail" fill="#a1a1aa">must stay truthful and legible.</text>

      <line x1="28" y1="156" x2="246" y2="156" stroke="#27272a"/>
      <circle cx="35" cy="195" r="5" fill="#60a5fa"/>
      <text x="56" y="190" class="label" fill="#ffffff">Scope stays local</text>
      <text x="56" y="212" class="detail" fill="#a1a1aa">Device and source color belongs</text>
      <text x="56" y="230" class="detail" fill="#a1a1aa">to the object it describes.</text>

      <line x1="28" y1="260" x2="246" y2="260" stroke="#27272a"/>
      <circle cx="35" cy="299" r="5" fill="#71717a"/>
      <text x="56" y="294" class="label" fill="#ffffff">Neutrals carry area</text>
      <text x="56" y="316" class="detail" fill="#a1a1aa">The interface foundation stays</text>
      <text x="56" y="334" class="detail" fill="#a1a1aa">quiet so signals remain clear.</text>

      <rect x="28" y="354" width="218" height="88" rx="18" fill="#111827" stroke="#334155"/>
      <text x="48" y="381" class="eyebrow" fill="#60a5fa">AUTHORITY ≠ AREA</text>
      <text x="48" y="407" class="detail" fill="#cbd5e1">Even a small warning can</text>
      <text x="48" y="425" class="detail" fill="#cbd5e1">outrank a larger card tint.</text>
    </g>

    <text x="64" y="620" class="eyebrow" fill="#71717a">LOWER AUTHORITY</text>
    <text x="64" y="672" class="detail" fill="#71717a">Do not recolor the Navet mark to match a user accent, device, provider, campaign, or theme.</text>`;

  return documentShell({
    width: 1200,
    height: 700,
    title: 'Navet color authority architecture',
    description:
      'Five levels separate safety semantics, device provider and content color, user accent, Navet corporate orange, and neutral surfaces.',
    metadata:
      'Illustrative symbols are server-rendered Lucide React icons. The Navet and Home Assistant marks are embedded from their checked-in SVG masters.',
    body,
  });
}

const assets = {
  logo: await readFile(paths.logo),
  logoHorizontal: await readFile(paths.logoHorizontal),
  logoHorizontalLight: await readFile(paths.logoHorizontalLight),
  homeAssistant: await readFile(paths.homeAssistant),
};

const outputs = [
  ['card-anatomy.svg', await generateCardAnatomy()],
  ['logo-system.svg', await generateLogoSystem(assets)],
  ['color-architecture.svg', await generateColorArchitecture(assets)],
];

for (const [filename, content] of outputs) {
  await writeFile(path.join(mediaDirectory, filename), content);
}

console.log(`Generated ${outputs.length} brand reference visuals from approved product sources.`);
