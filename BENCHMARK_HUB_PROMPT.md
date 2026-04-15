# Benchmark Hub — 完整项目设计文档

> 本文件是给 Claude Code 的 system prompt。请在 Astro 项目初始化后，将此文件放在项目根目录，每次启动 Claude Code 时引用它作为上下文。

---

## 1. 项目概述

### 1.1 定位
构建一个 AI 模型评测基准（Benchmark）汇总网站，面向 AI 从业者和研究者。核心价值：
- **全景感知**：用户首页一眼了解整个评测体系的组成结构
- **能力梯度**：通过多个 Leaderboard 投影快速了解模型的能力差异
- **深入探索**：针对任一测试集查看其详细信息、评分标准和数据样例

### 1.2 用户画面
1. 用户打开首页 → 看到旭日图，直观了解评测体系的层级和覆盖面
2. 向下滚动 → 看到核心 Leaderboard（综合排名 + 分类目排名），快速感知模型能力梯度
3. 点击某个类目 → 进入类目页，查看该类目下所有 benchmark 的排行、雷达图
4. 点击某个 benchmark → 进入详情页，查看评测说明、评分标准、1-2 个数据样例
5. 进入对比页 → 选最多 5 个模型，表格 + 雷达图叠加对比全维度

### 1.3 语言
中英双语。所有面向用户的文本（导航、标题、描述）均需提供 zh / en 两个版本。数据文件中的字段用 `name_zh` / `name_en` 双字段承载。UI 右上角提供语言切换按钮。

---

## 2. 技术栈

### 2.1 核心选型
- **框架**: Astro (latest stable) — 静态站点生成，Islands 架构
- **交互组件**: React（仅用于需要交互的 island 组件），标记 `client:load` 或 `client:visible`
- **样式**: Tailwind CSS
- **图表**: ECharts（旭日图、雷达图、柱状图）
- **部署**: 纯静态输出（`astro build`），部署到 Vercel / Cloudflare Pages / 任意静态托管
- **数据**: Astro Content Collections，数据存为 YAML 文件，用 Zod schema 校验

