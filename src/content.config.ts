import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const taxonomy = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/taxonomy' }),
  schema: z.object({
    id: z.string(),
    name_zh: z.string(),
    name_en: z.string(),
    icon: z.string(),
    color: z.string(),
    order: z.number(),
    subcategories: z.array(
      z.object({
        id: z.string(),
        name_zh: z.string(),
        name_en: z.string(),
        description_zh: z.string().optional(),
        description_en: z.string().optional(),
        benchmarks: z.array(z.string()),
      })
    ),
  }),
});

const benchmarks = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/benchmarks' }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    name_zh: z.string(),
    name_en: z.string(),
    url: z.string().url(),
    paper: z.string().url().optional(),
    description_zh: z.string(),
    description_en: z.string(),
    overview_zh: z.string().optional(),
    overview_en: z.string().optional(),
    glance: z
      .array(
        z.object({
          label_zh: z.string(),
          label_en: z.string(),
          value: z.string(),
        })
      )
      .optional(),
    metrics: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        higher_is_better: z.boolean(),
        range: z.tuple([z.number(), z.number()]).optional(),
      })
    ),
    resources: z
      .array(
        z.object({
          label_zh: z.string(),
          label_en: z.string(),
          url: z.string().url(),
        })
      )
      .optional(),
    downloads: z
      .array(
        z.object({
          label_zh: z.string(),
          label_en: z.string(),
          url: z.string().url(),
          note_zh: z.string().optional(),
          note_en: z.string().optional(),
        })
      )
      .optional(),
    highlights_zh: z.array(z.string()).optional(),
    highlights_en: z.array(z.string()).optional(),
    leaderboard_note_zh: z.string().optional(),
    leaderboard_note_en: z.string().optional(),
    authors_zh: z.string().optional(),
    authors_en: z.string().optional(),
    abstract_zh: z.string().optional(),
    abstract_en: z.string().optional(),
    method_zh: z.string().optional(),
    method_en: z.string().optional(),
    figures: z
      .array(
        z.object({
          image: z.string(),
          caption_zh: z.string(),
          caption_en: z.string(),
        })
      )
      .optional(),
    chart_figures: z
      .array(
        z.object({
          image: z.string(),
          caption_zh: z.string(),
          caption_en: z.string(),
        })
      )
      .optional(),
    samples: z
      .array(
        z.object({
          input_zh: z.string(),
          input_en: z.string(),
          output_zh: z.string(),
          output_en: z.string(),
          explanation_zh: z.string().optional(),
          explanation_en: z.string().optional(),
        })
      )
      .optional(),
  }),
});

const scores = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/scores' }),
  schema: z.object({
    benchmark_id: z.string(),
    updated: z.string(),
    results: z.array(
      z.object({
        model_id: z.string(),
        scores: z.record(z.string(), z.number()),
        source: z.enum(['official', 'community', 'self_reported']),
        source_url: z.string().url().optional(),
        date: z.string().optional(),
      })
    ),
  }),
});

const models = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/models' }),
  schema: z.object({
    models: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        org: z.string(),
        org_url: z.string().url().optional(),
        release_date: z.string().optional(),
        color: z.string(),
        tags: z.array(z.string()),
      })
    ),
  }),
});

export const collections = {
  taxonomy,
  benchmarks,
  scores,
  models,
};
