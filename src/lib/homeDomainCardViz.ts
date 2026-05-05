import type { Locale } from '../i18n/translations';

export type HomeCardSubcategory = {
  name_zh: string;
  name_en: string;
  benchmarks: string[];
};

const VB_W = 120;
const VB_H = 40;
const PAD_X = 2;
const PAD_BOTTOM = 4;
const GAP = 3;
const MIN_BAR_H = 5;
const RX = 1.75;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * SVG inner HTML for home domain cards: one bar per subcategory, height ∝ benchmark count.
 */
export function homeDomainCardBarsInnerHtml(
  subcategories: HomeCardSubcategory[],
  locale: Locale
): string {
  const counts = subcategories.map(s => s.benchmarks.length);
  const n = counts.length;
  if (n === 0) return '';

  const maxCount = Math.max(1, ...counts);
  const usableW = VB_W - PAD_X * 2;
  const totalGap = GAP * Math.max(0, n - 1);
  const barW = n > 0 ? (usableW - totalGap) / n : 0;
  const baselineY = VB_H - PAD_BOTTOM;
  const maxBarH = baselineY - 6;

  const lines = subcategories.map((sc, i) => {
    const name = locale === 'zh' ? sc.name_zh : sc.name_en;
    const c = counts[i];
    return `${name}: ${c}`;
  });
  const summaryTitle = escapeXml(lines.join(' · '));

  const rects: string[] = [];
  let x = PAD_X;
  for (let i = 0; i < n; i++) {
    const c = counts[i];
    const name = locale === 'zh' ? subcategories[i].name_zh : subcategories[i].name_en;
    const tip = escapeXml(`${name}: ${c}`);
    if (c === 0) {
      x += barW + GAP;
      continue;
    }
    const hNorm = (c / maxCount) * maxBarH;
    const h = Math.max(MIN_BAR_H, hNorm);
    const y = baselineY - h;
    rects.push(
      `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" rx="${RX}" fill="currentColor"><title>${tip}</title></rect>`
    );
    x += barW + GAP;
  }

  return `<title>${summaryTitle}</title>${rects.join('')}`;
}
