/**
 * Weighted aggregation utilities for computing composite scores
 */

import { normalizeBenchmarkScores, type MetricDef, type ScoreEntry } from './normalize';

export interface BenchmarkData {
  id: string;
  metrics: MetricDef[];
  results: ScoreEntry[];
}

export interface L1CategoryData {
  id: string;
  name_zh: string;
  name_en: string;
  color: string;
  benchmarks: BenchmarkData[];
}

export interface ModelScore {
  model_id: string;
  model_name: string;
  org: string;
  color: string;
  scores: Record<string, number | null>; // benchmark_id -> raw score (primary metric)
  normalizedScores: Record<string, number | null>; // benchmark_id -> normalized 0-100
  l1Scores: Record<string, number | null>; // l1_id -> weighted L1 score
  overallScore: number | null;
}

/**
 * Compute L2/L1 aggregated score for a model across benchmarks
 * Skips benchmarks where the model has no score
 */
export function computeWeightedScore(
  normalizedScores: (number | null)[],
  weights: number[]
): number | null {
  let totalWeight = 0;
  let weightedSum = 0;

  for (let i = 0; i < normalizedScores.length; i++) {
    const score = normalizedScores[i];
    if (score !== null && score !== undefined) {
      weightedSum += score * weights[i];
      totalWeight += weights[i];
    }
  }

  if (totalWeight === 0) return null;
  return weightedSum / totalWeight;
}

/**
 * Compute overall ranking data for the homepage
 * Returns ModelScore array sorted by overall score
 */
export function computeOverallRanking(
  categories: L1CategoryData[],
  models: Array<{ id: string; name: string; org: string; color: string }>,
  l1Weights?: Record<string, number>
): ModelScore[] {
  // Default equal weights
  const defaultWeight = 1 / categories.length;
  const weights = l1Weights ||
    Object.fromEntries(categories.map(c => [c.id, defaultWeight]));

  // For each benchmark, compute normalized scores
  const benchmarkNormalized = new Map<string, Map<string, number>>();

  for (const category of categories) {
    for (const benchmark of category.benchmarks) {
      const normalized = normalizeBenchmarkScores(benchmark.results, benchmark.metrics);
      benchmarkNormalized.set(benchmark.id, normalized);
    }
  }

  // For each model, compute scores at all levels
  const modelScores: ModelScore[] = models.map(model => {
    const scores: Record<string, number | null> = {};
    const normalizedScores: Record<string, number | null> = {};
    const l1Scores: Record<string, number | null> = {};

    for (const category of categories) {
      const benchmarkScoresForL1: (number | null)[] = [];
      const benchmarkWeights: number[] = [];

      for (const benchmark of category.benchmarks) {
        const primaryMetric = benchmark.metrics[0];
        const result = benchmark.results.find(r => r.model_id === model.id);

        if (result && primaryMetric) {
          const rawScore = result.scores[primaryMetric.id];
          scores[benchmark.id] = rawScore ?? null;

          const normMap = benchmarkNormalized.get(benchmark.id);
          const normScore = normMap?.get(model.id) ?? null;
          normalizedScores[benchmark.id] = normScore;
          benchmarkScoresForL1.push(normScore);
        } else {
          scores[benchmark.id] = null;
          normalizedScores[benchmark.id] = null;
          benchmarkScoresForL1.push(null);
        }
        benchmarkWeights.push(1); // Equal weight within L1 by default
      }

      l1Scores[category.id] = computeWeightedScore(
        benchmarkScoresForL1,
        benchmarkWeights
      );
    }

    // Compute overall score
    const l1ScoreValues = categories.map(c => l1Scores[c.id] ?? null);
    const l1WeightValues = categories.map(c => weights[c.id] ?? defaultWeight);
    const overallScore = computeWeightedScore(l1ScoreValues, l1WeightValues);

    return {
      model_id: model.id,
      model_name: model.name,
      org: model.org,
      color: model.color,
      scores,
      normalizedScores,
      l1Scores,
      overallScore,
    };
  });

  // Sort by overall score descending, nulls last
  return modelScores
    .filter(ms => ms.overallScore !== null)
    .sort((a, b) => {
      if (a.overallScore === null && b.overallScore === null) return 0;
      if (a.overallScore === null) return 1;
      if (b.overallScore === null) return -1;
      return b.overallScore - a.overallScore;
    });
}

/**
 * Recompute ranking with new weights (client-side use)
 */
export function recomputeWithWeights(
  modelScores: ModelScore[],
  l1Ids: string[],
  weights: Record<string, number>
): ModelScore[] {
  return modelScores
    .map(ms => {
      const l1ScoreValues = l1Ids.map(id => ms.l1Scores[id] ?? null);
      const l1WeightValues = l1Ids.map(id => weights[id] ?? 0.25);
      const overallScore = computeWeightedScore(l1ScoreValues, l1WeightValues);
      return { ...ms, overallScore };
    })
    .filter(ms => ms.overallScore !== null)
    .sort((a, b) => {
      if (a.overallScore === null && b.overallScore === null) return 0;
      if (a.overallScore === null) return 1;
      if (b.overallScore === null) return -1;
      return b.overallScore - a.overallScore;
    });
}
