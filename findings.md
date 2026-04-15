# Findings & Decisions

## Requirements
- Astro SSG site for AI benchmark aggregation
- 4 page types: Home, Category (/[l1]/), Detail (/[l1]/[benchmark]/), Compare (/compare/)
- 3-level taxonomy: L1 (domain) > L2 (capability) > L3 (benchmark)
- 4 L1 domains: LLM, AIGC, MLLM, Agent
- Interactive sunburst chart (ECharts) on homepage
- Sortable leaderboard tables with weighted scoring
- Radar charts for multi-model comparison
- Dark/light theme, zh/en i18n
- Pure static output, YAML data files, no backend

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Astro 6.x + React + Tailwind + ECharts | Per design specification |
| Content Collections with Zod schemas | Build-time YAML validation |
| i18n via URL prefix (/zh/, /en/) | Astro built-in i18n support |
| Client-side weight calculation | No rebuild needed for user weight changes |

## Data Architecture
- `src/content/taxonomy/` - 4 YAML files (llm, aigc, mllm, agent)
- `src/content/benchmarks/` - per-benchmark YAML files
- `src/content/scores/` - per-benchmark score YAML files
- `src/content/models/` - single models.yaml
- Normalization: `(score - min) / (max - min) * 100`, inverted if !higher_is_better

## Resources
- Design doc: BENCHMARK_HUB_PROMPT.md (project root)
- Astro Content Collections: https://docs.astro.build/en/guides/content-collections/
- ECharts sunburst: https://echarts.apache.org/examples/en/chart-type/sunburst
