// ============================================================
// Ikon SVG inline (gaya garis, minimalis). Pemakaian:
//  - HTML statis : <i data-ic="school"></i>   (otomatis diisi)
//  - Template JS : ${IC.school}
// ============================================================
const IC_PATHS = {
  school:   '<path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5M9 11h.01M15 11h.01"/>',
  teacher:  '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/>',
  student:  '<path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/>',
  file:     '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  check:    '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  tick:     '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  help:     '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 0 1 5 1c0 1.7-2.5 2.2-2.5 3.8M12 17.5h.01"/>',
  chart:    '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  trendup:  '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  trenddown:'<path d="m3 7 6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  trophy:   '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  upload:   '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  plus:     '<path d="M12 5v14M5 12h14"/>',
  logout:   '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  play:     '<path d="M7 4.5v15l12-7.5z"/>',
  inbox:    '<path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
  sparkle:  '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  shield:   '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  alert:    '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5h.01"/>',
  arrowL:   '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowR:   '<path d="M5 12h14M13 6l6 6-6 6"/>',
  list:     '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>'
};

function icon(name) {
  return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC_PATHS[name] || ""}</svg>`;
}
const IC = {};
Object.keys(IC_PATHS).forEach((k) => { IC[k] = icon(k); });

function hydrateIcons(root) {
  (root || document).querySelectorAll("i[data-ic]").forEach((el) => {
    el.outerHTML = icon(el.getAttribute("data-ic"));
  });
}
hydrateIcons();
