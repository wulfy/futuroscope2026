/*
 * generer-medias-demo.mjs — script one-shot (npm run medias:demo).
 *
 * Génère des médias PLACEHOLDER pour les 8 jours dans src/assets/medias/<id>/ :
 *  - 5 photos 1600×1067 (SVG dégradé aux couleurs de l'ambiance + texte → .jpg)
 *  - les bannières `ambiance-*.jpg` 1920×1080 référencées par les frontmatters
 *  - 1 mini-clip `06-clip.mp4` (2 s, 640×360, H.264) dans le dossier du jour 3
 *    pour valider le circuit vidéo (via le binaire embarqué ffmpeg-static).
 *
 * Le réseau de build bloque les banques d'images : ces placeholders sont conçus
 * pour être remplacés par de vraies photos (mêmes noms de fichiers). Voir README.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';

const execFileP = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const RACINE_MEDIAS = join(__dirname, '..', 'src', 'assets', 'medias');

const LARGEUR_PHOTO = 1600;
const HAUTEUR_PHOTO = 1067;
const LARGEUR_AMB = 1920;
const HAUTEUR_AMB = 1080;

/*
 * Données des 8 jours : chaque entrée décrit les couleurs de l'ambiance (2 stops
 * de dégradé + accent pour le texte), les photos et les bannières d'ambiance.
 * Les noms de fichiers DOIVENT correspondre aux frontmatters des .md.
 */
const JOURS = [
  {
    id: '01-road-trip-tesla',
    ambiance: 'route',
    de: '#1a0405', a: '#050506', accent: '#e82127', jour: 1, titre: 'Road trip en Tesla',
    photos: ['01-tesla-depart', '02-autoroute', '03-borne-recharge', '04-arrivee-poitiers', '05-mercure-facade'],
    ambiances: [
      ['ambiance-lyon', 'Départ de Lyon'],
      ['ambiance-route', 'La route'],
      ['ambiance-mercure', 'Hôtel Mercure'],
    ],
  },
  {
    id: '02-sensas-poitiers',
    ambiance: 'sens',
    de: '#2a1405', a: '#0a0703', accent: '#fb923c', jour: 2, titre: 'Sensas Poitiers',
    photos: ['01-mercure-matin', '02-petit-dejeuner', '03-sensas-entree', '04-parcours-sensoriel', '05-sensas-final'],
    ambiances: [
      ['ambiance-mercure', 'Hôtel Mercure'],
      ['ambiance-sensas', 'Sensas'],
    ],
  },
  {
    id: '03-futuroscope',
    ambiance: 'futur',
    de: '#031820', a: '#04070f', accent: '#22d3ee', jour: 3, titre: 'Le Futuroscope',
    photos: ['01-cosmos-arrivee', '02-cosmos-chambre', '03-futuroscope-entree', '04-kinemax', '05-attraction'],
    ambiances: [
      ['ambiance-cosmos', 'Hôtel Cosmos'],
      ['ambiance-futuroscope', 'Le Futuroscope'],
    ],
    clip: '06-clip', // mini-vidéo de test (jour 3 uniquement)
  },
  {
    id: '04-futuroscope-aquascope',
    ambiance: 'space-aqua',
    de: '#14082a', a: '#030a1c', accent: '#8b5cf6', jour: 4, titre: 'Futuroscope & Aquascope',
    photos: ['01-space-loop', '02-petit-dejeuner-spatial', '03-attraction-jour', '04-aquascope-bassin', '05-aquascope-nuit'],
    ambiances: [
      ['ambiance-space-loop', 'Space Loop'],
      ['ambiance-futuroscope', 'Le Futuroscope'],
      ['ambiance-aquascope', "L'Aquascope"],
    ],
  },
  {
    id: '05-futuroscope-dernier-jour',
    ambiance: 'nocturne',
    de: '#25062a', a: '#070310', accent: '#ec4899', jour: 5, titre: 'Dernier jour au Futuroscope',
    photos: ['01-derniere-entree', '02-attraction', '03-spectacle-jour', '04-aurora', '05-spectacle-nocturne'],
    ambiances: [],
  },
  {
    id: '06-clos-de-la-ribaudiere-spa',
    ambiance: 'spa',
    de: '#052419', a: '#04100b', accent: '#34d399', jour: 6, titre: 'Le Clos de la Ribaudière',
    photos: ['01-clos-facade', '02-chambre', '03-jardin', '04-spa-bassin', '05-spa-detente'],
    ambiances: [
      ['ambiance-clos', 'Le Clos de la Ribaudière'],
      ['ambiance-spa', 'Le SPA'],
    ],
  },
  {
    id: '07-vallee-des-singes',
    ambiance: 'jungle',
    de: '#052a10', a: '#040f07', accent: '#22c55e', jour: 7, titre: 'La Vallée des Singes',
    photos: ['01-entree', '02-gibbons', '03-lemuriens', '04-chimpanzes', '05-sentier'],
    ambiances: [],
  },
  {
    id: '08-retour-lyon',
    ambiance: 'sunset',
    de: '#2a1603', a: '#0a0603', accent: '#f59e0b', jour: 8, titre: 'Retour à Lyon',
    photos: ['01-depart-poitiers', '02-autoroute-retour', '03-pause', '04-coucher-soleil', '05-arrivee-lyon'],
    ambiances: [],
  },
];

