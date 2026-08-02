// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // ← placeholder : à remplacer par le domaine définitif avant déploiement.
  site: 'https://site.example',

  // Récits sans blocs de code → coloration syntaxique désactivée : évite les styles
  // inline de Shiki, incompatibles avec la CSP stricte à base de hashes.
  markdown: {
    syntaxHighlight: false,
  },

  // Images responsives natives (v7 stable). `constrained` = largeur max fluide,
  // ratio préservé ; `responsiveStyles` injecte les styles srcset/sizes.
  image: {
    responsiveStyles: true,
    layout: 'constrained',
  },

  // API Fonts native : téléchargement au build, auto-hébergement, préload + fallback.
  // Remplace les paquets @fontsource. Weights explicites (par défaut seul 400 est
  // téléchargé) pour disposer du gras des titres et des variantes de corps.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Space Grotesk',
      cssVariable: '--font-titres',
      weights: [500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--font-corps',
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
  ],

  // CSP émise par Astro en <meta> (hashes pour script-src/style-src, zéro unsafe-inline).
  // On ajoute ici les directives pour nos ressources : images (self + data: pour les SVG
  // inline éventuels), médias (vidéos self), polices auto-hébergées (self).
  // `frame-ancestors` est ignorée en <meta> mais reste portée par nginx.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "media-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
      ],
    },
  },
});
