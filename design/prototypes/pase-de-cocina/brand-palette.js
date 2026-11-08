/* Se carga en <head> para aplicar la variante antes del primer pintado. */
const brandPaletteActive = new URLSearchParams(location.search).get('palette') === 'brand';
if (brandPaletteActive) {
  document.documentElement.classList.add('palette-brand');
  if (location.pathname.endsWith('burger.html')) document.documentElement.classList.add('palette-burger');
  if (location.pathname.endsWith('acai.html')) document.documentElement.classList.add('palette-acai');
}

document.addEventListener('DOMContentLoaded', () => {
  if (!brandPaletteActive) return;

  // Mantiene la variante al pasar entre las pantallas de demostración.
  for (const link of document.querySelectorAll('a[href]')) {
    const raw = link.getAttribute('href');
    if (!raw || raw.startsWith('#')) continue;
    const target = new URL(raw, location.href);
    if (target.origin !== location.origin || !/\/(?:dashboard|burger|acai|index)\.html$/.test(target.pathname)) continue;
    target.searchParams.set('palette', 'brand');
    link.setAttribute('href', target.pathname.split('/').pop() + target.search + target.hash);
  }
});