/** Échappe le texte pour insertion dans du SVG. */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Décale la teinte d'une couleur hex par rotation simple des canaux (variation visuelle). */
function varieTeinte(hex, i) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  const d = i * 18;
  r = Math.min(255, r + d);
  b = Math.min(255, b + Math.floor(d / 2));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Construit le SVG d'un placeholder (dégradé + motif discret + textes). */
function svgPlaceholder({ w, h, de, a, accent, ligne1, ligne2, ligne3 }) {
  const cx = w / 2;
  const cy = h / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${de}"/>
      <stop offset="1" stop-color="${a}"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.42" r="0.7">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="url(#halo)"/>
  <g fill="none" stroke="${accent}" stroke-opacity="0.14" stroke-width="2">
    <circle cx="${cx}" cy="${cy}" r="${h * 0.34}"/>
    <circle cx="${cx}" cy="${cy}" r="${h * 0.22}"/>
  </g>
  <text x="${cx}" y="${cy - h * 0.11}" font-family="Helvetica, Arial, sans-serif" font-size="${h * 0.09}" font-weight="700" fill="${accent}" text-anchor="middle" opacity="0.95">${esc(ligne1)}</text>
  <text x="${cx}" y="${cy + h * 0.02}" font-family="Helvetica, Arial, sans-serif" font-size="${h * 0.11}" font-weight="700" fill="#eef1fb" text-anchor="middle">${esc(ligne2)}</text>
  <text x="${cx}" y="${cy + h * 0.13}" font-family="Helvetica, Arial, sans-serif" font-size="${h * 0.045}" fill="#eef1fb" text-anchor="middle" opacity="0.75">${esc(ligne3)}</text>
</svg>`;
}

async function ecritJpg(svg, chemin) {
  await sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toFile(chemin);
}

/** Génère le mini-clip mp4 (2 s) via ffmpeg-static. */
async function genereClip(chemin, accent) {
  if (!ffmpegPath) throw new Error('ffmpeg-static introuvable');
  // Couleur unie animée (fondu depuis noir), 640×360, H.264 compatible large (yuv420p).
  await execFileP(ffmpegPath, [
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=${accent.replace('#', '0x')}:s=640x360:d=2,fade=in:0:15`,
    '-pix_fmt', 'yuv420p',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-movflags', '+faststart',
    chemin,
  ]);
}

async function main() {
  let nbImages = 0;
  let nbClips = 0;
  const attendus = [];

  for (const j of JOURS) {
    const dossier = join(RACINE_MEDIAS, j.id);
    // Repart d'un dossier propre pour éviter les fichiers orphelins entre deux runs.
    await rm(dossier, { recursive: true, force: true });
    await mkdir(dossier, { recursive: true });

    // Photos
    for (let i = 0; i < j.photos.length; i++) {
      const nom = j.photos[i];
      const chemin = join(dossier, `${nom}.jpg`);
      const svg = svgPlaceholder({
        w: LARGEUR_PHOTO,
        h: HAUTEUR_PHOTO,
        de: varieTeinte(j.de, i),
        a: j.a,
        accent: j.accent,
        ligne1: `Jour ${j.jour}`,
        ligne2: `Photo ${String(i + 1).padStart(2, '0')}`,
        ligne3: `${j.titre} — placeholder`,
      });
      await ecritJpg(svg, chemin);
      attendus.push(chemin);
      nbImages++;
    }

    // Bannières d'ambiance
    for (const [nom, libelle] of j.ambiances) {
      const chemin = join(dossier, `${nom}.jpg`);
      const svg = svgPlaceholder({
        w: LARGEUR_AMB,
        h: HAUTEUR_AMB,
        de: j.de,
        a: j.a,
        accent: j.accent,
        ligne1: `Jour ${j.jour}`,
        ligne2: libelle,
        ligne3: 'Bannière d\'ambiance — placeholder',
      });
      await ecritJpg(svg, chemin);
      attendus.push(chemin);
      nbImages++;
    }

    // Clip vidéo (jour 3 seulement)
    if (j.clip) {
      const chemin = join(dossier, `${j.clip}.mp4`);
      await genereClip(chemin, j.accent);
      attendus.push(chemin);
      nbClips++;
    }

    console.log(`✓ ${j.id} — ${j.photos.length} photos, ${j.ambiances.length} ambiance(s)${j.clip ? ', 1 clip' : ''}`);
  }

  // Vérifie que tout ce qui a été annoncé existe bien sur disque.
  const { access } = await import('node:fs/promises');
  let manquants = 0;
  for (const f of attendus) {
    try {
      await access(f);
    } catch {
      manquants++;
      console.error(`✗ MANQUANT : ${f}`);
    }
  }

  console.log(`\n${nbImages} images + ${nbClips} clip généré(s). ${manquants === 0 ? 'Tous les fichiers présents.' : `${manquants} manquant(s) !`}`);
  if (manquants > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
