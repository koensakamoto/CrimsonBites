import React, { useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useEffect } from 'react';
import { format } from 'date-fns';

// Mock data for macro distribution
const macroDistributionData = [
  { name: 'Protein', value: 29, color: '#4CAF50' },
  { name: 'Carbs', value: 58, color: '#2196F3' },
  { name: 'Fat', value: 13, color: '#FFC107' },
];

// Mock data for meal timing
const mealTimingData = [
  { time: 'Breakfast', calories: 450 },
  { time: 'Snack', calories: 150 },
  { time: 'Lunch', calories: 750 },
  { time: 'Snack', calories: 180 },
  { time: 'Dinner', calories: 650 },
  { time: 'Late Snack', calories: 120 },
];

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}


const NutritionChart = ({ macroData = [], start, end }) => {
  const isMobile = useIsMobile()
  const [chartType, setChartType] = useState('macro');

  // Map date range to human-friendly label
  const dateRangeLabels = {
    'last-week': 'over the last 7 days',
    'last-two-weeks': 'over the last 14 days',
    'last-month': 'over the last 30 days',
    'last-three-months': 'over the last 3 months'
  };

  // Helper to guess the label from start/end
  function getDateRangeLabel(start, end) {
    // Try to match known ranges
    const today = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 6) return 'over the last 7 days';
    if (diffDays === 13) return 'over the last 14 days';
    if (diffDays === 29) return 'over the last 30 days';
    if (diffDays >= 85 && diffDays <= 95) return 'over the last 3 months';
    // Fallback to date range
    return `from ${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
  }

  // Helper to format date as 'MMM D, YYYY'
  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return format(new Date(Number(year), Number(month) - 1, Number(day)), 'MMM d, yyyy');
  }

  // Compute average macro distribution as percent of total macro calories (memoized)
  const macroDistributionData = useMemo(() => {
    let totalProtein = 0, totalCarbs = 0, totalFat = 0;
    let days = 0;
    macroData.forEach(day => {
      totalProtein += day.protein || 0;
      totalCarbs += day.carbs || 0;
      totalFat += day.fat || 0;
      days++;
    });
    // Avoid division by zero
    const avgProtein = days ? totalProtein / days : 0;
    const avgCarbs = days ? totalCarbs / days : 0;
    const avgFat = days ? totalFat / days : 0;
    // Convert to kcal
    const proteinKcal = avgProtein * 4;
    const carbsKcal = avgCarbs * 4;
    const fatKcal = avgFat * 9;
    const totalKcal = proteinKcal + carbsKcal + fatKcal;
    // Calculate percentages
    return totalKcal > 0 ? [
      { name: 'Protein', value: Math.round((proteinKcal / totalKcal) * 100), color: '#4CAF50' },
      { name: 'Carbs', value: Math.round((carbsKcal / totalKcal) * 100), color: '#2196F3' },
      { name: 'Fat', value: Math.round((fatKcal / totalKcal) * 100), color: '#FFC107' },
    ] : [
      { name: 'Protein', value: 0, color: '#4CAF50' },
      { name: 'Carbs', value: 0, color: '#2196F3' },
      { name: 'Fat', value: 0, color: '#FFC107' },
    ];
  }, [macroData]);

  const renderPercentLabel = useCallback(({
    cx, cy, midAngle, innerRadius, outerRadius, percent, fill
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if the slice is big enough
    if (percent < 0.08) return null;

    return (
      <g>
        <rect
          x={x - 22}
          y={y - 16}
          width={44}
          height={32}
          rx={8}
          fill="#fff"
          opacity={0.85}
          stroke={fill}
          strokeWidth={2}
        />
        <text
          x={x}
          y={y}
          fill={fill}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={16}
          fontWeight={700}
          style={{ pointerEvents: 'none' }}
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      </g>
    );
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2 md:mb-0">Nutrition Insights</h2>

        <div className="flex space-x-2">
          {/* <button
            className={`px-4 py-2 text-sm font-medium rounded-md ${chartType === 'macro'
              ? 'bg-[#c41e3a] text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            onClick={() => setChartType('macro')}
          >
            Macro Distribution
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-md ${chartType === 'timing'
              ? 'bg-[#c41e3a] text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            onClick={() => setChartType('timing')}
          >
            Meal Timing
          </button> */}
        </div>
      </div>

      <div className="h-80">
        {chartType === 'macro' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div className="flex flex-col justify-center">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Average Macro Distribution</h3>
              <p className="text-gray-600 mb-2">
                Your macronutrient balance {getDateRangeLabel(start, end)}
              </p>
              <div className="space-y-3 mt-4">
                {macroDistributionData.map(item => (
                  <div key={item.name}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${item.value}%`,
                          backgroundColor: item.color
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

           {!isMobile && <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={renderPercentLabel}
                    labelLine={false}
                  >
                    {macroDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Percentage']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid #f1f1f1',
                      borderRadius: '4px',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

            </div>}
          </div>
        )}

        {/* {chartType === 'timing' && (
          <div className="h-full">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Meal Timing Distribution</h3>
            <p className="text-gray-600 mb-4">When you consume your calories throughout the day</p>

            <ResponsiveContainer width="100%" height="80%">
              <BarChart
                data={mealTimingData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [`${value} kcal`, 'Calories']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #f1f1f1',
                    borderRadius: '4px',
                    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)'
                  }}
                />
                <Bar dataKey="calories" fill="#c41e3a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default NutritionChart;
