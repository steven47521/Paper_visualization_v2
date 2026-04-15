import { useState } from 'react';
import ModelCompareSelector from './ModelCompareSelector';
import RadarChart from './RadarChart';
import LeaderboardTable from './LeaderboardTable';

interface Model {
  id: string;
  name: string;
  org: string;
  color: string;
}

interface BenchmarkScore {
  benchmark_id: string;
  benchmark_name: string;
  l1_id: string;
  l1_name: string;
  l2_name: string;
  scores: Record<string, number | null>;
}

interface L1Summary {
  id: string;
  name: string;
  color: string;
  scores: Record<string, number | null>;
}

interface Props {
  models: Model[];
  benchmarkScores: BenchmarkScore[];
  l1Summaries: L1Summary[];
  locale: 'zh' | 'en';
  labels: {
    select_models: string;
    clear_all: string;
    compare_desc: string;
    no_data: string;
  };
}

export default function CompareView({
  models,
  benchmarkScores,
  l1Summaries,
  locale,
  labels,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const selectedModels = models.filter(m => selected.includes(m.id));

  const radarDimensions = l1Summaries.map(l => l.name);
  const radarModels = selectedModels.map(m => ({
    name: m.name,
    color: m.color,
    values: l1Summaries.map(l => l.scores[m.id] ?? 0),
  }));

  const columns = [
    { key: 'benchmark_name', label: 'Benchmark', sortable: false },
    { key: 'l1_name', label: locale === 'zh' ? '类别' : 'Category', sortable: false },
    ...selectedModels.map(m => ({
      key: m.id,
      label: m.name,
    })),
  ];

  const rows = benchmarkScores.map(bs => {
    const row: any = {
      model_id: bs.benchmark_id,
      model_name: bs.benchmark_name,
      org: bs.l2_name,
      color: 'transparent',
      benchmark_name: bs.benchmark_name,
      l1_name: bs.l1_name,
    };
    for (const m of selectedModels) {
      row[m.id] = bs.scores[m.id] ?? null;
    }
    return row;
  });

  return (
    <div className="flex flex-col gap-6">
      <ModelCompareSelector
        models={models}
        selected={selected}
        onChange={setSelected}
        placeholder={labels.select_models}
        clearLabel={labels.clear_all}
      />

      {selected.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-secondary)]">
          <p className="text-lg">{labels.compare_desc}</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
            <RadarChart
              dimensions={radarDimensions}
              models={radarModels}
            />
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
            <LeaderboardTable
              columns={columns}
              rows={rows}
              searchable={false}
              highlightMax
              emptyLabel={labels.no_data}
            />
          </div>
        </>
      )}
    </div>
  );
}
