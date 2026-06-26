import React from 'react';

interface LineChartDataset {
  label: string;
  values: number[];
  color: string; // e.g. 'stroke-sky-500'
}

interface LineChartProps {
  data: {
    labels: string[];
    datasets: LineChartDataset[];
  };
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const { labels, datasets } = data;
  if (datasets.length === 0 || datasets.every(d => d.values.length === 0)) return null;

  const chartHeight = 300;
  const chartWidth = 500;
  const yAxisLabelWidth = 40;
  const xAxisLabelHeight = 40;
  const legendHeight = 30;

  const contentWidth = chartWidth - yAxisLabelWidth;
  const contentHeight = chartHeight - xAxisLabelHeight - legendHeight;
  
  const viewBoxWidth = chartWidth;
  const viewBoxHeight = chartHeight;

  const allValues = datasets.flatMap(d => d.values);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue <= 0 ? 10 : maxValue - minValue;

  // Y-axis ticks
  const numTicks = 5;
  const ticks = Array.from({ length: numTicks + 1 }, (_, i) => {
    const value = minValue + (valueRange / numTicks) * i;
    return {
      id: i,
      value: Math.round(value),
      y: contentHeight - (i / numTicks) * contentHeight,
    };
  });

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        width="100%"
        height={`calc(100% - ${legendHeight}px)`}
        preserveAspectRatio="xMinYMin meet"
        aria-label="Line chart showing data trends"
      >
        {/* Y-axis grid lines and labels */}
        {ticks.map((tick) => (
          <g key={tick.id}>
            <line
              x1={yAxisLabelWidth}
              y1={tick.y}
              x2={chartWidth}
              y2={tick.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={yAxisLabelWidth - 10}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="12"
              fill="#64748b"
            >
              {tick.value}
            </text>
          </g>
        ))}

        <g transform={`translate(${yAxisLabelWidth}, 0)`}>
          {/* Main line paths */}
          {datasets.map((dataset) => {
            const points = dataset.values.map((value, index) => {
              const x = (index / (dataset.values.length - 1)) * contentWidth;
              const y = contentHeight - ((value - minValue) / valueRange) * contentHeight;
              return `${x},${y}`;
            }).join(' ');
            
            return (
              <polyline
                key={dataset.label}
                fill="none"
                className={dataset.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            );
          })}
        </g>
        
        {/* X-axis labels */}
        <g transform={`translate(${yAxisLabelWidth}, ${contentHeight})`}>
          {labels.map((label, index) => {
             if (!label) return null; // Skip empty labels
             const x = (index / (labels.length - 1)) * contentWidth;
             return (
                <text key={index} x={x} y={20} textAnchor="middle" fontSize="12" fill="#64748b">
                    {label}
                </text>
             )
          })}
        </g>
      </svg>
      {/* Legend */}
      {datasets.length > 1 && (
        <div className="flex justify-center items-center gap-4 mt-2" style={{ height: `${legendHeight}px` }}>
          {datasets.map(dataset => (
            <div key={dataset.label} className="flex items-center gap-2 text-sm">
              <span className={`w-3 h-0.5 ${dataset.color.replace('stroke', 'bg')}`}></span>
              <span className="text-slate-600">{dataset.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LineChart;