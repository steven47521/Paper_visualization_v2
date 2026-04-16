import { useEffect, useMemo, useState } from 'react';
import LeaderboardTable from './LeaderboardTable';
import WeightSliders from './WeightSliders';
import { computeWeightedScore } from '../lib/aggregate';
import { normalizeBenchmarkScores, type MetricDef, type ScoreEntry } from '../lib/normalize';

interface ProjectionBenchmark {
  id: string;
  name: string;
  metrics: MetricDef[];
  results: ScoreEntry[];
}

interface ProjectionSubcategory {
  id: string;
  name: string;
  description?: string;
  benchmarks: ProjectionBenchmark[];
}

interface ProjectionCategory {
  id: string;
  name: string;
  color: string;
  subcategories: ProjectionSubcategory[];
}

interface ModelMeta {
  id: string;
  name: string;
  org: string;
  color: string;
  tags: string[];
}

interface Labels {
  overall_ranking: string;
  overall_score: string;
  model: string;
  organization: string;
  weight_reset: string;
  search_placeholder: string;
}

interface Props {
  categories: ProjectionCategory[];
  models: ModelMeta[];
  locale: 'zh' | 'en';
  labels: Labels;
}

interface HierarchyRow {
  model_id: string;
  model_name: string;
  org: string;
  color: string;
  tags: string[];
  family: string;
  benchmarkRawScores: Record<string, number | null>;
  subcategoryScores: Record<string, number | null>;
  categoryScores: Record<string, number | null>;
  overallScore: number | null;
}

interface FilterChipGroupProps {
  title: string;
  options: Array<{ id: string; label: string }>;
  active: string | null;
  allLabel: string;
  onChange: (value: string | null) => void;
  color?: string;
}

const FAMILY_PATTERNS: Array<{ id: string; label: string; pattern: RegExp }> = [
  { id: 'qwen', label: 'Qwen', pattern: /\b(qwen|qwq|tongyi)\b/i },
  { id: 'gpt', label: 'GPT / o-series', pattern: /\b(gpt|o1|o3)\b/i },
  { id: 'claude', label: 'Claude', pattern: /\bclaude\b/i },
  { id: 'gemini', label: 'Gemini', pattern: /\bgemini\b/i },
  { id: 'deepseek', label: 'DeepSeek', pattern: /\bdeepseek\b/i },
  { id: 'glm', label: 'GLM / ChatGLM', pattern: /\b(glm|chatglm)\b/i },
  { id: 'yi', label: 'Yi', pattern: /\byi\b/i },
  { id: 'llama', label: 'Llama', pattern: /\b(llama|llava)\b/i },
  { id: 'minicpm', label: 'MiniCPM', pattern: /\bminicpm\b/i },
  { id: 'internvl', label: 'InternVL / InternLM', pattern: /\b(internvl|internlm)\b/i },
  { id: 'mistral', label: 'Mistral / Mixtral', pattern: /\b(mistral|mixtral)\b/i },
  { id: 'doubao', label: 'Doubao', pattern: /\bdoubao\b/i },
];

function getSubcategoryKey(categoryId: string, subcategoryId: string) {
  return `${categoryId}__${subcategoryId}`;
}

function inferModelFamily(model: ModelMeta) {
  const haystack = `${model.id} ${model.name} ${model.org}`.toLowerCase();
  const matched = FAMILY_PATTERNS.find(entry => entry.pattern.test(haystack));
  return matched?.label ?? model.org;
}

function formatCount(locale: 'zh' | 'en', shown: number, total: number) {
  return locale === 'zh'
    ? `当前展示 ${shown} / ${total} 个模型`
    : `Showing ${shown} of ${total} models`;
}

