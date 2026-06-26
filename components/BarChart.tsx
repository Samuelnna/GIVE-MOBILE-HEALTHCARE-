import React from 'react';

interface BarChartProps {
  data: {
    labels: string[];
    values: number[];
  };
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  const { labels, values } = data;
  const maxValue = Math.max(...values, 1); // Avoid division by zero
  const colors = ['#38bdf8', '#2dd4bf', '#f87171']; // sky, teal, red

  const chartHeight = 300;
  const chartWidth = 500;
  const barWidth = 40;
  const barMargin = 30;
  const yAxisLabelWidth = 40;
  const xAxisLabelHeight = 40;

  const totalBarWidth = barWidth + barMargin;
  const contentWidth = values.length * totalBarWidth - barMargin;
  
  const viewBoxWidth = contentWidth + yAxisLabelWidth;
  const viewBoxHeight = chartHeight + xAxisLabelHeight;

  // Y-axis ticks
  const numTicks = 5;
  const ticks = Array.from({ length: numTicks + 1 }, (_, i) => {
    const value = (maxValue / numTicks) * i;
    return {
      id: i,
      value: Math.round(value),
      y: chartHeight - (value / maxValue) * chartHeight,
    };
  });

  return (
    <div className="w-full h-full flex justify-center items-center">
        <svg
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            aria-label="Bar chart showing appointment data"
        >
            <g transform={`translate(${yAxisLabelWidth}, 0)`}>
                {/* Y-axis grid lines and labels */}
                {ticks.map((tick) => (
                    <g key={tick.id}>
                        <line
                            x1={-5}
                            y1={tick.y}
                            x2={contentWidth}
                            y2={tick.y}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                        />
                        <text
                            x={-10}
                            y={tick.y + 4}
                            textAnchor="end"
                            fontSize="12"
                            fill="#64748b"
                        >
                            {tick.value}
                        </text>
                    </g>
                ))}
                
                {/* Bars and X-axis labels */}
                {values.map((value, index) => {
                    const barHeight = (value / maxValue) * chartHeight;
                    const x = index * totalBarWidth;
                    const y = chartHeight - barHeight;

                    return (
                        <g key={labels[index]}>
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill={colors[index % colors.length]}
                                rx="4"
                                ry="4"
                            >
                                <title>{`${labels[index]}: ${value}`}</title>
                            </rect>
                            <text
                                x={x + barWidth / 2}
                                y={chartHeight + 20}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="500"
                                fill="#475569"
                            >
                                {labels[index]}
                            </text>
                        </g>
                    );
                })}

                 {/* X-axis line */}
                 <line
                    x1={0}
                    y1={chartHeight}
                    x2={contentWidth}
                    y2={chartHeight}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                />
            </g>
        </svg>
    </div>
  );
};

export default BarChart;