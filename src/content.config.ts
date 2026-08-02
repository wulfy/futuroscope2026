/*
 * content.config.ts — collection `jours`.
 * Loader `glob` (Markdown, hors fichiers `_`), schéma zod avec `image()` pour la
 * validation + l'optimisation des covers et bannières d'ambiance.
 * `z` importé depuis `astro/zod` (l'export via `astro:content` est déprécié en v6+).
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Slugs d'ambiance autorisés (cf. tableau des 8 jours dans PLAN.md).
const AMBIANCES = [
  'route',
  'sens',
  'futur',
  'space-aqua',
  'nocturne',
  'spa',
  'jungle',
  'sunset',
] as const;

const jours = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/jours' }),
  schema: ({ image }) =>
    z.object({
      titre: z.string(),
      sousTitre: z.string().optional(),
      date: z.coerce.date(),
      lieu: z.string(),
      hotel: z.string().optional(),
      emoji: z.string(),
      cover: image(),
      coverAlt: z.string(),
      ordre: z.number(),
      accent: z.string().optional(),
      ambiance: z.enum(AMBIANCES).optional(),
      // Sections par lieu : bannière d'ambiance immersive par ## correspondant.
      lieux: z
        .array(
          z.object({
            titre: z.string(),
            image: image(),
            imageAlt: z.string(),
          }),
        )
        .optional(),
    }),
});

export const collections = { jours };
