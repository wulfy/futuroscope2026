/*
 * elaguer-originaux.mjs — post-traitement de `astro build` (cf. npm run build).
 *
 * POURQUOI
 * Tout import d'image depuis src/assets fait émettre par Astro/Vite une copie
 * CONFORME du fichier source dans dist/_astro : c'est la cible de
 * `ImageMetadata.src`, produite par le fileEmitter au build, indépendamment de
 * ce qu'on affiche ensuite. Les pages, elles, ne référencent que les variantes
 * optimisées (avif/webp/jpg redimensionnés) générées par <Image>/<Picture>.
 * Résultat : ~161 photos pleine résolution, ~71 Mo, publiées à des URL stables
 * sans qu'aucune page n'y renvoie — métadonnées EXIF/XMP comprises.
 *
 * Ni le mode du glob (eager ou paresseux) ni un filtrage plus fin n'y changent
 * quoi que ce soit : toute image affichée quelque part sur le site voit son
 * original émis. D'où cet élagage après coup.
 *
 * GARDE-FOU
 * Un fichier n'est supprimé que si les DEUX conditions sont réunies :
 *   1. son nom n'apparaît dans AUCUN fichier texte de dist/ (html, css, js…) ;
 *   2. son contenu est identique, octet pour octet, à un média source.
 * Une variante produite par le pipeline (condition 2 fausse) ou un fichier
 * référencé où que ce soit (condition 1 fausse) n'est donc jamais touché.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, unlink } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RACINE, 'dist');
const ASTRO = join(DIST, '_astro');
const SOURCES = join(RACINE, 'src', 'assets');

/* Extensions dont on lit le contenu à la recherche de références. */
const EXT_TEXTE = new Set([
  '.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg', '.map',
]);

/** Liste récursive des fichiers d'un dossier (chemins absolus). */
async function fichiers(racine) {
  const trouves = [];
  let entrees;
  try {
    entrees = await readdir(racine, { withFileTypes: true });
  } catch {
    return trouves; // dossier absent : rien à parcourir
  }
  for (const entree of entrees) {
    const chemin = join(racine, entree.name);
    if (entree.isDirectory()) trouves.push(...(await fichiers(chemin)));
    else if (entree.isFile()) trouves.push(chemin);
  }
  return trouves;
}

const empreinte = (contenu) => createHash('sha1').update(contenu).digest('hex');

const octetsLisibles = (n) => `${(n / 1024 / 1024).toFixed(1)} Mo`;

const fichiersDist = await fichiers(DIST);
if (fichiersDist.length === 0) {
  console.error('✗ dist/ est vide ou absent — lancer `astro build` d\'abord.');
  process.exit(1);
}

// 1. Tous les chemins _astro cités dans le site généré : srcset, url() CSS,
//    href de la lightbox, og:image en URL absolue… Le `/` est dans la classe
//    de caractères pour capturer aussi les sous-dossiers (_astro/fonts/…).
const cites = new Set();
for (const fichier of fichiersDist) {
  if (!EXT_TEXTE.has(extname(fichier).toLowerCase())) continue;
  const texte = await readFile(fichier, 'utf8');
  for (const [, chemin] of texte.matchAll(/_astro\/([A-Za-z0-9._/-]+)/g)) cites.add(chemin);
}

// 2. Empreintes des médias sources.
const empreintesSources = new Set();
for (const fichier of await fichiers(SOURCES)) {
  empreintesSources.add(empreinte(await readFile(fichier)));
}

// 3. Élagage.
let supprimes = 0;
let octets = 0;
for (const fichier of await fichiers(ASTRO)) {
  if (cites.has(relative(ASTRO, fichier))) continue;
  const contenu = await readFile(fichier);
  if (!empreintesSources.has(empreinte(contenu))) continue;
  await unlink(fichier);
  supprimes++;
  octets += contenu.length;
}

console.log(
  supprimes === 0
    ? '✓ Aucun original non référencé dans dist/_astro.'
    : `✓ ${supprimes} original(aux) non référencé(s) retiré(s) de dist/_astro — ${octetsLisibles(octets)} économisés.`,
);