### 2.2 设计风格
现代科技感，参考 Hugging Face Open LLM Leaderboard 的视觉方向：
- 深色 / 浅色双主题，默认跟随系统
- 主色调：科技蓝 (#3B82F6) + 辅助渐变
- 字体：英文 Inter，中文 Noto Sans SC（或 system-ui fallback）
- 卡片式布局，圆角 12px，subtle shadow
- 表格行 hover 高亮，排名变化用绿色上升 / 红色下降箭头
- 整体干净利落，信息密度高但不拥挤

### 2.3 不需要的
- 不需要数据库、后端 API、用户登录
- 不需要 CMS 后台，数据全部通过 YAML 文件管理
- 不需要 SSR，纯静态 SSG

---

## 3. 数据架构

### 3.1 三级分类体系

```
L1 (领域)          L2 (能力维度)           L3 (具体测试集)
─────────────      ──────────────         ────────────────
LLM                ├─ 长文本              ├─ LongBench
                   │                      ├─ RULER
                   │                      └─ L-Eval
                   ├─ 对话                ├─ MT-Bench
                   │                      └─ AlpacaEval
                   ├─ 指令遵循            ├─ IFEval
                   │                      └─ FollowBench
                   ├─ 推理                ├─ GSM8K
                   │                      ├─ MATH
                   │                      └─ ARC-Challenge
                   └─ 编程                ├─ HumanEval
                                          ├─ MBPP
                                          └─ SWE-bench

AIGC               ├─ 图像生成            ├─ FID (COCO)
                   │                      └─ HPSv2
                   ├─ 视频生成            ├─ VBench
                   │                      └─ EvalCrafter
                   └─ 音频生成            └─ AudioBench

MLLM               ├─ 图文理解            ├─ MMMU
                   │                      ├─ MMBench
                   │                      └─ MME
                   ├─ 视频理解            ├─ MVBench
                   │                      └─ Video-MME
                   └─ 文档理解            └─ DocVQA

Agent              ├─ 工具使用            ├─ ToolBench
                   │                      └─ API-Bank
                   ├─ Web 交互            ├─ WebArena
                   │                      └─ Mind2Web
                   └─ 编程代理            └─ SWE-bench (Agent)
```

> 注意：以上为初始种子数据的参考，具体 benchmark 列表会持续扩展。schema 设计必须支持灵活增删。

### 3.2 Content Collections 结构

项目 `src/content/` 目录下有以下 collection：

#### `taxonomy` — 分类体系定义
文件：`src/content/taxonomy/` 下每个 L1 一个 YAML 文件

```yaml
# src/content/taxonomy/llm.yaml
id: llm
name_zh: "大语言模型"
name_en: "Large Language Models"
icon: "brain"          # lucide icon name
color: "#3B82F6"       # 主题色，用于旭日图和卡片
order: 1               # 显示顺序
subcategories:
  - id: long_context
    name_zh: "长文本"
    name_en: "Long Context"
    description_zh: "评测模型处理长文档、长对话的能力"
    description_en: "Evaluate model ability to handle long documents and conversations"
    benchmarks:
      - longbench
      - ruler
      - l_eval
  - id: dialogue
    name_zh: "对话"
    name_en: "Dialogue"
    description_zh: "评测多轮对话质量"
    description_en: "Evaluate multi-turn dialogue quality"
    benchmarks:
      - mt_bench
      - alpaca_eval
  # ...更多 subcategory
```

#### `benchmarks` — 测试集元信息
文件：`src/content/benchmarks/` 下每个 benchmark 一个 YAML 文件

```yaml
# src/content/benchmarks/longbench.yaml
id: longbench
name: "LongBench"
name_zh: "LongBench 长文本基准"
name_en: "LongBench Long-context Benchmark"
url: "https://github.com/THUDM/LongBench"
paper: "https://arxiv.org/abs/2308.14508"
description_zh: "由清华大学提出的多任务长文本理解基准，涵盖单文档QA、多文档QA、摘要、小样本学习、合成任务和代码补全6大类共21个子任务。"
description_en: "A multi-task long-context benchmark proposed by Tsinghua University, covering 6 categories with 21 subtasks."
metrics:
  - id: avg_score
    name: "Average Score"
    description: "21个子任务的平均分"
    higher_is_better: true
    range: [0, 100]
  # 可以有多个 metric
samples:
  - input_zh: "请阅读以下文章并回答问题：[长文本内容节选]..."
    input_en: "Please read the following article and answer the question: [long text excerpt]..."
    output_zh: "根据文章第三段的描述，答案是..."
    output_en: "According to the third paragraph, the answer is..."
    explanation_zh: "该样例展示了模型需要在约8000字的文档中定位关键信息并准确回答问题。"
    explanation_en: "This sample shows the model needs to locate key information in an ~8000 word document."
```

#### `scores` — 跑分数据
文件：`src/content/scores/` 下每个 benchmark 一个 YAML 文件

```yaml
# src/content/scores/longbench.yaml
benchmark_id: longbench
updated: "2026-03-28"
results:
  - model_id: gpt_4o
    scores:
      avg_score: 52.3
    source: "official"        # official / community / self_reported
    source_url: "https://..."
    date: "2025-06-01"
  - model_id: claude_opus_4
    scores:
      avg_score: 54.1
    source: "official"
    source_url: "https://..."
    date: "2025-08-01"
  - model_id: gemini_2_5_pro
    scores:
      avg_score: 51.8
    source: "community"
    date: "2025-07-15"
  # ...更多模型
```

#### `models` — 模型元信息
文件：`src/content/models/models.yaml`（单文件，所有模型）

```yaml
models:
  - id: gpt_4o
    name: "GPT-4o"
    org: "OpenAI"
    org_url: "https://openai.com"
    release_date: "2024-05"
    color: "#10a37f"       # 品牌色，用于图表
    tags: ["proprietary", "multimodal"]
  - id: claude_opus_4
    name: "Claude Opus 4"
    org: "Anthropic"
    org_url: "https://anthropic.com"
    release_date: "2025-05"
    color: "#d97706"
    tags: ["proprietary"]
  - id: gemini_2_5_pro
    name: "Gemini 2.5 Pro"
    org: "Google"
    org_url: "https://deepmind.google"
    release_date: "2025-03"
    color: "#4285f4"
    tags: ["proprietary", "multimodal"]
  - id: llama_4_405b
    name: "Llama 4 405B"
    org: "Meta"
    org_url: "https://ai.meta.com"
    release_date: "2025-04"
    color: "#0668E1"
    tags: ["open_weight"]
  - id: qwen_3_72b
    name: "Qwen3-72B"
    org: "Alibaba"
    org_url: "https://qwenlm.github.io"
    release_date: "2025-06"
    color: "#ff6a00"
    tags: ["open_weight"]
  # ...更多模型
```

### 3.3 Zod Schema 校验

在 `src/content/config.ts` 中为每个 collection 定义 Zod schema，确保非技术成员填写 YAML 时格式错误能在 build 阶段被捕获并给出明确报错。

```typescript
// src/content/config.ts — 参考结构，实际实现时按 Astro 文档调整

import { z, defineCollection } from 'astro:content';

const taxonomyCollection = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string(),
    name_zh: z.string(),
    name_en: z.string(),
    icon: z.string(),
    color: z.string(),
    order: z.number(),
    subcategories: z.array(z.object({
      id: z.string(),
      name_zh: z.string(),
      name_en: z.string(),
      description_zh: z.string().optional(),
      description_en: z.string().optional(),
      benchmarks: z.array(z.string()),
    })),
  }),
});

const benchmarkCollection = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    name_zh: z.string(),
    name_en: z.string(),
    url: z.string().url(),
    paper: z.string().url().optional(),
    description_zh: z.string(),
    description_en: z.string(),
    metrics: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      higher_is_better: z.boolean(),
      range: z.tuple([z.number(), z.number()]).optional(),
    })),
    samples: z.array(z.object({
      input_zh: z.string(),
      input_en: z.string(),
      output_zh: z.string(),
      output_en: z.string(),
      explanation_zh: z.string().optional(),
      explanation_en: z.string().optional(),
    })).optional(),
  }),
});

const scoreCollection = defineCollection({
  type: 'data',
  schema: z.object({
    benchmark_id: z.string(),
    updated: z.string(),
    results: z.array(z.object({
      model_id: z.string(),
      scores: z.record(z.string(), z.number()),
      source: z.enum(['official', 'community', 'self_reported']),
      source_url: z.string().url().optional(),
      date: z.string().optional(),
    })),
  }),
});

export const collections = {
  taxonomy: taxonomyCollection,
  benchmarks: benchmarkCollection,
  scores: scoreCollection,
};
```

---

## 4. 页面与路由

### 4.1 路由表

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 旭日图 + 核心 Leaderboard 摘要 |
| `/[l1_id]/` | 类目页 | 如 `/llm/`，含 tab 切 L2，每个 L2 下有 leaderboard |
| `/[l1_id]/[benchmark_id]/` | 详情页 | 如 `/llm/longbench/`，单个 benchmark 全部信息 |
| `/compare/` | 对比页 | 选模型做跨维度对比 |

### 4.2 首页 `/`

#### 区域 A：Hero + 旭日图
- 页面顶部：项目名称、一句话 slogan、语言切换
- 旭日图（ECharts sunburst）：中心是 "AI Benchmarks"，第一环是 L1（4 个扇区），第二环是 L2，第三环是 L3（具体 benchmark）
- 旭日图可交互：hover 显示名称和 benchmark 数量，点击某个扇区跳转到对应类目页
- 每个 L1 用 taxonomy 中定义的 `color` 着色

#### 区域 B：综合 Leaderboard
- 标题："综合排行 / Overall Ranking"
- 一个表格，列：排名、模型名、组织、各 L1 维度得分（LLM / AIGC / MLLM / Agent）、综合分
- 综合分 = 各 L1 维度的加权平均（默认等权）
- 每个 L1 维度得分 = 该 L1 下所有 benchmark 分数归一化后的平均
- 表头可点击排序
- 表格上方有加权滑块组（每个 L1 一个滑块，默认 25% 等权），用户拖动后实时重算排名和综合分

#### 区域 C：分类目快览
- 每个 L1 一个卡片，卡片内展示该类目的 top-5 模型迷你排行
- 卡片可点击进入类目页

#### 区域 D：Footer
- 项目说明、GitHub 链接、数据更新时间、贡献指南链接

### 4.3 类目页 `/[l1_id]/`

- 顶部：L1 名称 + 描述
- Tab 栏：L2 维度列表（如"长文本 | 对话 | 指令遵循 | 推理 | 编程"），点击切换内容，URL hash 定位（如 `/llm/#dialogue`）
- 每个 Tab 内容：
  - 该 L2 下所有 benchmark 的聚合排行表格（列：排名、模型、各 benchmark 分数、L2 综合分）
  - L2 综合分支持加权滑块（每个 benchmark 一个权重）
  - 雷达图（ECharts radar）：以该 L2 下各 benchmark 为维度，叠加展示 top-5 模型（或用户选择的模型）
  - 每行 benchmark 名称可点击跳转详情页
  - 分数来源标记：official 蓝色标签，community 灰色标签，self_reported 黄色标签

### 4.4 详情页 `/[l1_id]/[benchmark_id]/`

- 顶部信息卡：benchmark 名称、一句话描述、官方链接按钮、论文链接按钮
- 评测说明区：详细的中英文描述（来自 benchmark YAML 的 description 字段）
- 评分指标说明：表格列出所有 metrics，说明每个指标的含义、方向（越高越好/越低越好）、取值范围
- Leaderboard：该 benchmark 的完整排行表，列：排名、模型、各 metric 分数、数据来源、更新日期
  - 支持按任一 metric 排序
  - 支持搜索模型名
- 数据样例区（如有 samples 数据）：
  - 展示 1-2 个示例，每个示例包含 input / output 两栏卡片
  - 如有 explanation 字段则在样例下方展示说明
- 底部："返回类目页" 面包屑导航

### 4.5 对比页 `/compare/`

- 顶部：模型选择器（多选下拉，最多选 5 个模型）
- 选中后展示：
  - 全维度对比表格：行是所有 benchmark（按 L1 > L2 分组），列是选中的模型，单元格是分数
  - 分数高亮：每行的最高分加粗 + 浅绿背景
  - 雷达图叠加：以 L2 维度为轴，选中模型叠加在同一雷达图上
  - 柱状图：以 L1 为维度的得分对比柱状图

---

## 5. 交互组件清单

以下组件需要实现为 React island（带 `client:load` 或 `client:visible`）：

### 5.1 SunburstChart
- 基于 ECharts sunburst
- Props: taxonomy data（三级结构）
- 交互：hover tooltip，click 跳转
- 响应式：移动端缩小但保持可交互

### 5.2 LeaderboardTable
- Props: rows（模型 + 分数数组）、columns 定义、是否可搜索
- 功能：列排序（升降序切换）、搜索过滤、分数来源标签、排名序号
- 行 hover 高亮，行可选中（用于对比页）
- 响应式：移动端水平滚动，固定模型名列

### 5.3 WeightSliders
- Props: dimensions 数组（每个维度名 + 初始权重）、onChange 回调
- 功能：滑块拖动实时更新，权重归一化（总和 100%），重置按钮
- 与 LeaderboardTable 联动：权重变化 → 重新计算综合分 → 表格重排序

### 5.4 RadarChart
- 基于 ECharts radar
- Props: dimensions 数组、models 数组（每个含各维度分数）、model colors
- 功能：叠加多模型，hover 显示具体分值，legend 可点击切换显示隐藏

### 5.5 ModelCompareSelector
- 多选下拉组件，最多选 5 个模型
- 搜索过滤、已选标签展示、清空按钮
- 选中变化触发对比表格和雷达图更新

### 5.6 SampleViewer
- 简单的 input/output 双栏卡片展示
- 支持中英文切换
- 代码高亮（如果样例包含代码）

### 5.7 LanguageSwitcher
- 右上角按钮/下拉，切换中英文
- 切换后所有页面文本同步更新
- 语言偏好存 URL query param（`?lang=zh` / `?lang=en`）或用 Astro i18n routing

---

## 6. 国际化（i18n）方案

推荐使用 Astro 的 i18n routing：
- `/zh/` 前缀为中文版，`/en/` 前缀为英文版
- 默认语言中文（`/` 重定向到 `/zh/`）
- 数据文件中所有面向用户的文本字段都有 `_zh` / `_en` 后缀
- 组件通过当前语言参数决定读取 `name_zh` 还是 `name_en`
- UI 固定文本（按钮、表头等）用一个 `src/i18n/translations.ts` 集中管理

---

## 7. 开发分阶段执行计划

### Phase 1：骨架（Day 1-2）
1. `npm create astro@latest` 初始化项目
2. 安装 React integration、Tailwind、ECharts
3. 定义 content collections + Zod schema（按 §3 的结构）
4. 创建 5 个种子 benchmark 的完整 YAML 数据（参考 §3 中的分类树，每个 L1 至少 1 个 benchmark 有完整数据）
5. 创建 5 个模型的 models.yaml
6. 实现基础 layout：全局导航栏、footer、暗色/亮色主题切换
7. 首页框架：旭日图占位 + 静态排行表占位
8. **此阶段结束时应可 `astro build` 并部署一个有真实数据的静态站**

### Phase 2：核心页面（Day 3-5）
1. 实现首页旭日图组件（ECharts sunburst，从 taxonomy 数据驱动）
2. 实现 LeaderboardTable React 组件（排序、搜索）
3. 实现首页综合 Leaderboard（含 WeightSliders 加权）
4. 实现类目页模板：tab 切换、聚合排行、雷达图
5. 实现 benchmark 详情页模板：信息卡、排行、样例
6. 路由串联：旭日图点击 → 类目页，表格行点击 → 详情页
7. 面包屑导航

### Phase 3：对比与打磨（Day 6-8）
1. 实现对比页：ModelCompareSelector + 全维度表格 + 雷达叠加
2. 中英文国际化：i18n routing + translations
3. 响应式适配：移动端导航、表格水平滚动、图表自适应
4. SEO：每个页面的 title / description / og 标签
5. 部署流水线：GitHub Actions → astro build → deploy
6. 验证导入 Skill：用一篇真实 arxiv 论文走通完整导入流程（§11），确认生成的 YAML 通过 schema 校验并正确渲染

### Phase 4：扩充数据（持续）
- 按实际需求持续新增 benchmark YAML 和 score YAML
- 新增只需：
  1. 在 taxonomy YAML 中注册 benchmark id
  2. 新建 benchmark 描述 YAML
  3. 新建 score 数据 YAML
  4. `git push` → 自动 build → 上线

---

## 8. 关键实现细节

### 8.1 分数归一化
不同 benchmark 的分数范围不同（有的 0-100，有的 0-1，有的越低越好）。聚合排行和对比需要归一化：
- 读取 benchmark 定义中的 `range` 和 `higher_is_better`
- 归一化公式：如果 higher_is_better 为 true，`normalized = (score - min) / (max - min) * 100`
- 如果 higher_is_better 为 false，`normalized = (1 - (score - min) / (max - min)) * 100`
- 如果没有 range 字段，用该 benchmark 所有模型分数的 min/max 做动态归一化

### 8.2 加权综合分计算
```
L1_score = Σ(weight_benchmark_i * normalized_score_i) / Σ(weight_benchmark_i)
overall_score = Σ(weight_L1_j * L1_score_j) / Σ(weight_L1_j)
```
默认所有权重等分。用户通过 WeightSliders 调整时，在客户端实时重算，不需要重新 build。

### 8.3 缺失分数处理
某模型可能没有某些 benchmark 的分数：
- 表格中显示 "—"
- 计算综合分时，只在有分数的维度上计算加权平均（跳过缺失维度）
- 雷达图中缺失维度的点显示在 0 位置，用虚线连接

### 8.4 Astro 数据流
```
YAML files (src/content/)
    ↓ build time
Astro getCollection() / getEntry()
    ↓
.astro page templates (server-side, generates HTML)
    ↓ props
React island components (client-side, handles interaction)
```

关键模式：在 `.astro` 文件中查询所有数据并序列化为 JSON，通过 props 传给 React island：

```astro
---
// src/pages/llm/index.astro
import { getCollection } from 'astro:content';
import LeaderboardTable from '../../components/LeaderboardTable';

const taxonomy = await getCollection('taxonomy');
const scores = await getCollection('scores');
const models = await getCollection('models');
// ...数据处理逻辑
const tableData = computeLeaderboardData(taxonomy, scores, models, 'llm');
---

<Layout title="LLM Benchmarks">
  <LeaderboardTable client:load data={tableData} />
</Layout>
```

### 8.5 旭日图数据结构
ECharts sunburst 需要嵌套 children 结构：
```javascript
{
  name: "AI Benchmarks",
  children: [
    {
      name: "LLM",          // L1
      value: 12,             // benchmark 总数（决定扇区面积）
      itemStyle: { color: "#3B82F6" },
      children: [
        {
          name: "长文本",    // L2
          children: [
            { name: "LongBench", value: 1 },  // L3
            { name: "RULER", value: 1 },
          ]
        },
        // ...
      ]
    },
    // ...其他 L1
  ]
}
```

---

## 9. 文件结构参考

```
benchmark-hub/
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── BENCHMARK_HUB_PROMPT.md        ← 本文件
│
├── src/
│   ├── content/
│   │   ├── config.ts               ← Zod schemas
│   │   ├── taxonomy/
│   │   │   ├── llm.yaml
│   │   │   ├── aigc.yaml
│   │   │   ├── mllm.yaml
│   │   │   └── agent.yaml
│   │   ├── benchmarks/
│   │   │   ├── longbench.yaml
│   │   │   ├── mt_bench.yaml
│   │   │   ├── mmmu.yaml
│   │   │   └── ...
│   │   ├── scores/
│   │   │   ├── longbench.yaml
│   │   │   ├── mt_bench.yaml
│   │   │   └── ...
│   │   └── models/
│   │       └── models.yaml
│   │
│   ├── components/                  ← React islands
│   │   ├── SunburstChart.tsx
│   │   ├── LeaderboardTable.tsx
│   │   ├── WeightSliders.tsx
│   │   ├── RadarChart.tsx
│   │   ├── ModelCompareSelector.tsx
│   │   ├── SampleViewer.tsx
│   │   └── LanguageSwitcher.tsx
│   │
│   ├── layouts/
│   │   └── Layout.astro             ← 全局 layout（nav, footer, theme）
│   │
│   ├── pages/
│   │   ├── index.astro              ← 首页
│   │   ├── [l1]/
│   │   │   ├── index.astro          ← 类目页
│   │   │   └── [benchmark].astro    ← 详情页
│   │   └── compare.astro            ← 对比页
│   │
│   ├── lib/
│   │   ├── normalize.ts             ← 分数归一化工具
│   │   ├── aggregate.ts             ← 加权聚合计算
│   │   └── data.ts                  ← 数据查询辅助函数
│   │
│   ├── i18n/
│   │   ├── translations.ts          ← UI 固定文本翻译
│   │   └── utils.ts                 ← i18n 工具函数
│   │
│   └── styles/
│       └── global.css               ← Tailwind directives + 自定义变量
│
├── public/
│   └── favicon.svg
│
└── .github/
    └── workflows/
        └── deploy.yml               ← CI/CD
```

---

## 10. 种子数据要求

Phase 1 结束时，至少需要以下种子数据才能让 demo 跑通：

- **taxonomy**: 4 个 L1 全部定义，每个 L1 至少 2 个 L2，每个 L2 至少 1 个 benchmark id
- **benchmarks**: 至少 8 个 benchmark 有完整描述（每个 L1 至少 2 个）
- **scores**: 每个种子 benchmark 至少有 5 个模型的分数
- **models**: 至少 8 个模型（覆盖 OpenAI / Anthropic / Google / Meta / Alibaba 等主流组织）

种子数据中的分数不要求完全准确（可以参考公开数据近似填写），关键是格式正确、覆盖完整，能让所有页面组件正常渲染。

---

## 11. Benchmark 导入 Skill（Claude Code 工作流）

### 11.1 概述

本节定义了一个 Claude Code skill：从各种原始素材（论文、PDF、LaTeX 等）中解析 benchmark 信息，生成符合网站 schema 的 YAML 文件。

**核心原则：无论输入是什么格式，输出永远是标准 YAML 文件**。导入 = 帮用户填 YAML。生成的 YAML 文件放入 `src/content/` 对应目录，`astro build` 后自动出现在网站上。

### 11.2 支持的导入来源

| 来源 | 触发方式 | 预处理 |
|------|----------|--------|
| arxiv 链接 | 用户提供 `https://arxiv.org/abs/xxxx.xxxxx` | 下载 PDF，提取正文；尝试获取 LaTeX 源码（arxiv 提供 `/e-print/` 端点） |
| LaTeX 项目压缩包 | 用户提供 `.zip` / `.tar.gz` 文件路径 | 解压，定位主 `.tex` 文件，解析 LaTeX 源码 |
| PDF 文件 | 用户提供 `.pdf` 文件路径 | 提取文本（优先用 `pdftotext`，fallback 到 `pymupdf`） |
| Markdown 文件 | 用户提供 `.md` 文件路径 | 直接读取 |
| 手动输入 | 用户口述或粘贴信息 | 无预处理 |

### 11.3 解析目标

从原始素材中提取以下信息，对应网站 YAML schema 的字段：

#### A. Benchmark 元信息 → `src/content/benchmarks/{id}.yaml`

| 字段 | 解析策略 | 必填 |
|------|----------|------|
| `id` | 从 benchmark 名称生成 snake_case（如 "LongBench" → `longbench`） | ✓ |
| `name` | 论文标题或 benchmark 名称原文 | ✓ |
| `name_zh` / `name_en` | 英文取原文，中文尝试翻译；如论文本身是中文则反之 | ✓ |
| `url` | GitHub 链接（从论文 footnote、abstract 或 "Code available at" 提取） | ✓ |
| `paper` | arxiv 链接或 DOI | 选填 |
| `description_zh` / `description_en` | 从 Abstract + Introduction 摘要生成，200 字以内 | ✓ |
| `metrics` | 从论文的实验部分提取评测指标（表头、指标说明） | ✓ |
| `metrics[].higher_is_better` | 从上下文推断（accuracy → true, perplexity → false, FID → false） | ✓ |
| `metrics[].range` | 如能确定则填写（如 accuracy [0, 100]），否则留空 | 选填 |
| `samples` | 从论文的 examples / case study 部分提取 1-2 个 | 选填 |

#### B. 分数数据 → `src/content/scores/{id}.yaml`

| 字段 | 解析策略 | 必填 |
|------|----------|------|
| `benchmark_id` | 同上面的 id | ✓ |
| `results[].model_id` | 从论文表格中提取模型名 → 匹配 `models.yaml` 中已有的 id；未匹配的记录原名并标注 `# TODO: add to models.yaml` | ✓ |
| `results[].scores` | 从论文结果表格提取，key 对应 metrics 中定义的 id | ✓ |
| `results[].source` | 论文中报告的设为 `"official"`，其他设为 `"community"` | ✓ |

#### C. 分类归属 → 更新 `src/content/taxonomy/{l1}.yaml`

| 操作 | 说明 |
|------|------|
| 判断 L1 | 根据 benchmark 主题判断属于 llm / aigc / mllm / agent |
| 判断 L2 | 根据评测能力归入现有 subcategory，或建议新建 |
| 注册 | 在对应 taxonomy YAML 的 subcategory.benchmarks 数组中添加 benchmark id |

#### D. 新模型（如需）→ 更新 `src/content/models/models.yaml`

如果论文中出现 `models.yaml` 里没有的模型，生成新条目：
```yaml
- id: new_model_name      # snake_case
  name: "New Model Name"   # 原始名称
  org: "Organization"
  release_date: "2025-01"  # 从论文推断
  color: "#888888"          # 默认灰色，后续手动调整
  tags: ["open_weight"]     # 从论文推断
```

### 11.4 操作流程（Claude Code 执行步骤）

用户对 Claude Code 说类似以下的话：

```
"帮我导入这个 benchmark：https://arxiv.org/abs/2308.14508"
"从这个 PDF 导入 benchmark：/path/to/paper.pdf"
"导入这个 LaTeX 项目：/path/to/project.zip"
"我要手动添加一个 benchmark，名字是 XXX，评测指标是 ..."
```

Claude Code 的执行步骤：

```
Step 1: 获取素材
├─ arxiv 链接 → 下载 PDF（curl），尝试获取 LaTeX 源码
├─ 压缩包 → 解压到临时目录
├─ PDF → 准备文本提取
├─ MD → 直接读取
└─ 手动 → 跳到 Step 2

Step 2: 提取文本
├─ LaTeX → 读取 .tex 文件，解析 \begin{table}...\end{table} 结果表格
├─ PDF → pdftotext 或 pymupdf 提取全文
└─ 重点关注：Abstract、Introduction（benchmark 描述）、
   Experiments/Results（指标定义 + 分数表格）、Examples（样例）

Step 3: 解析并生成 YAML
├─ 读取现有 src/content/ 下的文件，了解已有数据
├─ 生成 benchmark YAML（src/content/benchmarks/{id}.yaml）
├─ 生成 scores YAML（src/content/scores/{id}.yaml）
├─ 更新 taxonomy YAML（在对应 L1 文件的 subcategory 中注册）
├─ 如有新模型，更新 models.yaml
└─ 所有生成内容严格遵循 §3 中定义的 schema 格式

Step 4: 校验
├─ 运行 astro build（或 astro check）确认 schema 校验通过
├─ 检查生成的 YAML 中 id 引用的一致性：
│   ├─ scores.yaml 中的 benchmark_id 对应 benchmarks/ 下的文件
│   ├─ scores.yaml 中的 model_id 对应 models.yaml 中的条目
│   └─ taxonomy.yaml 中的 benchmarks 数组包含新 id
└─ 输出摘要：新增了什么文件、修改了什么文件、有哪些需要人工确认的项

Step 5: 报告（输出给用户）
├─ "已生成以下文件：..."
├─ "以下信息需要人工确认：..."（如分数不确定、分类归属有疑问）
├─ "以下模型是新增的，请确认信息：..."
└─ "运行 astro build 验证通过/失败，错误信息：..."
```

### 11.5 解析策略细节

#### 从 LaTeX 表格提取分数

LaTeX 论文中的结果表格通常格式如下：
```latex
\begin{table}[t]
\caption{Main results on LongBench.}
\begin{tabular}{l|ccccc|c}
\hline
Model & Task1 & Task2 & Task3 & Task4 & Task5 & Avg. \\
\hline
GPT-4 & 58.2 & 62.1 & 55.3 & 49.8 & 61.0 & 57.3 \\
Claude-3 & 56.1 & 60.5 & 54.8 & 51.2 & 59.3 & 56.4 \\
\end{tabular}
\end{table}
```

解析规则：
- 找到包含模型名称列和数值列的表格
- 表头行确定 metric 名称
- 数据行提取模型名和分数
- 如有 "Avg" / "Average" / "Overall" 列，优先作为主要 metric
- 多个表格时，优先取 "Main Results" / "Overall Results" 标题的表格

#### 从 PDF 提取分数

PDF 提取表格比 LaTeX 困难，策略：
1. 先用 `pdftotext -layout` 保持表格对齐
2. 如果文本提取质量差，用 `pymupdf` 逐页提取
3. 将提取的文本交给 Claude 进行结构化理解（此时 Claude Code 自身就是解析引擎）
4. 遇到无法解析的表格，标注 `# TODO: manually verify scores` 并尽力填写

#### 模型名称匹配

论文中的模型名和 `models.yaml` 中的 id 可能不一致。匹配策略：
```
论文中写的          →  匹配到的 model_id
"GPT-4o"           →  gpt_4o
"GPT-4 Turbo"      →  gpt_4_turbo
"Claude 3 Opus"    →  claude_3_opus
"Claude Opus 4"    →  claude_opus_4
"Llama-3-70B"      →  llama_3_70b
"Qwen2.5-72B"      →  qwen_2_5_72b
```

规则：
- 转 lowercase，去掉连字符和空格，用下划线连接
- 版本号中的点转为下划线（2.5 → 2_5）
- 匹配失败时，生成新的 model_id 并标注 `# NEW MODEL - verify`
- 在输出摘要中列出所有新模型供用户确认

#### 指标方向推断

常见指标的 `higher_is_better` 默认值：
```
higher_is_better: true   → accuracy, score, F1, BLEU, ROUGE, pass@k, 
                            win_rate, avg_score, EM (exact match)
higher_is_better: false  → perplexity, FID, loss, error_rate, WER,
                            latency, inference_time
```

不确定的标注 `# TODO: verify direction`。

### 11.6 导入示例

#### 示例 1：从 arxiv 导入

用户：
```
帮我导入这个 benchmark：https://arxiv.org/abs/2308.14508
它属于 LLM > 长文本 类目
```

Claude Code 执行：
1. `curl -L https://arxiv.org/pdf/2308.14508 -o /tmp/longbench.pdf`
2. `pdftotext -layout /tmp/longbench.pdf /tmp/longbench.txt`
3. 阅读文本，提取 benchmark 信息
4. 生成 `src/content/benchmarks/longbench.yaml`
5. 生成 `src/content/scores/longbench.yaml`
6. 更新 `src/content/taxonomy/llm.yaml`（在 long_context.benchmarks 中添加 `longbench`）
7. 检查模型列表，如有新模型更新 `models.yaml`
8. 运行 `npx astro check` 校验
9. 报告结果

#### 示例 2：从 LaTeX 压缩包导入

用户：
```
从这个项目导入 benchmark：~/Downloads/mmmu_latex.zip
```

Claude Code 执行：
1. `unzip ~/Downloads/mmmu_latex.zip -d /tmp/mmmu_latex/`
2. `find /tmp/mmmu_latex/ -name "*.tex"` 定位主文件
3. 读取 .tex 文件，解析表格和描述
4. 同上 Step 3-9

#### 示例 3：手动输入

用户：
```
我要添加一个 benchmark：
- 名称：ToolBench
- 类目：Agent > 工具使用
- 指标：Pass Rate (越高越好, 0-100), Win Rate (越高越好, 0-100)
- GPT-4: Pass Rate 65.3, Win Rate 58.2
- Claude Opus 4: Pass Rate 71.1, Win Rate 63.5
- Gemini 2.5 Pro: Pass Rate 62.8, Win Rate 55.0
```

Claude Code 执行：
1. 跳过下载/解析，直接从用户输入构建数据
2. 生成 YAML 文件
3. 更新 taxonomy
4. 校验 + 报告

### 11.7 生成文件模板

Claude Code 生成 YAML 时，严格使用以下模板，不要增减字段：

**benchmarks/{id}.yaml 模板：**
```yaml
id: {snake_case_id}
name: "{original_name}"
name_zh: "{中文名}"
name_en: "{English name}"
url: "{github_or_project_url}"
paper: "{arxiv_or_doi_url}"
description_zh: |
  {从论文 Abstract/Intro 提炼的中文描述，200字以内}
description_en: |
  {从论文 Abstract/Intro 提炼的英文描述，200字以内}
metrics:
  - id: {metric_snake_case}
    name: "{Metric Display Name}"
    description: "{一句话说明}"
    higher_is_better: {true/false}
    range: [{min}, {max}]             # 如能确定
samples:                               # 如能从论文提取
  - input_zh: "{中文输入样例}"
    input_en: "{English input sample}"
    output_zh: "{中文输出样例}"
    output_en: "{English output sample}"
    explanation_zh: "{样例说明}"
    explanation_en: "{Sample explanation}"
```

**scores/{id}.yaml 模板：**
```yaml
benchmark_id: {same_id}
updated: "{YYYY-MM-DD}"
results:
  - model_id: {existing_or_new_model_id}
    scores:
      {metric_id}: {number}
    source: "{official/community/self_reported}"
    source_url: "{url_if_available}"
    date: "{YYYY-MM-DD}"
```

### 11.8 错误处理

| 情况 | 处理方式 |
|------|----------|
| PDF 文本提取质量差（扫描件、图表为主） | 告知用户提取困难，尽力输出骨架 YAML 并标注 `# TODO` |
| arxiv 链接无法访问 | 报错，建议用户手动下载 PDF 后走 PDF 导入流程 |
| 论文中无结果表格 | 只生成 benchmark 描述 YAML，scores YAML 留空 `results: []`，提示用户后续补充 |
| 模型名无法匹配 | 生成新 model 条目，标注 `# NEW MODEL`，在报告中高亮 |
| 分类归属不确定 | 在报告中列出可能的 L1/L2 选项，让用户选择 |
| 指标方向不确定 | 标注 `# TODO: verify higher_is_better`，在报告中提醒 |

---

## 12. 编码规范

- TypeScript strict mode
- 组件文件名 PascalCase，工具函数文件名 camelCase
- 数据文件中的 id 统一用 snake_case
- CSS 优先使用 Tailwind utility class，自定义 CSS 尽量少
- React 组件保持纯函数式，使用 hooks 管理状态
- 所有颜色值定义在 Tailwind 配置或 CSS 变量中，不在组件里硬编码
- Git commit message 用英文，格式：`feat: add leaderboard table component`

---

## 13. 验收标准

项目完成时应满足以下条件：

- [ ] `astro build` 零错误，生成纯静态文件
- [ ] 首页旭日图正确渲染三级分类，点击可跳转
- [ ] 首页综合 Leaderboard 加权滑块正常工作
- [ ] 类目页 tab 切换正常，每个 tab 有排行和雷达图
- [ ] 详情页显示完整 benchmark 信息和数据样例
- [ ] 对比页可选模型并展示表格 + 雷达叠加
- [ ] 中英文切换全局生效
- [ ] 暗色/亮色主题切换正常
- [ ] 移动端基本可用（表格可横滑，图表自适应）
- [ ] 新增一个 benchmark 只需添加 YAML 文件 + rebuild（验证低代码扩展性）
- [ ] 从 arxiv 链接导入 benchmark：Claude Code 能自动生成完整 YAML 并通过 schema 校验
- [ ] 从 PDF 导入 benchmark：能提取 benchmark 名称、指标、分数表，生成有效 YAML
- [ ] 手动输入导入：能从用户口述信息生成格式正确的 YAML
- [ ] 导入后 `astro build` 零错误，新 benchmark 自动出现在网站对应页面
