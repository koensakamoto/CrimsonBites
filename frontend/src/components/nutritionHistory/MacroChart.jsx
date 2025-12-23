import React, { useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';

// Helper to get ISO week start date
function getISOWeekDates(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setDate(ISOweekStart.getDate() + 6);
  return { start: ISOweekStart, end: ISOweekEnd };
}

// Memoized custom tooltip component
const CustomTooltip = memo(({ active, payload, label, viewMode, unit }) => {
  if (!active || !payload || !payload.length) return null;

  let displayLabel = label;
  if (viewMode === 'weekly') {
    const weekMatch = /^\d{4}-W\d{1,2}$/.test(label);
    if (weekMatch) {
      const [year, weekStr] = label.split('-W');
      const { start, end } = getISOWeekDates(parseInt(year, 10), parseInt(weekStr, 10));
      displayLabel = `${format(start, 'MMM d')}–${format(end, 'MMM d')}`;
    }
  } else if (viewMode === 'monthly') {
    if (/^\d{4}-\d{2}$/.test(label)) {
      try {
        displayLabel = format(parseISO(label + '-01'), 'MMM yyyy');
      } catch {}
    }
  }
  const totalKcal = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
  return (
    <div className="bg-white p-3 rounded shadow text-sm" style={{ border: '1px solid #eee', minWidth: 140 }}>
      <div><strong>Date:</strong> {displayLabel}</div>
      {payload.map((entry, idx) => (
        <div key={idx} style={{ color: entry.color, marginBottom: 2 }}>
          <b>{entry.name}:</b> <span style={{ fontWeight: 600 }}>{entry.value} {unit}</span>
        </div>
      ))}
      <div style={{ marginTop: 6, fontWeight: 600, color: '#333' }}>Total: {totalKcal} kcal</div>
    </div>
  );
});
CustomTooltip.displayName = 'CustomTooltip';

// Memoized custom x-axis tick component
const CustomXAxisTick = memo(({ x, y, payload, viewMode }) => {
  let label = payload.value;
  if (viewMode === 'daily') {
    try {
      label = format(parseISO(label), 'MMM d');
    } catch {}
  } else if (viewMode === 'weekly') {
    const weekMatch = /^\d{4}-W\d{1,2}$/.test(label);
    if (weekMatch) {
      const [year, weekStr] = label.split('-W');
      const { start, end } = getISOWeekDates(parseInt(year, 10), parseInt(weekStr, 10));
      label = `${format(start, 'MMM d')}–${format(end, 'MMM d')}`;
    }
  } else if (viewMode === 'monthly') {
    if (/^\d{4}-\d{2}$/.test(label)) {
      try {
        label = format(parseISO(label + '-01'), 'MMM yyyy');
      } catch {}
    }
  }
  return (
    <g transform={`translate(${x},${y + 10})`}>
      <text x={0} y={0} textAnchor="end" fill="#666" fontSize={12} transform="rotate(-30)">{label}</text>
    </g>
  );
});
CustomXAxisTick.displayName = 'CustomXAxisTick';

export const MacroChart = memo(({ unit, viewMode, data, loading }) => {
  const chartData = data && data.length > 0 ? data : [];

  // Show loading state
  if (loading) {
    return <div className="w-full h-80 flex items-center justify-center text-gray-500">Loading chart data...</div>;
  }

  // If no data, show a message
  if (!chartData.length) {
    return <div className="w-full h-80 flex items-center justify-center text-gray-500">No data available for this period.</div>;
  }

  // Use direct values from chartData for macros
  const convertedData = useMemo(() => {
    return chartData.map(day => {
      const protein = typeof day.protein === 'number' ? day.protein : 0;
      const carbs = typeof day.carbs === 'number' ? day.carbs : 0;
      const fat = typeof day.fat === 'number' ? day.fat : 0;
      // Calculate calories from macros for display if needed
      const calories = (protein * 4) + (carbs * 4) + (fat * 9);
      return {
        ...day,
        protein: Math.round(protein * 4) < 1 ? 0 : Math.round(protein * 4),
        carbs: Math.round(carbs * 4) < 1 ? 0 : Math.round(carbs * 4),
        fat: Math.round(fat * 9) < 1 ? 0 : Math.round(fat * 9),
        total: Math.round(calories)
      };
    });
  }, [chartData]);

  // Determine XAxis interval based on data length
  const xAxisInterval = useMemo(() => {
    if (viewMode === 'monthly') return 0;
    if (convertedData.length > 90) return 29;
    if (convertedData.length > 30) return 6;
    if (convertedData.length > 14) return 2;
    if (convertedData.length > 7) return 1;
    return 0;
  }, [viewMode, convertedData.length]);

  // Create tick renderer that passes viewMode
  const renderTick = useMemo(() => {
    return (props) => <CustomXAxisTick {...props} viewMode={viewMode} />;
  }, [viewMode]);

  // Create tooltip renderer that passes viewMode and unit
  const renderTooltip = useMemo(() => {
    return (props) => <CustomTooltip {...props} viewMode={viewMode} unit={unit} />;
  }, [viewMode, unit]);

  return (
    <div className="w-full h-80">
      {/* Move legend above the chart */}
      <div className="flex justify-center mb-2">
        <span className="flex items-center mr-4"><span className="w-4 h-4 inline-block rounded bg-[#4CAF50] mr-1"></span>Protein</span>
        <span className="flex items-center mr-4"><span className="w-4 h-4 inline-block rounded bg-[#2196F3] mr-1"></span>Carbs</span>
        <span className="flex items-center"><span className="w-4 h-4 inline-block rounded bg-[#FFC107] mr-1"></span>Fat</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={convertedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          barSize={viewMode === 'daily' ? 30 : 50}
        >
          {/* Gradients for modern bar colors */}
          <defs>
            <linearGradient id="proteinGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6dd47e" />
              <stop offset="100%" stopColor="#219150" />
            </linearGradient>
            <linearGradient id="carbsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4fc3f7" />
              <stop offset="100%" stopColor="#1976d2" />
            </linearGradient>
            <linearGradient id="fatGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd54f" />
              <stop offset="100%" stopColor="#ffa000" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={renderTick} interval={xAxisInterval} />
          <YAxis label={{ value: 'kcal', angle: -90, position: 'insideLeft', fontSize: 14 }} />
          <Tooltip content={renderTooltip} />
          {/* Value labels on bars */}
          <Bar dataKey="protein" stackId="a" fill="url(#proteinGradient)" name="Protein" isAnimationActive={true} animationDuration={800} />
          <Bar dataKey="carbs" stackId="a" fill="url(#carbsGradient)" name="Carbs" isAnimationActive={true} animationDuration={800} />
          <Bar dataKey="fat" stackId="a" fill="url(#fatGradient)" name="Fat" isAnimationActive={true} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

MacroChart.displayName = 'MacroChart';

MacroChart.defaultProps = {
  data: []
};
