/**
 * Data query helper functions for Astro pages
 * Used in .astro frontmatter to prepare data for React islands
 */

import type { MetricDef, ScoreEntry } from './normalize';
import type { BenchmarkData, L1CategoryData } from './aggregate';

export interface TaxonomyEntry {
  id: string;
  data: {
    id: string;
    name_zh: string;
    name_en: string;
    icon: string;
    color: string;
    order: number;
    subcategories: Array<{
      id: string;
      name_zh: string;
      name_en: string;
      description_zh?: string;
      description_en?: string;
      benchmarks: string[];
    }>;
  };
}

export interface BenchmarkEntry {
  id: string;
  data: {
    id: string;
    name: string;
    name_zh: string;
    name_en: string;
    url: string;
    paper?: string;
    description_zh: string;
    description_en: string;
    overview_zh?: string;
    overview_en?: string;
    glance?: Array<{
      label_zh: string;
      label_en: string;
      value: string;
    }>;
    metrics: MetricDef[];
    resources?: Array<{
      label_zh: string;
      label_en: string;
      url: string;
    }>;
    downloads?: Array<{
      label_zh: string;
      label_en: string;
      url: string;
      note_zh?: string;
      note_en?: string;
    }>;
    highlights_zh?: string[];
    highlights_en?: string[];
    leaderboard_note_zh?: string;
    leaderboard_note_en?: string;
    authors_zh?: string;
    authors_en?: string;
    abstract_zh?: string;
    abstract_en?: string;
    method_zh?: string;
    method_en?: string;
    figures?: Array<{
      image: string;
      caption_zh: string;
      caption_en: string;
    }>;
    chart_figures?: Array<{
      image: string;
      caption_zh: string;
      caption_en: string;
    }>;
    samples?: Array<{
      input_zh: string;
      input_en: string;
      output_zh: string;
      output_en: string;
      explanation_zh?: string;
      explanation_en?: string;
    }>;
  };
}

export interface ScoreCollectionEntry {
  id: string;
  data: {
    benchmark_id: string;
    updated: string;
    results: ScoreEntry[];
  };
}

export interface ModelEntry {
  id: string;
  data: {
    models: Array<{
      id: string;
      name: string;
      org: string;
      org_url?: string;
      release_date?: string;
      color: string;
      tags: string[];
    }>;
  };
}

export interface HomepageProjectionBenchmark {
  id: string;
  name: string;
  metrics: MetricDef[];
  results: ScoreEntry[];
}

export interface HomepageProjectionSubcategory {
  id: string;
  name: string;
  description?: string;
  benchmarks: HomepageProjectionBenchmark[];
}

export interface HomepageProjectionCategory {
  id: string;
  name: string;
  color: string;
  subcategories: HomepageProjectionSubcategory[];
}

function mergeLinks<T extends { url: string }>(primary: T[], fallback: T[]) {
  const seen = new Set(primary.map(item => item.url));
  return primary.concat(fallback.filter(item => !seen.has(item.url)));
}

function inferDefaultResources(
  url: string,
  paper: string | undefined,
  locale: 'zh' | 'en'
) {
  if (!url || url === paper) return [];

  const label =
    locale === 'zh'
      ? url.includes('github.com')
        ? '代码仓库'
        : '项目主页'
      : url.includes('github.com')
        ? 'Code Repository'
        : 'Project Page';

  return [{ label, url }];
}

function inferDefaultDownloads(
  paper: string | undefined,
  locale: 'zh' | 'en'
) {
  if (!paper) return [];

  const arxivMatch = paper.match(/arxiv\.org\/(?:abs|pdf)\/([0-9]+\.[0-9]+)(?:\.pdf)?/);
  if (arxivMatch) {
    return [
      {
        label: locale === 'zh' ? 'ArXiv PDF' : 'ArXiv PDF',
        url: `https://arxiv.org/pdf/${arxivMatch[1]}.pdf`,
        note:
          locale === 'zh'
            ? '论文官方 PDF 下载链接。'
            : 'Direct PDF from the official ArXiv paper page.',
      },
    ];
  }

  const openReviewMatch = paper.match(/[?&]id=([^&]+)/);
  if (paper.includes('openreview.net') && openReviewMatch) {
    return [
      {
        label: locale === 'zh' ? 'OpenReview PDF' : 'OpenReview PDF',
        url: `https://openreview.net/pdf?id=${openReviewMatch[1]}`,
        note:
          locale === 'zh'
            ? '论文官方 OpenReview PDF 下载链接。'
            : 'Direct PDF from the official OpenReview page.',
      },
    ];
  }

  return [];
}

