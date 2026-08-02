# Souvenirs — Futuroscope & Poitiers

Site statique de souvenirs de vacances (25 juillet → 1er août) : road trip Lyon→Poitiers en Tesla, Sensas, Futuroscope, Vallée des Singes. Une timeline immersive en accueil, une page par jour avec sa propre ambiance visuelle et ses galeries photos/vidéos.

**Stack :** [Astro 7](https://astro.build/) en sortie **100 % statique**, zéro backend. Optimisation d'images native (avif/webp), lightbox [PhotoSwipe 5](https://photoswipe.com/), effets CSS scroll-driven. Servi par nginx derrière un simple Dockerfile.

---

## Développement local

Node **≥ 22.12** (version épinglée dans `.nvmrc`).

```bash
nvm use              # ou : nvm install && nvm use
npm ci               # installe exactement les versions du lockfile
npm run dev          # serveur de dev  → http://localhost:4321
npm run build        # build statique  → dist/
npm run preview      # sert le build local pour vérification
npm run check        # astro check : types + schémas de collection
```

> Le build **télécharge les polices** (Space Grotesk, Inter) via l'API Fonts d'Astro : une connexion réseau est nécessaire au premier build comme pour `npm ci`.

---

## Ajouter ou éditer un jour

Un jour = **un fichier Markdown** + **un dossier de médias portant le même nom**.

1. Créer `src/content/jours/NN-slug.md` (`NN` = numéro d'ordre à deux chiffres, ex. `09-`).
2. Créer le dossier `src/assets/medias/NN-slug/` (**exactement le même identifiant** que le fichier `.md`).

**Conventions :**

- **`id` du fichier = nom du dossier médias** : `03-futuroscope.md` ↔ `medias/03-futuroscope/`.
- Le **préfixe numérique `NN`** fixe l'ordre d'affichage (accueil + navigation préc./suiv.).
- Les **médias sont triés par nom de fichier** dans la galerie : préfixez-les (`01-`, `02-`…) pour maîtriser l'ordre. Photos et vidéos se mélangent librement dans la grille.
- La **cover** (champ `cover`) et tous les fichiers **`ambiance-*`** sont **exclus de la galerie** (ils servent au hero et aux bannières de lieux).
- Chaque titre `##` du récit ouvre une section. Si son intitulé **correspond à une entrée `lieux[]`** du frontmatter (comparaison insensible à la casse et aux accents), la section démarre par une **bannière d'ambiance** plein largeur ; sinon, elle reste un titre simple. La fonctionnalité est optionnelle.

### Exemple de frontmatter complet

```markdown
---
titre: "Le Futuroscope"
sousTitre: "Une journée dans le futur"
date: 2026-07-27
lieu: "Chasseneuil-du-Poitou"
hotel: "Hôtel Cosmos"                 # optionnel
emoji: "🎢"
cover: "../../assets/medias/03-futuroscope/01-entree.jpg"
coverAlt: "L'entrée du Futuroscope"
ordre: 3
accent: "#22d3ee"
ambiance: "futur"                     # optionnel — cf. slugs d'ambiance ci-dessous
lieux:                                # optionnel — bannières par lieu dans la page
  - titre: "Hôtel Cosmos"
    image: "../../assets/medias/03-futuroscope/ambiance-cosmos.jpg"
    imageAlt: "La façade colorée de l'hôtel Cosmos"
  - titre: "Le Futuroscope"
    image: "../../assets/medias/03-futuroscope/ambiance-futuroscope.jpg"
    imageAlt: "Le Kinémax et son architecture cristalline"
---
Récit en Markdown. Les images inline sont optimisées automatiquement :
![Une machine du parc](../../assets/medias/03-futuroscope/05-machine.jpg)

## Hôtel Cosmos
Le récit de l'arrivée à l'hôtel…

## Le Futuroscope
Le récit de la journée d'attractions…
```

**Slugs d'ambiance disponibles** (champ `ambiance`, pilote le dégradé du hero + le motif décoratif) :
`route`, `sens`, `futur`, `space-aqua`, `nocturne`, `spa`, `jungle`, `sunset`.

---

## Médias (photos & vidéos)

- **Photos** : `.jpg` / `.png` / `.webp`. Optimisées au build en **avif/webp** responsives (plusieurs largeurs, `loading="lazy"`). Déposez la meilleure qualité disponible, Astro se charge du reste.
- **Vidéos** : `.mp4` / `.webm`, **servies telles quelles** (aucun transcodage au build). Lecture en place, plein écran natif sur mobile.

### Compresser les vidéos avant de les versionner

Les vidéos ne sont pas retouchées par le build : compressez-les **en amont** pour garder le dépôt raisonnable. Cible conseillée ~720p/1080p, H.264 :

```bash
# 1080p, H.264, audio AAC — bon compromis qualité/poids
ffmpeg -i source.mov -vf "scale=-2:1080" -c:v libx264 -crf 23 -preset slow \
       -c:a aac -b:a 128k -movflags +faststart 04-attraction.mp4
```

- `-crf 23` : qualité (plus bas = meilleure qualité + fichier plus lourd ; 20–26 est une bonne plage).
- `scale=-2:1080` : hauteur 1080p, largeur auto (paire). Mettez `720` pour du 720p.
- `-movflags +faststart` : place les métadonnées en tête → **lecture/seek immédiats** (les Range requests sont gérées par nginx).

### Dépôt qui devient lourd ?

Les médias sont versionnés dans git. Si le dépôt gonfle, envisagez **git-lfs** (pas activé par défaut) :

```bash
git lfs install
git lfs track "*.mp4" "*.webm"
git add .gitattributes
```

### Régénérer les médias de démonstration

Le dépôt est livré avec des **placeholders générés** (dégradés aux couleurs de chaque ambiance + un mini-clip vidéo) pour valider le circuit sans vrais médias :

```bash
npm run medias:demo
```

Remplacez-les au fur et à mesure par vos vraies photos/vidéos.

---

## Images d'ambiance à remplacer

Les bannières de lieux (`ambiance-*.jpg`) sont livrées en **placeholders stylisés**. Remplacez-les par de vraies images des lieux. **Préférez des images libres de droits** (domaine public / CC0). En **CC-BY**, l'attribution doit figurer dans le footer du site.

Liens de recherche pré-remplis par lieu :

| Lieu | Fichier suggéré | Wikimedia Commons | Unsplash |
|------|-----------------|-------------------|----------|
| Kinémax / Futuroscope | `ambiance-futuroscope.jpg` | [rechercher](https://commons.wikimedia.org/w/index.php?search=Futuroscope+Kin%C3%A9max&title=Special:MediaSearch&type=image) | [rechercher](https://unsplash.com/s/photos/futuroscope) |
| Aquascope | `ambiance-aquascope.jpg` | [rechercher](https://commons.wikimedia.org/w/index.php?search=Aquascope+Futuroscope&title=Special:MediaSearch&type=image) | [rechercher](https://unsplash.com/s/photos/aquarium-tunnel) |
| Sensas Poitiers | `ambiance-sensas.jpg` | [rechercher](https://commons.wikimedia.org/w/index.php?search=Poitiers&title=Special:MediaSearch&type=image) | [rechercher](https://unsplash.com/s/photos/sensory-dark) |
| Hôtel Mercure Poitiers Centre | `ambiance-mercure.jpg` | [rechercher](https://commons.wikimedia.org/w/index.php?search=Poitiers+centre&title=Special:MediaSearch&type=image) | [rechercher](https://unsplash.com/s/photos/hotel-room) |
| Hôtel Cosmos (Futuroscope) | `ambiance-cosmos.jpg` | [rechercher](https://commons.wikimedia.org/w/index.php?search=H%C3%B4tel+Cosmos+Futuroscope&title=Special:MediaSearch&type=image) | [rechercher](https://unsplash.com/s/photos/space-hotel) |
| Clos de la Ribaudière | `ambiance-ribaudiere.jpg` | [rechercher](https://commons.wikimedia.org/w/index.php?search=Chasseneuil-du-Poitou&title=Special:MediaSearch&type=image) | [rechercher](https://unsplash.com/s/photos/spa-wellness) |
| Vallée des Singes | `ambiance-vallee-des-singes.jpg` | [rechercher](https://commons.wikimedia.org/w/index.php?search=Vall%C3%A9e+des+Singes&title=Special:MediaSearch&type=image) | [rechercher](https://unsplash.com/s/photos/monkey-jungle) |
| Tesla Model 3 / autoroute A10 | `ambiance-route.jpg` | [rechercher](https://commons.wikimedia.org/w/index.php?search=Tesla+Model+3&title=Special:MediaSearch&type=image) | [rechercher](https://unsplash.com/s/photos/tesla-model-3) |

> Conseil : sur Wikimedia Commons, filtrez par licence dans la recherche ; sur Unsplash, tout est utilisable gratuitement (voir la [licence Unsplash](https://unsplash.com/license), attribution appréciée mais non obligatoire).

---

## Domaine

Avant tout déploiement, remplacez le placeholder `site` dans `astro.config.mjs` par le domaine réel (utilisé pour les URLs canoniques et les images Open Graph) :

```js
export default defineConfig({
  site: 'https://votre-domaine.example',   // ← à changer
  // …
});
```

---

## Crédits photos (covers actuelles)

Les covers des 8 jours sont des photos libres de Wikimedia Commons, redimensionnées en 1920×1280. **L'attribution ci-dessous doit rester accessible tant que ces photos sont en ligne** (exigence CC BY / CC BY-SA) — si vous les remplacez par vos propres photos, supprimez simplement cette section.

| Jour | Fichier | Auteur | Licence | Source |
|---|---|---|---|---|
| 1 | `01-tesla-depart.jpg` | Noah Wulf | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Black_Tesla_Model_3_on_N_Jones_Blvd.jpg) |
| 2 | `03-sensas-entree.jpg` | — | Photo fournie (Google Maps, droits réservés — usage personnel) | Sensas Poitiers |
| 3 | `03-futuroscope-entree.jpg` | Chin844 | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Vue_Kin%C3%A9max_et_360%C2%B0_14-03-2020.jpg) |
| 4 | `04-aquascope-bassin.jpg` | Jordiferrer | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Futuroscope_(France_2014)_05_Danse_avec_les_Robots.JPG) |
| 5 | `05-spectacle-nocturne.jpg` | Jordiferrer | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Futuroscope_(France_2014)_07_night_show.JPG) |
| 6 | `01-clos-facade.jpg` | Basile Morin | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Indoor_pool_and_showers_of_the_spa_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg) |
| 7 | `02-gibbons.jpg` | Shonagon | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Bonobo_Vall%C3%A9e_des_Singes.jpg) |
| 8 | `04-coucher-soleil.jpg` | Gaétan Veillette | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:A50_(Qu%C3%A9bec)-Vue_vers_l%27ouest_du_coucher_de_soleil_sur_l%27autoroute-2022-11-24.jpg) |

La carte de l'accueil (`src/assets/carte/poitiers-osm.jpg`) est un assemblage de tuiles **© OpenStreetMap contributors** (licence ODbL) — l'attribution affichée sur la carte doit rester.

Notes : jour 2 = intérieur de Sensas Poitiers (photo Google Maps fournie, à remplacer par la vôtre) ; jour 4 = Danse avec les Robots (pas d'Aquascope libre) ; jour 6 = spa générique (pas de photo libre du Clos de la Ribaudière).

---

## Test Docker local

Le daemon Docker doit tourner. Depuis la racine du projet :

```bash
docker build -t futuroscope .
docker run --rm -p 8080:80 futuroscope
```

Puis, dans un autre terminal, vérifiez le service et les en-têtes de sécurité :

```bash
curl -I http://localhost:8080
```

Vous devez voir un `HTTP/1.1 200 OK` et, notamment :

- `Content-Security-Policy: frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cache-Control: no-cache` sur les pages HTML

Sur un asset fingerprinté (`curl -I http://localhost:8080/_astro/…`), attendez-vous à `Cache-Control: public, max-age=31536000, immutable`. La page 404 renvoie bien le `404.html` d'Astro (`curl -I http://localhost:8080/inexistant` → `HTTP/1.1 404`).

> Le reste de la CSP (avec les hashes des scripts/styles) est émis par **Astro en `<meta>`** dans le HTML, pas par nginx.

> **Machine derrière un proxy d'entreprise (interception TLS)** : `npm ci` et le téléchargement des polices échouent dans le conteneur avec `SELF_SIGNED_CERT_IN_CHAIN` (le conteneur ne connaît pas le certificat racine de l'entreprise). C'est un problème local uniquement — sur le serveur Coolify le build passe. Pour tester le runtime nginx malgré tout : `npm run build` sur l'hôte puis
> `docker run --rm -p 8080:80 -v "$PWD/nginx.conf:/etc/nginx/conf.d/default.conf:ro" -v "$PWD/dist:/usr/share/nginx/html:ro" nginx:1.29-alpine`

---

## Déploiement Coolify

1. Créer une ressource de type **Dockerfile** pointant sur ce dépôt.
2. **Port exposé : 80** (déjà `EXPOSE 80` dans le Dockerfile).
3. Associer le **domaine** ; Coolify provisionne le **TLS automatiquement** via Traefik / Let's Encrypt.
4. **Redéploiement automatique** à chaque push sur la branche suivie.

> Rappel : mettez à jour `site` dans `astro.config.mjs` (section Domaine ci-dessus) avant le premier déploiement.
