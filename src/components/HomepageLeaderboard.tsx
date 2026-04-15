import { useState, useMemo } from 'react';
import LeaderboardTable from './LeaderboardTable';
import WeightSliders from './WeightSliders';
import { recomputeWithWeights, type ModelScore } from '../lib/aggregate';

interface L1Info {
  id: string;
  name: string;
  color: string;
}

interface Props {
  initialScores: ModelScore[];
  l1Categories: L1Info[];
  locale: 'zh' | 'en';
  labels: {
    overall_ranking: string;
    overall_score: string;
    model: string;
    organization: string;
    weight_reset: string;
    search_placeholder: string;
  };
}

export default function HomepageLeaderboard({
  initialScores,
  l1Categories,
  locale,
  labels,
}: Props) {
  const l1Ids = l1Categories.map(c => c.id);
  const defaultWeights = Object.fromEntries(
    l1Ids.map(id => [id, 1 / l1Ids.length])
  );

  const [weights, setWeights] = useState(defaultWeights);
  const [showWeights, setShowWeights] = useState(false);

  const rankedScores = useMemo(
    () => recomputeWithWeights(initialScores, l1Ids, weights),
    [initialScores, l1Ids, weights]
  );

  const columns = [
    { key: 'model_name', label: labels.model, sortable: false },
    { key: 'org', label: labels.organization },
    ...l1Categories.map(c => ({
      key: `l1_${c.id}`,
      label: c.name,
    })),
    { key: 'overallScore', label: labels.overall_score },
  ];

  const rows = rankedScores.map(ms => ({
    model_id: ms.model_id,
    model_name: ms.model_name,
    org: ms.org,
    color: ms.color,
    ...Object.fromEntries(
      l1Categories.map(c => [`l1_${c.id}`, ms.l1Scores[c.id] ?? null])
    ),
    overallScore: ms.overallScore,
  }));

  return (
    <div>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {l1Categories.map(c => {
              const pct = ((weights[c.id] ?? 0.25) * 100).toFixed(0);
              return (
                <span key={c.id} className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name} {pct}%
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
              dimensions={l1Categories.map(c => ({
                id: c.id,
                label: c.name,
                color: c.color,
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
    </div>
  );
}
