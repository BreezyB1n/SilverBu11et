import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';
import { KINDS } from './consts';

const series = defineCollection({
  loader: file('src/content/series.json'),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

const posts = defineCollection({
  // The file name is the URL slug: src/content/posts/hello-world.md → /posts/hello-world/
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    description: z.string(),
    kind: z.enum(KINDS),
    tags: z.array(z.string()).default([]),
    series: reference('series').optional(),
    seriesOrder: z.number().int().positive().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, series };