/**
 * Build sunburst chart data from taxonomy
 */
export function buildSunburstData(
  taxonomy: TaxonomyEntry[],
  benchmarks: BenchmarkEntry[],
  locale: 'zh' | 'en'
) {
  const benchmarkMap = new Map(benchmarks.map(b => [b.data.id, b.data]));

  return {
    name: locale === 'zh' ? 'AI 基准体系' : 'AI Benchmarks',
    children: taxonomy
      .sort((a, b) => a.data.order - b.data.order)
      .map(t => ({
        name: locale === 'zh' ? t.data.name_zh : t.data.name_en,
        itemStyle: { color: t.data.color },
        id: t.data.id,
        children: t.data.subcategories.map(sub => ({
          name: locale === 'zh' ? sub.name_zh : sub.name_en,
          id: sub.id,
          children: sub.benchmarks.map(bId => {
            const b = benchmarkMap.get(bId);
            return {
              name: b ? b.name : bId,
              value: 1,
              id: bId,
              l1Id: t.data.id,
            };
          }),
        })),
      })),
  };
}

/**
 * Build L1 category data for aggregation
 */
export function buildCategoryData(
  taxonomyEntry: TaxonomyEntry,
  benchmarks: BenchmarkEntry[],
  scores: ScoreCollectionEntry[]
): L1CategoryData {
  const benchmarkMap = new Map(benchmarks.map(b => [b.data.id, b.data]));
  const scoreMap = new Map(scores.map(s => [s.data.benchmark_id, s.data]));

  const allBenchmarkIds = taxonomyEntry.data.subcategories.flatMap(
    sub => sub.benchmarks
  );

  const benchmarkDataList: BenchmarkData[] = allBenchmarkIds
    .map(bId => {
      const bDef = benchmarkMap.get(bId);
      const sData = scoreMap.get(bId);
      if (!bDef) return null;
      return {
        id: bId,
        metrics: bDef.metrics,
        results: sData?.results ?? [],
      };
    })
    .filter((b): b is BenchmarkData => b !== null);

  return {
    id: taxonomyEntry.data.id,
    name_zh: taxonomyEntry.data.name_zh,
    name_en: taxonomyEntry.data.name_en,
    color: taxonomyEntry.data.color,
    benchmarks: benchmarkDataList,
  };
}

/**
 * Build homepage projection data for interactive filtering on the main leaderboard.
 */
export function buildHomepageProjectionData(
  taxonomy: TaxonomyEntry[],
  benchmarks: BenchmarkEntry[],
  scores: ScoreCollectionEntry[],
  locale: 'zh' | 'en'
): HomepageProjectionCategory[] {
  const benchmarkMap = new Map(benchmarks.map(entry => [entry.data.id, entry.data]));
  const scoreMap = new Map(scores.map(entry => [entry.data.benchmark_id, entry.data]));

  return taxonomy
    .sort((a, b) => a.data.order - b.data.order)
    .map(category => ({
      id: category.data.id,
      name: locale === 'zh' ? category.data.name_zh : category.data.name_en,
      color: category.data.color,
      subcategories: category.data.subcategories.map(subcategory => ({
        id: subcategory.id,
        name: locale === 'zh' ? subcategory.name_zh : subcategory.name_en,
        description: locale === 'zh' ? subcategory.description_zh : subcategory.description_en,
        benchmarks: subcategory.benchmarks
          .map(benchmarkId => {
            const benchmark = benchmarkMap.get(benchmarkId);
            if (!benchmark) return null;

            return {
              id: benchmark.id,
              name: locale === 'zh' ? benchmark.name_zh : benchmark.name_en,
              metrics: benchmark.metrics,
              results: scoreMap.get(benchmark.id)?.results ?? [],
            };
          })
          .filter((benchmark): benchmark is HomepageProjectionBenchmark => benchmark !== null),
      })),
    }));
}

