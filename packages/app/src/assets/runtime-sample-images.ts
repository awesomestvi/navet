function toSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createFrameSvg(options: {
  title: string;
  subtitle: string;
  accent: string;
  glow: string;
  panel: string;
  layout?: 'tablet' | 'phone' | 'camera' | 'album';
}): string {
  const { title, subtitle, accent, glow, panel, layout = 'tablet' } = options;
  const isPhone = layout === 'phone';
  const isCamera = layout === 'camera';
  const isAlbum = layout === 'album';
  const width = isPhone ? 720 : 1280;
  const height = isPhone ? 1440 : isAlbum ? 1200 : 800;
  const radius = isPhone ? 84 : isAlbum ? 64 : 46;
  const cardWidth = isPhone ? 248 : 224;
  const cardHeight = isPhone ? 196 : 156;

  return toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#09111d" />
          <stop offset="48%" stop-color="#0f1724" />
          <stop offset="100%" stop-color="#05080d" />
        </linearGradient>
        <radialGradient id="glowA" cx="20%" cy="18%" r="48%">
          <stop offset="0%" stop-color="${glow}" stop-opacity="0.8" />
          <stop offset="100%" stop-color="${glow}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glowB" cx="82%" cy="24%" r="40%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.42" />
          <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${panel}" stop-opacity="0.94" />
          <stop offset="100%" stop-color="#0c121a" stop-opacity="0.98" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="${radius}" fill="url(#bg)" />
      <rect width="${width}" height="${height}" rx="${radius}" fill="url(#glowA)" />
      <rect width="${width}" height="${height}" rx="${radius}" fill="url(#glowB)" />
      <g opacity="0.9">
        <rect x="${isPhone ? 44 : 56}" y="${isPhone ? 52 : 56}" width="${isPhone ? width - 88 : width - 112}" height="72" rx="28" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.08)" />
        <text x="${isPhone ? 84 : 96}" y="${isPhone ? 98 : 102}" fill="rgba(255,255,255,0.96)" font-family="system-ui, sans-serif" font-size="${isPhone ? 32 : 34}" font-weight="700">${title}</text>
        <text x="${isPhone ? 84 : 96}" y="${isPhone ? 134 : 138}" fill="rgba(255,255,255,0.54)" font-family="system-ui, sans-serif" font-size="${isPhone ? 18 : 20}">${subtitle}</text>
      </g>
      ${
        isAlbum
          ? `
      <g transform="translate(120 176)">
        <rect width="960" height="880" rx="48" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
        <rect x="72" y="72" width="816" height="816" rx="36" fill="url(#panel)" />
        <circle cx="408" cy="410" r="240" fill="none" stroke="${accent}" stroke-opacity="0.7" stroke-width="30" />
        <circle cx="408" cy="410" r="134" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="10" />
        <circle cx="408" cy="410" r="42" fill="${accent}" fill-opacity="0.82" />
        <path d="M620 270c68 42 112 118 112 203 0 129-104 234-232 234" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="18" stroke-linecap="round"/>
      </g>
      `
          : isCamera
            ? `
      <g transform="translate(92 150)">
        <rect width="1096" height="560" rx="40" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" />
        <rect x="36" y="36" width="1024" height="488" rx="28" fill="url(#panel)" />
        <path d="M130 404c126-186 272-252 430-252 144 0 262 60 430 248" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="22" />
        <rect x="432" y="196" width="244" height="248" rx="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" />
        <rect x="502" y="260" width="104" height="156" rx="12" fill="${accent}" fill-opacity="0.55" />
        <circle cx="554" cy="212" r="18" fill="${accent}" fill-opacity="0.85" />
        <rect x="76" y="76" width="192" height="26" rx="13" fill="rgba(255,255,255,0.1)" />
        <rect x="894" y="76" width="90" height="26" rx="13" fill="rgba(255,255,255,0.1)" />
      </g>
      `
            : `
      <g transform="translate(${isPhone ? 68 : 72} ${isPhone ? 170 : 170})">
        <rect width="${cardWidth}" height="${cardHeight}" rx="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" />
        <rect x="22" y="22" width="108" height="22" rx="11" fill="rgba(255,255,255,0.1)" />
        <rect x="22" y="60" width="${cardWidth - 44}" height="${isPhone ? 78 : 66}" rx="22" fill="${accent}" fill-opacity="0.24" />
        <rect x="22" y="${isPhone ? 152 : 138}" width="${cardWidth - 120}" height="16" rx="8" fill="rgba(255,255,255,0.08)" />
        <rect x="${cardWidth - 78}" y="24" width="36" height="36" rx="18" fill="${accent}" fill-opacity="0.74" />
        <rect x="${isPhone ? 284 : 252}" y="${isPhone ? 22 : 0}" width="${cardWidth}" height="${cardHeight}" rx="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" />
        <rect x="${isPhone ? 306 : 274}" y="${isPhone ? 28 : 22}" width="132" height="22" rx="11" fill="rgba(255,255,255,0.1)" />
        <rect x="${isPhone ? 306 : 274}" y="${isPhone ? 64 : 60}" width="${cardWidth - 44}" height="${isPhone ? 32 : 30}" rx="15" fill="rgba(255,255,255,0.08)" />
        <rect x="${isPhone ? 306 : 274}" y="${isPhone ? 108 : 102}" width="${cardWidth - 44}" height="${isPhone ? 76 : 64}" rx="22" fill="${glow}" fill-opacity="0.22" />
        <rect x="${isPhone ? 500 : 468}" y="${isPhone ? 106 : 100}" width="28" height="${isPhone ? 80 : 68}" rx="14" fill="${accent}" fill-opacity="0.85" />
        <rect x="${isPhone ? 568 : 532}" y="${isPhone ? 22 : 0}" width="${cardWidth}" height="${cardHeight}" rx="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" />
        <rect x="${isPhone ? 590 : 554}" y="${isPhone ? 28 : 22}" width="148" height="22" rx="11" fill="rgba(255,255,255,0.1)" />
        <rect x="${isPhone ? 590 : 554}" y="${isPhone ? 64 : 60}" width="${cardWidth - 44}" height="${isPhone ? 120 : 112}" rx="24" fill="rgba(255,255,255,0.06)" />
        <rect x="${isPhone ? 612 : 576}" y="${isPhone ? 86 : 82}" width="${cardWidth - 88}" height="${isPhone ? 18 : 16}" rx="8" fill="rgba(255,255,255,0.1)" />
        <rect x="${isPhone ? 612 : 576}" y="${isPhone ? 118 : 112}" width="${cardWidth - 122}" height="${isPhone ? 18 : 16}" rx="8" fill="${accent}" fill-opacity="0.7" />
      </g>
      ${
        isPhone
          ? `
      <g transform="translate(68 420)">
        <rect width="584" height="392" rx="42" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" />
        <rect x="28" y="28" width="220" height="144" rx="28" fill="${glow}" fill-opacity="0.18" />
        <rect x="274" y="28" width="282" height="144" rx="28" fill="rgba(255,255,255,0.05)" />
        <rect x="28" y="196" width="528" height="168" rx="32" fill="rgba(255,255,255,0.05)" />
        <rect x="54" y="228" width="210" height="20" rx="10" fill="rgba(255,255,255,0.1)" />
        <rect x="54" y="268" width="440" height="22" rx="11" fill="${accent}" fill-opacity="0.38" />
      </g>
      `
          : `
      <g transform="translate(72 374)">
        <rect width="536" height="286" rx="34" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" />
        <rect x="28" y="28" width="212" height="230" rx="26" fill="${glow}" fill-opacity="0.18" />
        <rect x="262" y="28" width="246" height="104" rx="24" fill="rgba(255,255,255,0.05)" />
        <rect x="262" y="154" width="246" height="104" rx="24" fill="rgba(255,255,255,0.05)" />
      </g>
      <g transform="translate(672 374)">
        <rect width="536" height="286" rx="34" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" />
        <rect x="28" y="28" width="480" height="78" rx="24" fill="${accent}" fill-opacity="0.24" />
        <rect x="28" y="128" width="228" height="130" rx="24" fill="rgba(255,255,255,0.05)" />
        <rect x="280" y="128" width="228" height="130" rx="24" fill="rgba(255,255,255,0.05)" />
      </g>
      `
      }`
      }
    </svg>
  `);
}

export const RUNTIME_SAMPLE_SCREENSHOTS = {
  homeTablet: createFrameSvg({
    title: 'Home Dashboard',
    subtitle: 'Reference artwork only',
    accent: '#4aa8ff',
    glow: '#8bd7ff',
    panel: '#101a26',
  }),
  energyTablet: createFrameSvg({
    title: 'Energy Dashboard',
    subtitle: 'Reference artwork only',
    accent: '#6ee7b7',
    glow: '#22c55e',
    panel: '#0f1c17',
  }),
  securityTablet: createFrameSvg({
    title: 'Security Dashboard',
    subtitle: 'Reference artwork only',
    accent: '#f59e0b',
    glow: '#fb7185',
    panel: '#201410',
  }),
  homePhone: createFrameSvg({
    title: 'PWA Home',
    subtitle: 'Reference artwork only',
    accent: '#fb923c',
    glow: '#fdba74',
    panel: '#19151d',
    layout: 'phone',
  }),
  homeTabletPortrait: createFrameSvg({
    title: 'Tablet Portrait',
    subtitle: 'Reference artwork only',
    accent: '#a78bfa',
    glow: '#c4b5fd',
    panel: '#17142a',
    layout: 'phone',
  }),
} as const;

export const RUNTIME_SAMPLE_MEDIA = {
  artwork: createFrameSvg({
    title: 'Now Playing',
    subtitle: 'Reference artwork only',
    accent: '#fb923c',
    glow: '#f59e0b',
    panel: '#1f1720',
    layout: 'album',
  }),
  camera: createFrameSvg({
    title: 'Front Door Camera',
    subtitle: 'Reference artwork only',
    accent: '#60a5fa',
    glow: '#67e8f9',
    panel: '#101923',
    layout: 'camera',
  }),
} as const;
