/*
 * reveal-fallback.ts — active les reveals au scroll UNIQUEMENT sur les navigateurs
 * SANS scroll-driven animations natives (animation-timeline: view()).
 *
 * Garde-fou anti-blocage (objectif : « le site doit être entièrement scrollable ») :
 *  - Le CSS de fallback (effets.css) ne cache un `.reveal` QUE sous `html.js-reveal`.
 *  - Cette classe n'est posée que si (a) le navigateur ne supporte pas view() ET
 *    (b) ce script s'exécute réellement. Donc sans JS, ou si le script échoue avant
 *    de poser la classe, TOUS les `.reveal` restent visibles → aucune section
 *    invisible bloquée, page entièrement lisible et scrollable.
 *  - Sur navigateur moderne : on ne touche à rien, le CSS pilote tout.
 *  - prefers-reduced-motion ou IntersectionObserver absent → tout révélé d'emblée.
 */

const supporteNatif =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('animation-timeline: view()');

if (!supporteNatif) {
  const racine = document.documentElement;
  racine.classList.add('js-reveal');

  const reveler = (el: Element) => el.classList.add('is-visible');

  const demarrer = () => {
    const cibles = document.querySelectorAll<HTMLElement>('.reveal');
    const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Sans IO ou en mouvement réduit : on révèle tout de suite, rien ne reste caché.
    if (mouvementReduit || !('IntersectionObserver' in window)) {
      cibles.forEach(reveler);
      return;
    }

    const observateur = new IntersectionObserver(
      (entrees, obs) => {
        for (const entree of entrees) {
          if (entree.isIntersecting) {
            reveler(entree.target);
            obs.unobserve(entree.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );

    cibles.forEach((el) => observateur.observe(el));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer, { once: true });
  } else {
    demarrer();
  }
}

export {};
