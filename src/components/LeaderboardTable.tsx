import { useState, useMemo, useEffect } from 'react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  format?: (value: any) => string;
}

interface Row {
  model_id: string;
  model_name: string;
  org: string;
  color: string;
  [key: string]: any;
}

interface Props {
  columns: Column[];
  rows: Row[];
  searchable?: boolean;
  searchPlaceholder?: string;
  sourceLabels?: Record<string, string>;
  onRowClick?: (row: Row) => void;
  highlightMax?: boolean;
  highlightMode?: 'max' | 'min';
  emptyLabel?: string;
  pageSize?: number;
  locale?: 'zh' | 'en';
  /** e.g. leaderboard-table--editorial for benchmark detail page */
  className?: string;
}

export default function LeaderboardTable({
  columns,
  rows,
  searchable = true,
  searchPlaceholder = 'Search models...',
  sourceLabels,
  onRowClick,
  highlightMax = false,
  highlightMode = 'max',
  emptyLabel = 'No results found',
  pageSize,
  locale = 'zh',
  className = '',
}: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);

  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        r =>
          r.model_name.toLowerCase().includes(q) ||
          r.org.toLowerCase().includes(q)
      );
    }

    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        const diff =
          typeof aVal === 'number'
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? diff : -diff;
      });
    }

    return result;
  }, [rows, search, sortKey, sortDir]);

  const shouldPaginate = typeof pageSize === 'number' && pageSize > 0 && !expanded;
  const totalPages = shouldPaginate
    ? Math.max(1, Math.ceil(filteredRows.length / (pageSize as number)))
    : 1;

  useEffect(() => {
    setPage(1);
  }, [search, sortKey, sortDir, expanded, rows.length]);

  const pagedRows = useMemo(() => {
    if (!shouldPaginate) return filteredRows;
    const start = (page - 1) * (pageSize as number);
    return filteredRows.slice(start, start + (pageSize as number));
  }, [filteredRows, page, pageSize, shouldPaginate]);

  const rankOffset = shouldPaginate ? (page - 1) * (pageSize as number) : 0;

  const paginationLabels = locale === 'zh'
    ? { prev: '上一页', next: '下一页', page: '第', of: '页，共', pages: '页', showAll: '展开全部', collapse: '收起' }
    : { prev: 'Prev', next: 'Next', page: 'Page', of: ' of ', pages: '', showAll: 'Show all', collapse: 'Collapse' };

  const extremeValues = useMemo(() => {
    if (!highlightMax) return {};
    const valueMap: Record<string, number> = {};
    for (const col of columns) {
      if (col.key === 'model_name' || col.key === 'org') continue;
      const values = rows
        .map(r => r[col.key])
        .filter((v): v is number => typeof v === 'number');
      if (values.length > 0) {
        valueMap[col.key] = highlightMode === 'min' ? Math.min(...values) : Math.max(...values);
      }
    }
    return valueMap;
  }, [rows, columns, highlightMax, highlightMode]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const formatValue = (col: Column, value: any): string => {
    if (value === null || value === undefined) return '-';
    if (col.format) return col.format(value);
    if (typeof value === 'number') return value.toFixed(1);
    return String(value);
  };

  const getSourceBadge = (source: string) => {
    const label = sourceLabels?.[source] || source;
    const editorial = className.includes('leaderboard-table--editorial');
    const colorClass = editorial
      ? 'border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
      : source === 'official'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        : source === 'community'
          ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    return (
      <span className={`inline-block px-1.5 py-0.5 text-xs rounded ${colorClass}`}>
        {label}
      </span>
    );
  };

  return (
    <div className={className}>
      {searchable && (
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full max-w-sm px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="py-3 px-3 text-left font-semibold text-[var(--color-text-secondary)] w-12">
                #
              </th>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`py-3 px-3 text-left font-semibold text-[var(--color-text-secondary)] ${
                    col.sortable !== false ? 'cursor-pointer hover:text-[var(--color-primary)] select-none' : ''
                  }`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-[var(--color-primary)]">
                        {sortDir === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, idx) => (
              <tr
                key={row.model_id}
                className={`border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-secondary)] transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick?.(row)}
              >
                <td className="py-3 px-3 text-[var(--color-text-secondary)] font-mono">
                  {rankOffset + idx + 1}
                </td>
                {columns.map(col => {
                  const value = row[col.key];
                  const isExtreme =
                    highlightMax &&
                    typeof value === 'number' &&
                    extremeValues[col.key] === value;

                  if (col.key === 'model_name') {
                    return (
                      <td key={col.key} className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: row.color }}
                          />
                          <span className="font-medium">{value}</span>
                        </div>
                      </td>
                    );
                  }

                  if (col.key === 'source') {
                    return (
                      <td key={col.key} className="py-3 px-3">
                        {getSourceBadge(value)}
                      </td>
                    );
                  }

                  return (
                    <td
                      key={col.key}
                      className={`py-3 px-3 font-mono ${
                        isExtreme ? 'font-bold text-[var(--color-success)]' : ''
                      }`}
                    >
                      {formatValue(col, value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0 && (
        <p className="text-center py-8 text-[var(--color-text-secondary)]">
          {emptyLabel}
        </p>
      )}

      {typeof pageSize === 'number' && pageSize > 0 && filteredRows.length > pageSize && (
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap border-t border-[var(--color-border)]/60 pt-4 text-xs text-[var(--color-text-secondary)]">
          <div className="bh-mono">
            {expanded
              ? `${filteredRows.length} / ${filteredRows.length}`
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredRows.length)} / ${filteredRows.length}`}
          </div>
          <div className="flex items-center gap-2">
            {!expanded && (
              <>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--color-primary)]/60 hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {paginationLabels.prev}
                </button>
                <span className="bh-mono px-1">
                  {locale === 'zh'
                    ? `${paginationLabels.page} ${page} ${paginationLabels.of} ${totalPages} ${paginationLabels.pages}`
                    : `${paginationLabels.page} ${page}${paginationLabels.of}${totalPages}`}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--color-primary)]/60 hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {paginationLabels.next}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--color-primary)]/60 hover:text-[var(--color-primary)]"
            >
              {expanded ? paginationLabels.collapse : paginationLabels.showAll}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
