import { useState, useMemo } from 'react';
import LeaderboardTable from './LeaderboardTable';
import WeightSliders from './WeightSliders';
import RadarChart from './RadarChart';
import { computeWeightedScore } from '../lib/aggregate';

interface BenchmarkInfo {
  id: string;
  name: string;
}

interface ModelRow {
  model_id: string;
  model_name: string;
  org: string;
  color: string;
  scores: Record<string, number | null>;
  rawScores: Record<string, number | null>;
}

interface Props {
  benchmarks: BenchmarkInfo[];
  models: ModelRow[];
  locale: 'zh' | 'en';
  l1Id: string;
  labels: {
    model: string;
    overall_score: string;
    weight_reset: string;
    search_placeholder: string;
    source_official: string;
    source_community: string;
    source_self_reported: string;
  };
}

export default function CategoryLeaderboard({
  benchmarks,
  models,
  locale,
  l1Id,
  labels,
}: Props) {
  const defaultWeights = Object.fromEntries(
    benchmarks.map(b => [b.id, 1 / benchmarks.length])
  );
  const [weights, setWeights] = useState(defaultWeights);
  const [showWeights, setShowWeights] = useState(false);

  const rankedModels = useMemo(() => {
    return models
      .filter(m => benchmarks.some(b => m.rawScores[b.id] !== null))
      .map(m => {
        const scoreValues = benchmarks.map(b => m.scores[b.id] ?? null);
        const weightValues = benchmarks.map(b => weights[b.id] ?? 0);
        const composite = computeWeightedScore(scoreValues, weightValues);
        return { ...m, composite };
      })
      .filter(m => m.composite !== null)
      .sort((a, b) => {
        if (a.composite === null) return 1;
        if (b.composite === null) return -1;
        return b.composite - a.composite;
      });
  }, [models, benchmarks, weights]);

  const columns = [
    { key: 'model_name', label: labels.model, sortable: false },
    ...benchmarks.map(b => ({
      key: `raw_${b.id}`,
      label: b.name,
    })),
    { key: 'composite', label: labels.overall_score },
  ];

  const rows = rankedModels.map(m => ({
    model_id: m.model_id,
    model_name: m.model_name,
    org: m.org,
    color: m.color,
    ...Object.fromEntries(
      benchmarks.map(b => [`raw_${b.id}`, m.rawScores[b.id] ?? null])
    ),
    composite: m.composite,
  }));

  const top5 = rankedModels.slice(0, 5);
  const radarModels = top5.map(m => ({
    name: m.model_name,
    color: m.color,
    values: benchmarks.map(b => m.scores[b.id] ?? 0),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              {benchmarks.map(b => {
                const pct = ((weights[b.id] ?? 1 / benchmarks.length) * 100).toFixed(0);
                return (
                  <span key={b.id} className="inline-flex items-center gap-1">
                    {b.name} <span className="opacity-60">{pct}%</span>
                  </span>
                );
              })}
            </div>
            <button
              onClick={() => setShowWeights(!showWeights)}
              className="text-xs px-2.5 py-1 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-text-secondary)] transition-colors"
            >
              {showWeights ? (locale === 'zh' ? '收起' : 'Collapse') : (locale === 'zh' ? '调整权重' : 'Adjust Weights')}
            </button>
          </div>

          {showWeights && (
            <div className="mb-4 pb-4 border-b border-[var(--color-border)]/50">
              <WeightSliders
                dimensions={benchmarks.map(b => ({
                  id: b.id,
                  label: b.name,
                }))}
                onChange={setWeights}
                resetLabel={labels.weight_reset}
              />
            </div>
          )}

          <LeaderboardTable
            columns={columns}
            rows={rows}
            searchPlaceholder={labels.search_placeholder}
            highlightMax
            emptyLabel={locale === 'zh' ? '暂无数据' : 'No data available'}
          />
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <RadarChart
            dimensions={benchmarks.map(b => b.name)}
            models={radarModels}
          />
        </div>
      </div>
    </div>
  );
}
