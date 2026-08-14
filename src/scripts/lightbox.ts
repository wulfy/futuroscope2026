/*
 * lightbox.ts — PhotoSwipe 5 en import dynamique au PREMIER clic (0 Ko au chargement).
 *
 * On délègue le clic sur `.galerie__lien` en phase de capture : au premier clic on
 * charge PhotoSwipe (lightbox + core + CSS) puis on ouvre la galerie à l'index cliqué.
 * Une fois initialisé, PhotoSwipe gère lui-même les clics → on retire notre écouteur
 * pour éviter une double ouverture.
 *
 * La feuille de style est demandée en `?url` puis injectée à la main. Importée
 * normalement, même dans un import dynamique, elle serait hissée par Vite en
 * <link> statique du <head> — elle arrivait ainsi AVANT les styles du site, en
 * requête bloquante sur toutes les pages jour, pour une interface qui ne
 * s'ouvre peut-être jamais. Le `<link>` injecté passe la CSP : `style-src`
 * comporte 'self' (les hashes ne concernent que les <style> inline).
 */
import type PhotoSwipeLightbox from 'photoswipe/lightbox';

/* `.jour__corps` et pas `.galerie` : les images du récit (enveloppées par
 * JourLayout) et la grille du bas forment UNE seule séquence navigable. */
const SEL_GALERIE = '.jour__corps';
const SEL_LIEN = '.galerie__lien';

let initPromise: Promise<PhotoSwipeLightbox> | null = null;

/**
 * Ajoute une feuille de style et attend qu'elle soit appliquée : ouvrir la
 * lightbox avant donnerait un premier rendu sans styles. On résout aussi en
 * cas d'erreur — mieux vaut une popin mal habillée que rien du tout.
 */
function chargeFeuille(href: string): Promise<void> {
  return new Promise((resolve) => {
    const lien = document.createElement('link');
    lien.rel = 'stylesheet';
    lien.href = href;
    lien.addEventListener('load', () => resolve(), { once: true });
    lien.addEventListener('error', () => resolve(), { once: true });
    document.head.append(lien);
  });
}

function chargePhotoSwipe(): Promise<PhotoSwipeLightbox> {
  if (!initPromise) {
    initPromise = (async () => {
      const [{ default: Lightbox }, { default: urlFeuille }] = await Promise.all([
        import('photoswipe/lightbox'),
        import('photoswipe/style.css?url'),
      ]);
      await chargeFeuille(urlFeuille);
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
