/*
 * mp4.ts — dimensions d'affichage d'un MP4, lues au build.
 *
 * POURQUOI : un <video> sans `width`/`height` se rend en 300×150 jusqu'à
 * l'arrivée des métadonnées, puis saute à son ratio réel — un décalage de
 * plusieurs centaines de pixels en plein milieu du récit (CLS). Les
 * dimensions sont connues au build, il suffit de les lire.
 *
 * COMMENT : lecture directe de la boîte `tkhd` du conteneur (ISO/IEC
 * 14496-12), sans dépendance — le build de prod tourne dans node:alpine, sans
 * ffmpeg. On parcourt moov → trak → tkhd et on retient la première piste dont
 * les dimensions sont non nulles (les pistes audio valent 0×0).
 *
 * En cas de fichier illisible ou de conteneur inattendu, on renvoie `null` :
 * l'appelant se contente alors d'omettre les attributs, comme avant.
 */
import { readFileSync } from 'node:fs';

export type DimensionsVideo = { largeur: number; hauteur: number };

type Boite = { debut: number; fin: number };

/** Parcourt les boîtes d'un intervalle et renvoie celles du type demandé. */
function boites(buf: Buffer, debut: number, fin: number, type: string): Boite[] {
  const trouvees: Boite[] = [];
  let pos = debut;

  while (pos + 8 <= fin) {
    let taille = buf.readUInt32BE(pos);
    const nom = buf.toString('latin1', pos + 4, pos + 8);
    let entete = 8;

    if (taille === 1) {
      // Taille sur 64 bits, stockée juste après le type.
      if (pos + 16 > fin) break;
      taille = Number(buf.readBigUInt64BE(pos + 8));
      entete = 16;
    } else if (taille === 0) {
      // « Jusqu'à la fin du fichier ».
      taille = fin - pos;
    }

    if (taille < entete || pos + taille > fin) break; // conteneur incohérent
    if (nom === type) trouvees.push({ debut: pos + entete, fin: pos + taille });
    pos += taille;
  }

  return trouvees;
}

export function dimensionsMp4(chemin: string): DimensionsVideo | null {
  let buf: Buffer;
  try {
    buf = readFileSync(chemin);
  } catch {
    return null;
  }

  const [moov] = boites(buf, 0, buf.length, 'moov');
  if (!moov) return null;

  for (const trak of boites(buf, moov.debut, moov.fin, 'trak')) {
    const [tkhd] = boites(buf, trak.debut, trak.fin, 'tkhd');
    if (!tkhd) continue;

    /*
     * Disposition de tkhd après le champ version+flags (4 octets) :
     *   v0 : creation(4) modification(4) trackID(4) réservé(4) durée(4) = 20
     *   v1 : creation(8) modification(8) trackID(4) réservé(4) durée(8) = 32
     * puis 16 octets fixes (réservé, layer, alternate_group, volume, réservé),
     * puis la matrice (9 × int32), puis width et height en virgule fixe 16.16.
     */
    const version = buf[tkhd.debut];
    const matrice = tkhd.debut + 4 + (version === 1 ? 32 : 20) + 16;
    const dims = matrice + 36;
    if (dims + 8 > tkhd.fin) continue;

    const largeur = buf.readUInt32BE(dims) / 65536;
    const hauteur = buf.readUInt32BE(dims + 4) / 65536;
    if (largeur === 0 || hauteur === 0) continue; // piste non visuelle

    /*
     * Rotation : sur un quart de tour, la matrice a ses coefficients diagonaux
     * (a et d) nuls et échange donc les axes — les dimensions affichées sont
     * l'inverse de celles stockées.
     */
    const a = buf.readInt32BE(matrice);
    const d = buf.readInt32BE(matrice + 16);
    const pivote = a === 0 && d === 0;

    return pivote
      ? { largeur: Math.round(hauteur), hauteur: Math.round(largeur) }
      : { largeur: Math.round(largeur), hauteur: Math.round(hauteur) };
  }

  return null;
}
