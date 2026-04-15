export const translations = {
  zh: {
    site_title: "Benchmark Hub",
    site_slogan: "实验室 Benchmark 与评测成果总览",
    nav_home: "首页",
    nav_compare: "模型对比",
    overall_ranking: "综合排名",
    rank: "排名",
    model: "模型",
    organization: "机构",
    overall_score: "综合分",
    category_quickview: "分类速览",
    top_models: "Top 5 模型",
    view_all: "查看全部",
    weight_reset: "重置权重",
    search_placeholder: "搜索模型...",
    source_official: "官方",
    source_community: "社区",
    source_self_reported: "自报",
    dark_mode: "深色模式",
    light_mode: "浅色模式",
    language: "语言",
    footer_desc: "围绕实验室论文与基准工作的前端展示与模型对比站点。",
    footer_data_updated: "数据更新时间",
    benchmark_info: "工作说明",
    paper_overview: "论文概览",
    metrics_desc: "评分指标",
    data_samples: "数据样例",
    leaderboard: "排行榜",
    back_to_category: "返回一级目录",
    compare_title: "模型对比",
    compare_desc: "选择最多 5 个模型进行跨基准对比",
    select_models: "选择模型",
    clear_all: "清空",
    higher_better: "越高越好",
    lower_better: "越低越好",
    score_range: "取值范围",
    no_data: "暂无数据",
    no_results: "没有匹配结果",
    input: "输入",
    output: "输出",
    explanation: "说明",
    official_link: "官方链接",
    glance: "工作概览",
    resources: "资源链接",
    downloads: "下载入口",
    key_findings: "补充信息",
    leaderboard_note: "榜单说明",
    metric_name: "指标",
    metric_description: "说明",
    metric_direction: "方向",
    adjust_weights: "调整权重",
    collapse: "收起",
    category: "类别",
  },
  en: {
    site_title: "Benchmark Hub",
    site_slogan: "A lab-centered showcase for benchmark papers and model evaluations",
    nav_home: "Home",
    nav_compare: "Compare",
    overall_ranking: "Overall Ranking",
    rank: "Rank",
    model: "Model",
    organization: "Organization",
    overall_score: "Overall Score",
    category_quickview: "Category Quick View",
    top_models: "Top 5 Models",
    view_all: "View All",
    weight_reset: "Reset Weights",
    search_placeholder: "Search models...",
    source_official: "Official",
    source_community: "Community",
    source_self_reported: "Self-reported",
    dark_mode: "Dark Mode",
    light_mode: "Light Mode",
    language: "Language",
    footer_desc: "A front-end showcase for the lab's benchmark papers and model comparisons.",
    footer_data_updated: "Data updated",
    benchmark_info: "Benchmark Description",
    paper_overview: "Paper Overview",
    metrics_desc: "Evaluation Metrics",
    data_samples: "Data Samples",
    leaderboard: "Leaderboard",
    back_to_category: "Back to Category",
    compare_title: "Model Comparison",
    compare_desc: "Select up to 5 models for cross-benchmark comparison",
    select_models: "Select Models",
    clear_all: "Clear All",
    higher_better: "Higher is better",
    lower_better: "Lower is better",
    score_range: "Score Range",
    no_data: "No data available",
    no_results: "No results found",
    input: "Input",
    output: "Output",
    explanation: "Explanation",
    official_link: "Official Link",
    glance: "At a Glance",
    resources: "Resources",
    downloads: "Downloads",
    key_findings: "More from the Paper",
    leaderboard_note: "Leaderboard Note",
    metric_name: "Metric",
    metric_description: "Description",
    metric_direction: "Direction",
    adjust_weights: "Adjust Weights",
    collapse: "Collapse",
    category: "Category",
  }
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof translations['zh'];

const BASE_PATH = import.meta.env.BASE_URL === '/'
  ? ''
  : import.meta.env.BASE_URL.replace(/\/$/, '');

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key] || translations['zh'][key] || key;
}

export function stripBasePath(pathname: string): string {
  if (!BASE_PATH) return pathname || '/';
  if (pathname === BASE_PATH) return '/';
  if (pathname.startsWith(`${BASE_PATH}/`)) {
    return pathname.slice(BASE_PATH.length) || '/';
  }
  return pathname || '/';
}

export function withBase(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${normalizedPath}` || '/';
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, locale] = stripBasePath(url.pathname).split('/');
  if (locale === 'en') return 'en';
  return 'zh';
}

export function getLocalizedPath(path: string, locale: Locale): string {
  return withBase(`/${locale}${path}`);
}
