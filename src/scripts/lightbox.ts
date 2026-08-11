/*
 * lightbox.ts — PhotoSwipe 5 en import dynamique au PREMIER clic (0 Ko au chargement).
 *
 * On délègue le clic sur `.galerie__lien` en phase de capture : au premier clic on
 * charge PhotoSwipe (lightbox + core + CSS) puis on ouvre la galerie à l'index cliqué.
 * Une fois initialisé, PhotoSwipe gère lui-même les clics → on retire notre écouteur
 * pour éviter une double ouverture.
 */
import type PhotoSwipeLightbox from 'photoswipe/lightbox';

/* `.jour__corps` et pas `.galerie` : les images du récit (enveloppées par
 * JourLayout) et la grille du bas forment UNE seule séquence navigable. */
const SEL_GALERIE = '.jour__corps';
const SEL_LIEN = '.galerie__lien';

let initPromise: Promise<PhotoSwipeLightbox> | null = null;

function chargePhotoSwipe(): Promise<PhotoSwipeLightbox> {
  if (!initPromise) {
    initPromise = (async () => {
      const [{ default: Lightbox }] = await Promise.all([
        import('photoswipe/lightbox'),
        import('photoswipe/style.css'),
      ]);
      const lightbox = new Lightbox({
        gallery: SEL_GALERIE,
        children: SEL_LIEN,
        pswpModule: () => import('photoswipe'),
      });
      lightbox.init();
      return lightbox;
    })();
  }
  return initPromise;
}

function auPremierClic(e: MouseEvent) {
  const cible = e.target as Element | null;
  const lien = cible?.closest<HTMLAnchorElement>(SEL_LIEN);
  if (!lien) return;

  // Empêche la navigation vers l'image et l'ouverture native.
  e.preventDefault();

  const liens = Array.from(document.querySelectorAll<HTMLAnchorElement>(`${SEL_GALERIE} ${SEL_LIEN}`));
  const index = Math.max(0, liens.indexOf(lien));

  chargePhotoSwipe().then((lightbox) => {
    lightbox.loadAndOpen(index);
    // PhotoSwipe prend le relais des clics suivants.
    document.removeEventListener('click', auPremierClic, true);
  });
}

if (document.querySelector(SEL_LIEN)) {
  document.addEventListener('click', auPremierClic, true);
}
