const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// SVG Logo matching Medical Care's brand-badge-dot (heart pulse on blue-cyan gradient)
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <filter id="softGlow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#0b132a" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- Rounded squircle container matching brand-badge-dot -->
  <rect width="64" height="64" rx="16" fill="url(#bgGrad)"/>
  
  <!-- Exact Medical Heart Pulse Logo from Bootstrap Icons bi-heart-pulse-fill -->
  <g fill="#ffffff" filter="url(#softGlow)" transform="translate(10, 10) scale(2.75)">
    <path d="M1.475 9C2.702 10.84 4.779 12.871 8 15c3.221-2.129 5.298-4.16 6.525-6H12a.5.5 0 0 1-.464-.314l-1.457-3.642-1.598 5.593a.5.5 0 0 1-.945.049L5.889 6.568l-1.473 2.21A.5.5 0 0 1 4 9z"/>
    <path d="M.88 8C-2.427 1.68 4.41-2 7.823 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C11.59-2 18.426 1.68 15.12 8h-2.783l-1.874-4.686a.5.5 0 0 0-.945.049L7.921 8.956 6.464 5.314a.5.5 0 0 0-.88-.091L3.732 8z"/>
  </g>
</svg>`;

const publicDir = path.join(__dirname, '..', 'public');

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon);

const buffer = Buffer.from(svgIcon);

async function generate() {
  await sharp(buffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  await sharp(buffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  await sharp(buffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));

  await sharp(buffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Also create favicon.ico from 32x32
  fs.copyFileSync(path.join(publicDir, 'favicon-32x32.png'), path.join(publicDir, 'favicon.ico'));

  console.log('All favicon assets regenerated successfully with complete heart pulse!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