/**
 * Get all models from the models collection
 */
export function getModelsArray(modelsCollection: ModelEntry[]) {
  if (modelsCollection.length === 0) return [];
  return modelsCollection[0].data.models;
}

/**
 * Build data for a benchmark detail page
 */
export function buildBenchmarkDetailData(
  benchmark: BenchmarkEntry,
  scoreEntry: ScoreCollectionEntry | undefined,
  models: Array<{ id: string; name: string; org: string; color: string }>,
  locale: 'zh' | 'en'
) {
  const modelMap = new Map(models.map(m => [m.id, m]));
  const results = scoreEntry?.data.results ?? [];

  const leaderboardRows = results.map(r => {
    const model = modelMap.get(r.model_id);
    return {
      model_id: r.model_id,
      model_name: model?.name ?? r.model_id,
      org: model?.org ?? '',
      color: model?.color ?? '#888',
      scores: r.scores,
      source: r.source,
      source_url: r.source_url,
      date: r.date,
    };
  });

  const resources = (benchmark.data.resources ?? []).map(item => ({
    label: locale === 'zh' ? item.label_zh : item.label_en,
    url: item.url,
  }));

  const downloads = (benchmark.data.downloads ?? []).map(item => ({
    label: locale === 'zh' ? item.label_zh : item.label_en,
    url: item.url,
    note: locale === 'zh' ? item.note_zh : item.note_en,
  }));

  const desc = locale === 'zh' ? benchmark.data.description_zh : benchmark.data.description_en;
  const abstractRaw = locale === 'zh' ? benchmark.data.abstract_zh : benchmark.data.abstract_en;
  const methodRaw = locale === 'zh' ? benchmark.data.method_zh : benchmark.data.method_en;
  const authorsRaw = locale === 'zh' ? benchmark.data.authors_zh : benchmark.data.authors_en;

  const figures = (benchmark.data.figures ?? []).map(f => ({
    image: f.image,
    caption: locale === 'zh' ? f.caption_zh : f.caption_en,
  }));
  const chartFigures = (benchmark.data.chart_figures ?? []).map(f => ({
    image: f.image,
    caption: locale === 'zh' ? f.caption_zh : f.caption_en,
  }));

  return {
    id: benchmark.data.id,
    name: locale === 'zh' ? benchmark.data.name_zh : benchmark.data.name_en,
    description: desc,
    abstract: abstractRaw?.trim() ? abstractRaw : desc,
    authors: authorsRaw?.trim() || undefined,
    method: methodRaw?.trim() || undefined,
    overview: locale === 'zh' ? benchmark.data.overview_zh : benchmark.data.overview_en,
    figures,
    chartFigures,
    url: benchmark.data.url,
    paper: benchmark.data.paper,
    glance: (benchmark.data.glance ?? []).map(item => ({
      label: locale === 'zh' ? item.label_zh : item.label_en,
      value: item.value,
    })),
    metrics: benchmark.data.metrics,
    resources: mergeLinks(
      resources,
      inferDefaultResources(benchmark.data.url, benchmark.data.paper, locale)
    ),
    downloads: mergeLinks(
      downloads,
      inferDefaultDownloads(benchmark.data.paper, locale)
    ),
    highlights: locale === 'zh' ? benchmark.data.highlights_zh : benchmark.data.highlights_en,
    leaderboardNote:
      locale === 'zh' ? benchmark.data.leaderboard_note_zh : benchmark.data.leaderboard_note_en,
    samples: benchmark.data.samples,
    leaderboardRows,
    updated: scoreEntry?.data.updated,
  };
}
