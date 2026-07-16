import ReactECharts from "echarts-for-react";

export default function LineChart({ title, data = [], color = "var(--teal)" }) {
  const safeData = Array.isArray(data) ? data : [];

  const chartData = safeData.map((d) => ({
    value: Number(d.count) || 0,
    name: d.label || "Sin etiqueta",
  }));

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
    },
    grid: { left: 8, right: 8, top: 8, bottom: 34, containLabel: true },
    xAxis: {
      type: "category",
      data: chartData.map((d) => d.name),
      axisLabel: {
        interval: 0,
        rotate: 0,
        fontSize: 10,
        color: "#4B5563",
      },
      axisLine: { show: false },
      axisTick: { show: false },
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#E5E7EB" } },
    },
    series: [
      {
        type: "line",
        data: chartData.map((d) => d.value),
        smooth: true,
        itemStyle: { color },
        areaStyle: {
          color: [
            {
              offset: 0,
              color: `${color}33`,
            },
            {
              offset: 1,
              color: `${color}00`,
            },
          ],
        },
        lineStyle: { color, width: 2 },
        symbol: "circle",
        symbolSize: 6,
      },
    ],
  };

  return (
    <div className="stat-card">
      <div className="stat-title">{title}</div>
      {safeData.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--gray-400)", paddingTop: 8 }}>Sin datos</div>
      ) : (
        <ReactECharts
          option={option}
          style={{ height: 220, width: "100%" }}
          notMerge
          lazyUpdate
        />
      )}
    </div>
  );
}
