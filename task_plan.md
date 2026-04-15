# Task Plan: Benchmark Hub (Link-Compass)

## Goal
Build a complete AI Benchmark Hub website with Astro + React + ECharts + Tailwind, featuring sunburst taxonomy visualization, multi-level leaderboards with weighted scoring, benchmark detail pages, model comparison, and zh/en i18n support.

## Current Phase
Phase 1

## Phases

### Phase 1: Skeleton & Data Foundation
- [ ] Install dependencies (React, Tailwind, ECharts)
- [ ] Configure astro.config.mjs (React integration, Tailwind, i18n routing)
- [ ] Define Content Collections + Zod schemas (taxonomy, benchmarks, scores, models)
- [ ] Create seed YAML data (4 taxonomy L1s, 8+ benchmarks, 8+ models, scores)
- [ ] Implement base Layout (nav, footer, dark/light theme toggle)
- [ ] Create i18n translations system
- [ ] Build homepage skeleton (placeholder sections)
- [ ] Verify `astro build` succeeds with real data
- **Status:** pending

### Phase 2: Core Interactive Components
- [ ] SunburstChart component (ECharts sunburst, 3-level taxonomy, click navigation)
- [ ] LeaderboardTable component (sortable columns, search, source badges)
- [ ] WeightSliders component (real-time weight adjustment, normalization)
- [ ] RadarChart component (multi-model overlay, legend toggle)
- [ ] Score normalization & aggregation utilities (lib/normalize.ts, lib/aggregate.ts)
- [ ] Data query helpers (lib/data.ts)
- **Status:** pending

### Phase 3: Page Assembly
- [ ] Homepage: wire SunburstChart + Overall Leaderboard + Category Quick View cards
- [ ] Category page template ([l1]/index.astro): L2 tabs, aggregated leaderboard, radar chart
- [ ] Benchmark detail page ([l1]/[benchmark].astro): info card, metrics, leaderboard, samples
- [ ] Route linking: sunburst click -> category, table row click -> detail
- [ ] Breadcrumb navigation
- **Status:** pending

### Phase 4: Compare Page & i18n
- [ ] ModelCompareSelector component (multi-select, max 5)
- [ ] Compare page: full-dimension table + radar overlay + bar chart
- [ ] LanguageSwitcher component
- [ ] Wire i18n routing (/zh/, /en/) across all pages
- [ ] SampleViewer component for benchmark detail page
- **Status:** pending

### Phase 5: Polish & Responsive
- [ ] Responsive: mobile nav, horizontal scroll tables, adaptive charts
- [ ] SEO: title/description/og tags per page
- [ ] Dark/light theme polish
- [ ] Final `astro build` verification
- **Status:** pending

## Key Questions
1. i18n approach: Astro built-in i18n routing with /zh/ /en/ prefixes (confirmed by design doc)
2. Default language: Chinese, / redirects to /zh/
3. Scores are seed data - approximate values acceptable

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Astro Content Collections with YAML + Zod | Per design doc - type-safe data, build-time validation |
| React islands for interactive components | Only interactive parts need JS, per Astro islands architecture |
| ECharts for all charts | Sunburst, radar, bar chart support in one library |
| 5 development phases | Split design doc's 3 phases into 5 for better agent parallelization |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|

## Notes
- All user-facing text needs _zh/_en dual fields
- Score normalization handles higher_is_better and range fields
- Missing scores display as "—" in tables, 0 in radar charts
