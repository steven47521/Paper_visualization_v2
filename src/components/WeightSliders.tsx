import { useState, useCallback } from 'react';

interface Dimension {
  id: string;
  label: string;
  color?: string;
}

interface Props {
  dimensions: Dimension[];
  onChange: (weights: Record<string, number>) => void;
  resetLabel?: string;
}

export default function WeightSliders({ dimensions, onChange, resetLabel = 'Reset' }: Props) {
  const defaultWeight = 100 / dimensions.length;
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(dimensions.map(d => [d.id, defaultWeight]))
  );

  const handleChange = useCallback(
    (id: string, value: number) => {
      const newWeights = { ...weights, [id]: value };
      setWeights(newWeights);

      // Normalize to sum = 1
      const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
      const normalized = Object.fromEntries(
        Object.entries(newWeights).map(([k, v]) => [k, total > 0 ? v / total : 0])
      );
      onChange(normalized);
    },
    [weights, onChange]
  );

  const handleReset = () => {
    const resetWeights = Object.fromEntries(
      dimensions.map(d => [d.id, defaultWeight])
    );
    setWeights(resetWeights);

    const normalized = Object.fromEntries(
      dimensions.map(d => [d.id, 1 / dimensions.length])
    );
    onChange(normalized);
  };

  const total = Object.values(weights).reduce((s, v) => s + v, 0);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
      {dimensions.map(dim => {
        const pct = total > 0 ? ((weights[dim.id] / total) * 100).toFixed(0) : '0';
        return (
          <div key={dim.id} className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: dim.color || 'var(--color-primary)' }}
            />
            <span className="text-sm font-medium w-24 shrink-0 truncate">
              {dim.label}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[dim.id]}
              onChange={e => handleChange(dim.id, Number(e.target.value))}
              className="flex-1 accent-[var(--color-primary)] h-1.5"
            />
            <span className="text-sm font-mono w-10 text-right text-[var(--color-text-secondary)]">
              {pct}%
            </span>
          </div>
        );
      })}
      <button
        onClick={handleReset}
        className="self-end mt-1 px-3 py-1 text-xs rounded-md border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
      >
        {resetLabel}
      </button>
    </div>
  );
}
