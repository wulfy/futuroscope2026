# syntax=docker/dockerfile:1

# --- Stage 1 : build du site statique Astro ---------------------------------
# Le build télécharge les polices via l'API Fonts d'Astro : le réseau est requis
# pendant cette étape (comme pour `npm ci`).
FROM node:22-alpine AS build
WORKDIR /app

# Dépendances d'abord (cache Docker efficace tant que package*.json ne change pas)
COPY package.json package-lock.json ./
RUN npm ci

# Sources + build
COPY . .
RUN npm run build

# --- Stage 2 : service statique via nginx -----------------------------------
FROM nginx:1.29-alpine AS runtime

# Configuration du server block (gzip, cache, headers de sécurité)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Artefacts statiques générés par Astro
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