function FilterChipGroup({
  title,
  options,
  active,
  allLabel,
  onChange,
  color,
}: FilterChipGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
            active === null
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)]'
          }`}
        >
          {allLabel}
        </button>
        {options.map(option => {
          const isActive = active === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                isActive
                  ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)]'
              }`}
              style={
                isActive && color
                  ? {
                      backgroundColor: `${color}18`,
                      borderColor: color,
                      color,
                    }
                  : undefined
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function HomepageLeaderboard({
  categories,
  models,
  locale,
  labels,
}: Props) {
  const defaultWeights = useMemo(
    () =>
      Object.fromEntries(
        categories.map(category => [category.id, 1 / Math.max(categories.length, 1)])
      ),
    [categories]
  );

  const [weights, setWeights] = useState<Record<string, number>>(defaultWeights);
  const [showWeights, setShowWeights] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelQuery, setModelQuery] = useState('');

  useEffect(() => {
    setWeights(defaultWeights);
  }, [defaultWeights]);

  const selectedCategory = useMemo(
    () => categories.find(category => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  useEffect(() => {
    if (!selectedCategory) {
      if (selectedSubcategoryId !== null) {
        setSelectedSubcategoryId(null);
      }
      return;
    }

    if (
      selectedSubcategoryId &&
      !selectedCategory.subcategories.some(subcategory => subcategory.id === selectedSubcategoryId)
    ) {
      setSelectedSubcategoryId(null);
    }
  }, [selectedCategory, selectedSubcategoryId]);

  const benchmarkNormalized = useMemo(() => {
    const normalized = new Map<string, Map<string, number>>();
    for (const category of categories) {
      for (const subcategory of category.subcategories) {
        for (const benchmark of subcategory.benchmarks) {
          normalized.set(
            benchmark.id,
            normalizeBenchmarkScores(benchmark.results, benchmark.metrics)
          );
        }
      }
    }
    return normalized;
  }, [categories]);

  const hierarchyRows = useMemo<HierarchyRow[]>(() => {
    return models
      .map(model => {
        const benchmarkRawScores: Record<string, number | null> = {};
        const subcategoryScores: Record<string, number | null> = {};
        const categoryScores: Record<string, number | null> = {};

        for (const category of categories) {
          const subScores: Array<number | null> = [];
          const subWeights: number[] = [];

          for (const subcategory of category.subcategories) {
            const benchmarkScores: Array<number | null> = [];
            const benchmarkWeights: number[] = [];

            for (const benchmark of subcategory.benchmarks) {
              const primaryMetric = benchmark.metrics[0];
              const result = benchmark.results.find(entry => entry.model_id === model.id);
              const rawScore =
                result && primaryMetric ? result.scores[primaryMetric.id] ?? null : null;
              const normalizedScore =
                benchmarkNormalized.get(benchmark.id)?.get(model.id) ?? null;

              benchmarkRawScores[benchmark.id] = rawScore;
              benchmarkScores.push(normalizedScore);
              benchmarkWeights.push(1);
            }

            const subKey = getSubcategoryKey(category.id, subcategory.id);
            const subcategoryScore = computeWeightedScore(benchmarkScores, benchmarkWeights);
            subcategoryScores[subKey] = subcategoryScore;
            subScores.push(subcategoryScore);
            subWeights.push(1);
          }

          categoryScores[category.id] = computeWeightedScore(subScores, subWeights);
        }

        const overallScore = computeWeightedScore(
          categories.map(category => categoryScores[category.id] ?? null),
          categories.map(category => weights[category.id] ?? 0)
        );

        return {
          model_id: model.id,
          model_name: model.name,
          org: model.org,
          color: model.color,
          tags: model.tags,
          family: inferModelFamily(model),
          benchmarkRawScores,
          subcategoryScores,
          categoryScores,
          overallScore,
        };
      })
      .filter(row => row.overallScore !== null || Object.values(row.categoryScores).some(score => score !== null));
  }, [benchmarkNormalized, categories, models, weights]);

  const projection = useMemo(() => {
    if (!selectedCategory) {
      const columns = [
        { key: 'model_name', label: labels.model, sortable: false },
        { key: 'org', label: labels.organization },
        ...categories.map(category => ({
          key: `category_${category.id}`,
          label: category.name,
        })),
        { key: 'projectionScore', label: labels.overall_score },
      ];

      const rows = hierarchyRows
        .map(row => ({
          model_id: row.model_id,
          model_name: row.model_name,
          org: row.org,
          color: row.color,
          family: row.family,
          projectionScore: row.overallScore,
          ...Object.fromEntries(
            categories.map(category => [`category_${category.id}`, row.categoryScores[category.id] ?? null])
          ),
        }))
        .filter(row => row.projectionScore !== null);

      return {
        mode: 'overall' as const,
        title: labels.overall_ranking,
        description:
          locale === 'zh'
            ? '基于一级目录综合聚合，支持直接投影到单个一级或二级维度。'
            : 'Aggregate across top-level categories, then project into a single category or subcategory.',
        columns,
        rows,
        accentColor: categories[0]?.color,
      };
    }

    if (!selectedSubcategoryId) {
      const columns = [
        { key: 'model_name', label: labels.model, sortable: false },
        { key: 'org', label: labels.organization },
        ...selectedCategory.subcategories.map(subcategory => ({
          key: `subcategory_${subcategory.id}`,
          label: subcategory.name,
        })),
        {
          key: 'projectionScore',
          label: locale === 'zh' ? `${selectedCategory.name} 综合分` : `${selectedCategory.name} Score`,
        },
      ];

      const rows = hierarchyRows
        .map(row => ({
          model_id: row.model_id,
          model_name: row.model_name,
          org: row.org,
          color: row.color,
          family: row.family,
          projectionScore: row.categoryScores[selectedCategory.id] ?? null,
          ...Object.fromEntries(
            selectedCategory.subcategories.map(subcategory => [
              `subcategory_${subcategory.id}`,
              row.subcategoryScores[getSubcategoryKey(selectedCategory.id, subcategory.id)] ?? null,
            ])
          ),
        }))
        .filter(row => row.projectionScore !== null);

      return {
        mode: 'category' as const,
        title: selectedCategory.name,
        description:
          locale === 'zh'
            ? '按二级目录展开该一级主题下的模型表现。'
            : 'Expand this top-level category into its second-level dimensions.',
        columns,
        rows,
        accentColor: selectedCategory.color,
      };
    }

    const selectedSubcategory =
      selectedCategory.subcategories.find(subcategory => subcategory.id === selectedSubcategoryId) ?? null;

    if (!selectedSubcategory) {
      return null;
    }

    const columns = [
      { key: 'model_name', label: labels.model, sortable: false },
      { key: 'org', label: labels.organization },
      ...selectedSubcategory.benchmarks.map(benchmark => ({
        key: `benchmark_${benchmark.id}`,
        label: benchmark.name,
      })),
      {
        key: 'projectionScore',
        label:
          locale === 'zh'
            ? `${selectedSubcategory.name} 投影分`
            : `${selectedSubcategory.name} Projection`,
      },
    ];

    const rows = hierarchyRows
      .map(row => ({
        model_id: row.model_id,
        model_name: row.model_name,
        org: row.org,
        color: row.color,
        family: row.family,
        projectionScore:
          row.subcategoryScores[getSubcategoryKey(selectedCategory.id, selectedSubcategory.id)] ?? null,
        ...Object.fromEntries(
          selectedSubcategory.benchmarks.map(benchmark => [
            `benchmark_${benchmark.id}`,
            row.benchmarkRawScores[benchmark.id] ?? null,
          ])
        ),
      }))
      .filter(row => row.projectionScore !== null);

    return {
      mode: 'subcategory' as const,
      title: selectedSubcategory.name,
      description:
        selectedSubcategory.description ||
        (locale === 'zh'
          ? '在该二级目录内，对具体 benchmark 工作进行横向投影。'
          : 'Project model performance across the benchmark works under this subcategory.'),
      columns,
      rows,
      accentColor: selectedCategory.color,
    };
  }, [categories, hierarchyRows, labels.model, labels.organization, labels.overall_ranking, labels.overall_score, locale, selectedCategory, selectedSubcategoryId]);

  const scopedRows = projection?.rows ?? [];

  const organizationOptions = useMemo(
    () =>
      Array.from(new Set(scopedRows.map(row => row.org)))
        .sort((a, b) => a.localeCompare(b))
        .map(org => ({ id: org, label: org })),
    [scopedRows]
  );

  const familyOptions = useMemo(
    () =>
      Array.from(new Set(scopedRows.map(row => row.family)))
        .sort((a, b) => a.localeCompare(b))
        .map(family => ({ id: family, label: family })),
    [scopedRows]
  );

  useEffect(() => {
    if (selectedOrg && !organizationOptions.some(option => option.id === selectedOrg)) {
      setSelectedOrg(null);
    }
  }, [organizationOptions, selectedOrg]);

  useEffect(() => {
    if (selectedFamily && !familyOptions.some(option => option.id === selectedFamily)) {
      setSelectedFamily(null);
    }
  }, [familyOptions, selectedFamily]);

  const filteredModelOptions = useMemo(() => {
    return scopedRows
      .filter(row => (selectedOrg ? row.org === selectedOrg : true))
      .filter(row => (selectedFamily ? row.family === selectedFamily : true))
      .filter(row => row.model_name.toLowerCase().includes(modelQuery.toLowerCase()))
      .sort((a, b) => a.model_name.localeCompare(b.model_name));
  }, [modelQuery, scopedRows, selectedFamily, selectedOrg]);

  useEffect(() => {
    const availableIds = new Set(scopedRows.map(row => row.model_id));
    setSelectedModelIds(current => current.filter(modelId => availableIds.has(modelId)));
  }, [scopedRows]);

  const finalRows = useMemo(() => {
    return scopedRows
      .filter(row => (selectedOrg ? row.org === selectedOrg : true))
      .filter(row => (selectedFamily ? row.family === selectedFamily : true))
      .filter(row => (selectedModelIds.length > 0 ? selectedModelIds.includes(row.model_id) : true))
      .sort((a, b) => {
        const aScore = typeof a.projectionScore === 'number' ? a.projectionScore : -Infinity;
        const bScore = typeof b.projectionScore === 'number' ? b.projectionScore : -Infinity;
        return bScore - aScore;
      });
  }, [scopedRows, selectedFamily, selectedModelIds, selectedOrg]);

  const activeModelLabels = useMemo(() => {
    const modelMap = new Map(models.map(model => [model.id, model.name]));
    return selectedModelIds.map(modelId => ({
      id: modelId,
      name: modelMap.get(modelId) ?? modelId,
    }));
  }, [models, selectedModelIds]);

  const projectionLabel =
    !selectedCategory
      ? labels.overall_ranking
      : selectedSubcategoryId
        ? `${selectedCategory.name} / ${projection?.title ?? ''}`
        : selectedCategory.name;

  const allModelsLabel = locale === 'zh' ? '全部模型' : 'All models';
  const allOrgsLabel = locale === 'zh' ? '全部机构' : 'All organizations';
  const allFamiliesLabel = locale === 'zh' ? '全部家族' : 'All families';
  const projectionTitle = locale === 'zh' ? '排行榜投影' : 'Leaderboard Projection';
  const modelPickerTitle = locale === 'zh' ? '模型筛选' : 'Model Selection';
  const modelPickerButton = showModelPicker
    ? locale === 'zh'
      ? '收起模型筛选'
      : 'Hide model picker'
    : locale === 'zh'
      ? '选择关心的模型'
      : 'Choose models';
  const clearModelSelection = locale === 'zh' ? '清空模型选择' : 'Clear model selection';
  const searchModelsLabel = locale === 'zh' ? '检索候选模型...' : 'Search candidate models...';

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)]/60 pb-5">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
              {projectionTitle}
            </div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-xl font-semibold text-[var(--color-text)]">{projectionLabel}</h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {projection?.description}
                </p>
              </div>
              {!selectedCategory && (
                <button
                  type="button"
                  onClick={() => setShowWeights(current => !current)}
                  className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)]/60 hover:text-[var(--color-text)]"
                >
                  {showWeights
                    ? locale === 'zh'
                      ? '收起权重'
                      : 'Hide weights'
                    : locale === 'zh'
                      ? '调整一级权重'
                      : 'Adjust top-level weights'}
                </button>
              )}
            </div>
          </div>

          {!selectedCategory && showWeights && (
            <div className="rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-bg)] p-4">
              <WeightSliders
                dimensions={categories.map(category => ({
                  id: category.id,
                  label: category.name,
                  color: category.color,
                }))}
                onChange={setWeights}
                resetLabel={labels.weight_reset}
              />
            </div>
          )}

          <FilterChipGroup
            title={locale === 'zh' ? '一级目录' : 'Top-level Category'}
            options={categories.map(category => ({
              id: category.id,
              label: category.name,
            }))}
            active={selectedCategoryId}
            allLabel={labels.overall_ranking}
            onChange={value => {
              setSelectedCategoryId(value);
              if (value === null) {
                setSelectedSubcategoryId(null);
              }
            }}
            color={selectedCategory?.color}
          />

          {selectedCategory && (
            <FilterChipGroup
              title={locale === 'zh' ? '二级目录' : 'Second-level Dimension'}
              options={selectedCategory.subcategories.map(subcategory => ({
                id: subcategory.id,
                label: subcategory.name,
              }))}
              active={selectedSubcategoryId}
              allLabel={selectedCategory.name}
              onChange={setSelectedSubcategoryId}
              color={selectedCategory.color}
            />
          )}

          <FilterChipGroup
            title={locale === 'zh' ? '机构筛选' : 'Organization Filter'}
            options={organizationOptions}
            active={selectedOrg}
            allLabel={allOrgsLabel}
            onChange={setSelectedOrg}
          />

          <FilterChipGroup
            title={locale === 'zh' ? '模型家族' : 'Model Family'}
            options={familyOptions}
            active={selectedFamily}
            allLabel={allFamiliesLabel}
            onChange={setSelectedFamily}
          />

          <div className="rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-bg)] p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                  {modelPickerTitle}
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {formatCount(locale, finalRows.length, scopedRows.length)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedModelIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedModelIds([])}
                    className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)]/60 hover:text-[var(--color-text)]"
                  >
                    {clearModelSelection}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModelPicker(current => !current)}
                  className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)]/60 hover:text-[var(--color-text)]"
                >
                  {modelPickerButton}
                </button>
              </div>
            </div>

            {activeModelLabels.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeModelLabels.map(model => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() =>
                      setSelectedModelIds(current => current.filter(id => id !== model.id))
                    }
                    className="rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs text-[var(--color-primary)]"
                  >
                    {model.name} ×
                  </button>
                ))}
              </div>
            )}

            {showModelPicker && (
              <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-border)]/60 pt-4">
                <input
                  type="text"
                  value={modelQuery}
                  onChange={event => setModelQuery(event.target.value)}
                  placeholder={searchModelsLabel}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
                />
                <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1">
                  {filteredModelOptions.map(model => {
                    const isActive = selectedModelIds.includes(model.model_id);
                    return (
                      <button
                        key={model.model_id}
                        type="button"
                        onClick={() =>
                          setSelectedModelIds(current =>
                            isActive
                              ? current.filter(id => id !== model.model_id)
                              : [...current, model.model_id]
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          isActive
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)]'
                        }`}
                      >
                        {model.model_name}
                      </button>
                    );
                  })}
                  {filteredModelOptions.length === 0 && (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {locale === 'zh' ? '当前条件下没有可选模型。' : 'No models match the current filters.'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <LeaderboardTable
          columns={projection?.columns ?? []}
          rows={finalRows}
          searchPlaceholder={labels.search_placeholder}
          highlightMax={false}
          emptyLabel={locale === 'zh' ? '当前投影下暂无可展示模型。' : 'No models available for this projection.'}
        />
      </div>
    </div>
  );
}
