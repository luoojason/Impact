export default function SparkLine({ data, color = '#6b7280', width = 64, height = 22 }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - min) / range) * (height - 2) - 1,
  ]);

  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  // Fill area under line
  const fillD = `${d} L${width},${height} L0,${height} Z`;

  const trend = data[data.length - 1] > data[0] ? '↑' : data[data.length - 1] < data[0] ? '↓' : '→';
  const last = data[data.length - 1];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <path d={fillD} fill={color} fillOpacity={0.1} />
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2" fill={color} />
      </svg>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color, fontWeight: 600 }}>
        {trend} {typeof last === 'number' ? last.toFixed(1) : ''}
      </span>
    </div>
  );
}
