# Paper visualization / Benchmark Hub

静态站点（Astro）：按 taxonomy 展示实验室相关 benchmark 与论文信息，支持中英文与模型对比页。

## 本地运行

| 命令 | 说明 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run dev` | 开发服务，默认 `localhost:4321` |
| `npm run build` | 构建到 `dist/` |
| `npm run preview` | 预览构建结果 |

根路径 `/` 会重定向到 `/zh/`。

## 全站视觉

顶栏主导航：Logo 右侧**紧邻**内联链接（`Home`、各一级领域、`Compare`），最右为语言/主题/汉堡菜单（`ml-auto`），避免整块链接在视口里**居中一团**。领域页转盘：viewBox 高度 `VB_H` 较早期更矮以压低整区高度；弧为半径 `R_arc` 的描边，**按钮轨道半径为 `R_orbit = R_arc * orbitOutset`（在弧外）**；`phiOpeningExtraDeg` 加大开口，弧端可略超出 viewBox 顶边，由 `.domain-turntable` / `__svg-wrap` 的 `overflow: visible` 保留绘制。`ResizeObserver`（`requestAnimationFrame` 防抖）写入 `--hub-*` 与 `--orbit-px`；节点 `transform` 为 **`translate(orbit) translate(-50%,-50%)`**；`aspect-ratio: 1400 / VB_H` 与 `DomainListingLayout` 中常数一致。

顶栏、`<main>`、页脚在 `Layout.astro` 中为**全宽版心**（`w-full max-w-none` + 分级水平 `padding`），不再用 `max-w-7xl`（约 1280px）居中裁切，宽屏上会铺满除边距外的区域；长文可读性由各页内部 `max-w-*`（如标题、说明）控制。全站 `header` 为 `sticky top-0 z-[100] isolate`，`main` 为 `relative z-0 isolate`，把主内容（含转盘 `transform` 动画时的合成层）压在顶栏堆叠上下文之下；顶栏仍有实色底。下拉等浮层用高于 `100` 的 `z-index`（如对比页 `ModelCompareSelector` 为 `z-[110]`）。

所有页面使用同一套**纸质**主题（`body.site-paper`）：米白底、低对比暖色纸张纹理（`global.css` 中避免 `multiply` 叠细噪点，减轻久看偏色与疲劳）、无顶栏毛玻璃。首页主视觉：粒子 Canvas 作为 **hero 最底层全幅背景**（`z-index: 0`），左侧标题与说明叠在上层（`z-index: 1`），可互相重叠；粒子经 `scale` + 上移，略大于原单独一栏时的尺寸。首页在 `.home-editorial-main` 内将 `--color-bg-card` 与页面 `--color-bg` 对齐，避免 hero 与领域卡片之间出现色块台阶；hero 内去掉额外 multiply 噪点层，粒子改为低饱和墨色，且 `home-hero` 使用 `overflow: hidden` 防止粒子层向下溢出到卡片区。

首页另含非对称大标题与分类区：**首屏**仅粒子背景 + 左侧文案（hero 高度为 `100dvh` 减顶栏）；其下 `#home-categories` 为左侧 **2×2** 领域卡片 + 右侧 **3D 旋转 benchmark 标签云**（`BenchmarkTagCloud3D.tsx`，SVG + 斐波那契球面分布；直接叠在纸质背景上、无边框容器；每项 `<a>` 链至对应 `/{locale}/{l1}/{benchmark}/` 详情页；尊重 `prefers-reduced-motion`）。用户**向下滚动**或点击 hero 锚点进入该区域。除首页外子页**仅换肤**，路由与功能未改。文案在 `src/i18n/translations.ts` 的 `home_*` 等键中维护。

一级领域页（如 `/zh/llm/`）由 `DomainListingLayout.astro` 排版：标题居中，其下为面包屑 `首页 / 领域(Domains) / 当前子类`；子类为**转盘**：SVG 画出浅色弧线，标签沿圆周放置，整盘旋转使**选中项对准弧线最低点（居中）**；`--dial-rot-deg` 取 **与 `anglesDeg[idx]` 同号**（与教科书「反向转动 −θ」不同——须与 `hubDir` + CSS `rotate` 顺时针为正一致）。图标见 `src/lib/domainTabIcons.ts`。LLM 默认选中 `role_playing`。下方为分类说明 + `BenchmarkCardGrid`（`editorialCards`）。数据仍来自 `src/content/taxonomy/*.yaml`。

## 内容

- `src/content/taxonomy/`：一级分类与子类、benchmark 列表
- `src/content/benchmarks/`、`scores/`、`models/`：条目与数据
