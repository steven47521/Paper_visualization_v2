/**
 * Score normalization utilities
 * Handles different benchmark score ranges and directions
 */

export interface MetricDef {
  id: string;
  name: string;
  higher_is_better: boolean;
  range?: [number, number];
}

export interface ScoreEntry {
  model_id: string;
  scores: Record<string, number>;
  source: 'official' | 'community' | 'self_reported';
  source_url?: string;
  date?: string;
}

/**
 * Normalize a single score to 0-100 range
 * If higher_is_better is false, inverts the score
 * If range is not provided, uses dynamic min/max from all scores
 */
export function normalizeScore(
  score: number,
  metric: MetricDef,
  allScores?: number[]
): number {
  let min: number;
  let max: number;

  if (metric.range) {
    [min, max] = metric.range;
  } else if (allScores && allScores.length > 0) {
    min = Math.min(...allScores);
    max = Math.max(...allScores);
  } else {
    return score;
  }

  if (max === min) return 50;

  const normalized = ((score - min) / (max - min)) * 100;
  return metric.higher_is_better ? normalized : 100 - normalized;
}

/**
 * Normalize all scores for a benchmark
 * Returns a map of model_id -> normalized score (0-100)
 */
export function normalizeBenchmarkScores(
  results: ScoreEntry[],
  metrics: MetricDef[]
): Map<string, number> {
  const normalized = new Map<string, number>();

  if (metrics.length === 0 || results.length === 0) return normalized;

  // Use the first metric as the primary metric for normalization
  const primaryMetric = metrics[0];

  // Collect all scores for dynamic range calculation
  const allScores = results
    .map(r => r.scores[primaryMetric.id])
    .filter((s): s is number => s !== undefined);

  for (const result of results) {
    const score = result.scores[primaryMetric.id];
    if (score !== undefined) {
      normalized.set(
        result.model_id,
        normalizeScore(score, primaryMetric, allScores)
      );
    }
  }

  return normalized;
}

/**
 * Normalize scores across multiple metrics for a single model
 * Returns an array of normalized scores matching the metrics order
 */
export function normalizeMultiMetricScores(
  modelScores: Record<string, number>,
  metrics: MetricDef[],
  allResults: ScoreEntry[]
): number[] {
  return metrics.map(metric => {
    const score = modelScores[metric.id];
    if (score === undefined) return 0;

    const allScores = allResults
      .map(r => r.scores[metric.id])
      .filter((s): s is number => s !== undefined);

    return normalizeScore(score, metric, allScores);
  });
}
