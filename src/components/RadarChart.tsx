import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface ModelData {
  name: string;
  color: string;
  values: number[];
}

interface Props {
  dimensions: string[];
  models: ModelData[];
  max?: number;
}

export default function RadarChart({ dimensions, models, max = 100 }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    instanceRef.current = chart;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
      },
      legend: {
        data: models.map(m => m.name),
        bottom: 0,
        textStyle: {
          color: isDark ? '#94a3b8' : '#64748b',
        },
      },
      radar: {
        indicator: dimensions.map(d => ({ name: d, max })),
        shape: 'polygon',
        splitArea: {
          areaStyle: {
            color: isDark
              ? ['rgba(30,41,59,0.3)', 'rgba(30,41,59,0.5)']
              : ['rgba(248,250,252,0.5)', 'rgba(241,245,249,0.5)'],
          },
        },
        axisLine: {
          lineStyle: { color: isDark ? '#334155' : '#e2e8f0' },
        },
        splitLine: {
          lineStyle: { color: isDark ? '#334155' : '#e2e8f0' },
        },
        axisName: {
          color: isDark ? '#94a3b8' : '#64748b',
          fontSize: 11,
        },
      },
      series: [
        {
          type: 'radar',
          data: models.map(m => ({
            name: m.name,
            value: m.values,
            lineStyle: { color: m.color, width: 2 },
            areaStyle: { color: m.color, opacity: 0.1 },
            itemStyle: { color: m.color },
            symbol: 'circle',
            symbolSize: 5,
          })),
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    const observer = new MutationObserver(() => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      chart.setOption({
        legend: { textStyle: { color: dark ? '#94a3b8' : '#64748b' } },
        radar: {
          splitArea: {
            areaStyle: {
              color: dark
                ? ['rgba(30,41,59,0.3)', 'rgba(30,41,59,0.5)']
                : ['rgba(248,250,252,0.5)', 'rgba(241,245,249,0.5)'],
            },
          },
          axisLine: { lineStyle: { color: dark ? '#334155' : '#e2e8f0' } },
          splitLine: { lineStyle: { color: dark ? '#334155' : '#e2e8f0' } },
          axisName: { color: dark ? '#94a3b8' : '#64748b' },
        },
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      chart.dispose();
    };
  }, [dimensions, models, max]);

  return (
    <div
      ref={chartRef}
      className="w-full"
      style={{ height: '400px' }}
    />
  );
}
