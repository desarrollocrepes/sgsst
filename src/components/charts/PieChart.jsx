import ReactECharts from "echarts-for-react";

export default function PieChart({ title, data = [] }) {
  const safeData = Array.isArray(data) ? data : [];

  const chartData = safeData.map((d) => ({
    value: Number(d.count) || 0,
    name: d.label || "Sin etiqueta",
  }));

  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      left: "left",
      textStyle: { fontSize: 11, color: "#4B5563" },
    },
    series: [
      {
        type: "pie",
        radius: "50%",
        data: chartData,
        itemStyle: {
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          fontSize: 10,
          color: "#4B5563",
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
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
