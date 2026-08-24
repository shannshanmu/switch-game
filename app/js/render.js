// Shared SVG/HTML renderers for symbols, funnels and tile rows.

export function symbolSvg(sym) {
  const c = sym.color;
  const shapes = {
    circle: `<circle cx="18" cy="18" r="14" fill="${c}"/>`,
    cross: `<path d="M13 4h10v9h9v10h-9v9H13v-9H4V13h9z" fill="${c}"/>`,
    square: `<rect x="5" y="5" width="26" height="26" fill="${c}"/>`,
    triangle: `<path d="M18 4 33 32H3z" fill="${c}"/>`,
    diamond: `<path d="M18 3 33 18 18 33 3 18z" fill="${c}"/>`,
    star: `<path d="M18 3l4.4 9.4 10.3 1.2-7.6 7 2 10.1L18 25.6l-9.1 5.1 2-10.1-7.6-7 10.3-1.2z" fill="${c}"/>`,
    play: `<path d="M8 4l24 14L8 32z" fill="${c}"/>`,
    hexagon: `<path d="M18 2l14 8v16l-14 8-14-8V10z" fill="${c}"/>`,
  };
  return `<svg viewBox="0 0 36 36" role="img" aria-label="${sym.label}">${shapes[sym.id]}</svg>`;
}

export function funnelSvg(flip = false) {
  // Grey funnel like the current assessment's plumbing look.
  const pts = flip ? '30,0 190,0 220,26 0,26' : '0,0 220,0 190,26 30,26';
  return `<svg class="funnel" width="220" height="26" viewBox="0 0 220 26" aria-hidden="true">
    <polygon points="${pts}" fill="#8d959c"/></svg>`;
}

export function tileRow(symbols, small = false) {
  return `<div class="symbol-row${small ? ' small' : ''}">${
    symbols.map((s) => `<div class="tile">${symbolSvg(s)}</div>`).join('')}</div>`;
}

// Tiny inline symbol chip for running text ("the ● lands in slot 3").
export function chip(sym) {
  return `<span class="chip" title="${sym.label}">${symbolSvg(sym)}</span>`;
}
