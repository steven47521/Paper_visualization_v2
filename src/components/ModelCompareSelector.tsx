import { useState, useRef, useEffect } from 'react';

interface Model {
  id: string;
  name: string;
  org: string;
  color: string;
}

interface Props {
  models: Model[];
  maxSelect?: number;
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  clearLabel?: string;
}

export default function ModelCompareSelector({
  models,
  maxSelect = 5,
  selected,
  onChange,
  placeholder = 'Select models...',
  clearLabel = 'Clear All',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = models.filter(m => {
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.org.toLowerCase().includes(q);
  });

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else if (selected.length < maxSelect) {
      onChange([...selected, id]);
    }
  };

  const selectedModels = models.filter(m => selected.includes(m.id));

  return (
    <div ref={ref} className="relative w-full max-w-lg">
      {/* Selected tags */}
      <div
        className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] cursor-text min-h-[44px]"
        onClick={() => setOpen(true)}
      >
        {selectedModels.map(m => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
            {m.name}
            <button
              onClick={e => {
                e.stopPropagation();
                toggle(m.id);
              }}
              className="ml-0.5 hover:text-[var(--color-danger)]"
            >
              &times;
            </button>
          </span>
        ))}
        {selected.length === 0 && (
          <span className="text-sm text-[var(--color-text-secondary)]">{placeholder}</span>
        )}
        {selected.length > 0 && (
          <button
            onClick={e => {
              e.stopPropagation();
              onChange([]);
            }}
            className="ml-auto text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
          >
            {clearLabel}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[110] mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg max-h-64 overflow-auto">
          <div className="sticky top-0 p-2 bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
              autoFocus
            />
          </div>
          {filtered.map(m => {
            const isSelected = selected.includes(m.id);
            const disabled = !isSelected && selected.length >= maxSelect;
            return (
              <button
                key={m.id}
                onClick={() => !disabled && toggle(m.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--color-bg-secondary)] transition-colors ${
                  disabled ? 'opacity-40 cursor-not-allowed' : ''
                } ${isSelected ? 'bg-[var(--color-bg-secondary)]' : ''}`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{m.org}</span>
                {isSelected && <span className="ml-auto text-[var(--color-primary)]">&#10003;</span>}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-sm text-center text-[var(--color-text-secondary)]">
              No models found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
