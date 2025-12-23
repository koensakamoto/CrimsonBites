import React, { useState, useEffect, useMemo } from 'react';
import NutritionChart from './NutritionChart';
import { WeightChart } from './WeightChart';
import { MacroChart } from './MacroChart';
import { NutritionSummary } from './NutritionSummary';
import { DateRangeSelector } from './DateRangeSelector';
import { FilterControl } from './FilterControl';
import { useFetchWithAuth } from '../../AuthProvider';
import { format } from 'date-fns';
import LoadingSpinner from '../LoadingSpinner';
import { 
  SummarySkeleton, 
  ChartSkeleton, 
  InsightsSkeleton, 
  WeightSkeleton 
} from './SkeletonLoaders';

export default function NutritionHistory({ cache, setCache, version }) {
  const [dateRange, setDateRange] = useState(cache?.dateRange || 'last-week');
  const [viewMode, setViewMode] = useState(cache?.viewMode || 'daily');

  // Check if cache is valid (same version and dateRange)
  const isCacheValid = cache && cache.version === version && cache.dateRange === dateRange;

  // Progressive loading state management
  const [loadingState, setLoadingState] = useState({
    summary: isCacheValid ? 'loaded' : 'loading',
    energyChart: isCacheValid ? 'loaded' : 'loading',
    insights: isCacheValid ? 'loaded' : 'loading',
    weight: isCacheValid ? 'loaded' : 'loading'
  });

  // Data states - initialize from cache if valid
  const [summaryData, setSummaryData] = useState(isCacheValid ? cache.summaryData : null);
  const [macroData, setMacroData] = useState(isCacheValid ? cache.macroData : []);
  const [energyChartData, setEnergyChartData] = useState(isCacheValid ? cache.energyChartData : []);
  const [weightData, setWeightData] = useState(isCacheValid ? cache.weightData : []);

  // Error states
  const [summaryError, setSummaryError] = useState(null);
  const [macroError, setMacroError] = useState(null);
  const [energyChartError, setEnergyChartError] = useState(null);
  const [weightError, setWeightError] = useState(null);
  const fetchWithAuth = useFetchWithAuth();

  // Track the last fetched params to avoid redundant fetches
  const [lastFetchedParams, setLastFetchedParams] = useState(
    isCacheValid ? { dateRange, version } : null
  );

  // Helper to update loading state
  const updateLoadingState = (section, status) => {
    setLoadingState(prev => ({
      ...prev,
      [section]: status
    }));
  };

  // Utility to get local date string in YYYY-MM-DD format
  const getLocalDateString = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  // Memoize expensive date calculations
  const dateRangeBounds = useMemo(() => getDateRangeBounds(dateRange), [dateRange]);
  const dateRangeLabel = useMemo(() => getDateRangeLabel(dateRangeBounds.start, dateRangeBounds.end), [dateRangeBounds]);

  // Helper to get start and end date strings for API
  function getDateRangeBounds(range) {
    const today = new Date();
    let start, end; 
    end = new Date(today);
    switch (range) {
      case 'last-week':
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        break;
      case 'last-two-weeks':
        start = new Date(today);
        start.setDate(start.getDate() - 13);
        break;
      case 'last-month':
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        break;
      case 'last-three-months':
        start = new Date(today);
        start.setMonth(start.getMonth() - 3);
        break;
      case 'last-six-months':
        start = new Date(today);
        start.setMonth(start.getMonth() - 6);
        break;
      default:
        start = new Date(today);
        start.setDate(start.getDate() - 6);
    }
    // Format as YYYY-MM-DD
    const fmt = d => getLocalDateString(d);
    return { start: fmt(start), end: fmt(end) };
  }

  // Helper to aggregate macros by day/week/month
  function aggregateMacros(data, viewMode) {
    if (!data || data.length === 0) {
      return [];
    }
    
    if (viewMode === 'daily') {
      // Group by date
      const grouped = {};
      data.forEach(item => {
        if (!grouped[item.date]) grouped[item.date] = [];
        grouped[item.date].push(item);
      });
      
      return Object.entries(grouped).map(([date, items]) => ({
        name: date,
        date,
        calories: items.reduce((sum, i) => sum + ((i.calories || 0) * (i.quantity || 1)), 0),
        protein: items.reduce((sum, i) => sum + ((i.protein || 0) * (i.quantity || 1)), 0),
        carbs: items.reduce((sum, i) => sum + ((i.carbs || 0) * (i.quantity || 1)), 0),
        fat: items.reduce((sum, i) => sum + ((i.fat || 0) * (i.quantity || 1)), 0),
      })).sort((a, b) => a.date.localeCompare(b.date));
    } else if (viewMode === 'weekly') {
      // Group by ISO week
      const grouped = {};
      data.forEach(item => {
        const d = new Date(item.date);
        // Get ISO week number using proper algorithm
        const thursday = new Date(d.getTime());
        thursday.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const year = thursday.getFullYear();
        const firstThursday = new Date(year, 0, 4);
        const week = 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86400000 - 3 + (firstThursday.getDay() + 6) % 7) / 7);
        const key = `${year}-W${week}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });
      return Object.entries(grouped).map(([week, items]) => ({
        name: week,
        calories: items.reduce((sum, i) => sum + ((i.calories || 0) * (i.quantity || 1)), 0),
        protein: items.reduce((sum, i) => sum + ((i.protein || 0) * (i.quantity || 1)), 0),
        carbs: items.reduce((sum, i) => sum + ((i.carbs || 0) * (i.quantity || 1)), 0),
        fat: items.reduce((sum, i) => sum + ((i.fat || 0) * (i.quantity || 1)), 0),
      })).sort((a, b) => a.name.localeCompare(b.name));
    } else if (viewMode === 'monthly') {
      // Group by month
      const grouped = {};
      data.forEach(item => {
        const key = item.date.slice(0, 7);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });
      return Object.entries(grouped).map(([month, items]) => ({
        name: month,
        calories: items.reduce((sum, i) => sum + ((i.calories || 0) * (i.quantity || 1)), 0),
        protein: items.reduce((sum, i) => sum + ((i.protein || 0) * (i.quantity || 1)), 0),
        carbs: items.reduce((sum, i) => sum + ((i.carbs || 0) * (i.quantity || 1)), 0),
        fat: items.reduce((sum, i) => sum + ((i.fat || 0) * (i.quantity || 1)), 0),
      })).sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }

  // Helper to fill missing dates with zero values for daily view
  function fillMissingDates(aggregated, start, end) {
    const result = [];
    
    // Parse dates correctly by adding 'T00:00:00' to avoid timezone issues
    let current = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    
    while (current <= endDate) {
      // Use getLocalDateString to avoid timezone issues
      const dateStr = getLocalDateString(current);
      const found = aggregated.find(item => item.date === dateStr);
      if (found) {
        result.push(found);
      } else {
        result.push({
          name: dateStr,
          date: dateStr,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        });
      }
      // Add exactly one day
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }
    return result;
  }

  // Helper to fill missing weeks with zero values for weekly view
  function fillMissingWeeks(aggregated, start, end) {
    // Create new Date objects to avoid mutation
    let current = new Date(start);
    // Get the first Monday on or after start
    current = new Date(current.getTime() - (current.getDay() === 0 ? 6 : current.getDay() - 1) * 86400000);
    const endDate = new Date(end);
    // Get the last Sunday on or before end  
    const endWeek = new Date(endDate.getTime() + (7 - endDate.getDay()) * 86400000);
    
    const result = [];
    while (current < endWeek) {
      // Get ISO week number using proper algorithm
      const thursday = new Date(current.getTime());
      thursday.setDate(current.getDate() + 3 - (current.getDay() + 6) % 7);
      const year = thursday.getFullYear();
      const firstThursday = new Date(year, 0, 4);
      const week = 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86400000 - 3 + (firstThursday.getDay() + 6) % 7) / 7);
      const weekKey = `${year}-W${week}`;
      const found = aggregated.find(item => item.name === weekKey);
      if (found) {
        result.push(found);
      } else {
        result.push({
          name: weekKey,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        });
      }
      current = new Date(current.getTime() + 7 * 86400000); // Add 7 days without mutation
    }
    return result;
  }

  // Helper to fill missing months with zero values for monthly view
  function fillMissingMonths(aggregated, start, end) {
    // Create new Date objects to avoid mutation
    let current = new Date(start);
    current = new Date(current.getFullYear(), current.getMonth(), 1); // first of the month
    const endDate = new Date(end);
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1); // first of next month
    
    const result = [];
    while (current < endMonth) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const found = aggregated.find(item => item.name === key);
      if (found) {
        result.push(found);
      } else {
        result.push({
          name: key,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        });
      }
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1); // Next month without mutation
    }
    return result;
  }

  // Helper to format date as 'MMM D, YYYY'
  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return format(new Date(Number(year), Number(month) - 1, Number(day)), 'MMM d, yyyy');
  }

  // Helper to get a human-friendly date range label
  function getDateRangeLabel(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 6) return 'over the last 7 days';
    if (diffDays === 13) return 'over the last 14 days';
    if (diffDays === 29) return 'over the last 30 days';
    if (diffDays >= 85 && diffDays <= 95) return 'over the last 3 months';
    if (diffDays >= 175 && diffDays <= 185) return 'over the last 6 months';
    return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
  }

  // Fetch nutrition summary (only when dateRange or version changes, skip if cached)
  useEffect(() => {
    // Skip fetch if we already have data for this dateRange+version
    if (lastFetchedParams?.dateRange === dateRange && lastFetchedParams?.version === version) {
      return;
    }

    const fetchSummary = async () => {
      updateLoadingState('summary', 'loading');
      setSummaryError(null);
      const { start, end } = dateRangeBounds;
      try {
        const [profileRes, energyRes, summaryRes] = await Promise.all([
          fetchWithAuth('/api/profile'),
          fetchWithAuth('/api/profile/energy-target'),
          fetchWithAuth(`/api/plate/summary?start_date=${start}&end_date=${end}`)
        ]);
        if (profileRes.error) throw new Error(profileRes.error);
        if (energyRes.error) throw new Error(energyRes.error);
        if (summaryRes.error) throw new Error(summaryRes.error);

        const macronutrients = profileRes.data;
        const { energy_target } = energyRes.data;
        const data = summaryRes.data;

        // Validate required data
        if (!macronutrients?.profile) {
          throw new Error('Invalid profile data received');
        }
        if (!data) {
          throw new Error('No summary data received');
        }

        // Calculate macro targets
        const energyTarget = energy_target || 2400;
        const proteinRatio = macronutrients.profile.protein_ratio ?? 30;
        const carbRatio = macronutrients.profile.carb_ratio ?? 50;
        const proteinTarget = Math.round((energyTarget * (proteinRatio / 100)) / 4);
        const carbTarget = Math.round((energyTarget * (carbRatio / 100)) / 4);

        // Helper to calculate trend and percent
        function getTrend(value, target) {
          if (value > target) return 'up';
          if (value < target) return 'down';
          return 'neutral';
        }
        function getTrendValue(value, target) {
          if (!target) return '0%';
          const percent = ((value - target) / target) * 100;
          if (percent === 0) return '0%';
          return (percent > 0 ? '+' : '') + percent.toFixed(1) + '%';
        }

        setSummaryData([
          {
            title: 'Average Daily Calories',
            value: data.average_calories,
            target: energyTarget,
            unit: 'kcal',
            color: '#c41e3a',
            percentComplete: Math.round((data.average_calories / energyTarget) * 100),
            trend: getTrend(data.average_calories, energyTarget),
            trendValue: getTrendValue(data.average_calories, energyTarget)
          },
          {
            title: 'Protein Intake',
            value: data.average_protein,
            target: proteinTarget,
            unit: 'g',
            color: '#4CAF50',
            percentComplete: Math.round((data.average_protein / proteinTarget) * 100),
            trend: getTrend(data.average_protein, proteinTarget),
            trendValue: getTrendValue(data.average_protein, proteinTarget)
          },
          {
            title: 'Carb Intake',
            value: data.average_carbs,
            target: carbTarget,
            unit: 'g',
            color: '#2196F3',
            percentComplete: Math.round((data.average_carbs / carbTarget) * 100),
            trend: getTrend(data.average_carbs, carbTarget),
            trendValue: getTrendValue(data.average_carbs, carbTarget)
          },
          {
            title: 'Days Tracked',
            value: data.days_tracked,
            target: data.total_days,
            unit: 'days',
            color: '#FF9800',
            percentComplete: Math.round((data.days_tracked / data.total_days) * 100),
            trend: 'neutral',
            trendValue: '0%'
          }
        ]);
        updateLoadingState('summary', 'loaded');
      } catch (err) {
        setSummaryError(err.message);
        setSummaryData(null);
        updateLoadingState('summary', 'error');
      }
    };
    fetchSummary();
  }, [dateRangeBounds, version, lastFetchedParams]);

  // Cache for food macros data to avoid duplicate API calls
  const [rawFoodMacros, setRawFoodMacros] = useState(isCacheValid ? cache.rawFoodMacros : null);

  // Fetch food macros data once (when dateRange or version changes, skip if cached)
  useEffect(() => {
    // Skip fetch if we already have data for this dateRange+version
    if (lastFetchedParams?.dateRange === dateRange && lastFetchedParams?.version === version) {
      return;
    }

    const fetchFoodMacros = async () => {
      const { start, end } = dateRangeBounds;
      updateLoadingState('insights', 'loading');
      updateLoadingState('energyChart', 'loading');
      setMacroError(null);
      setEnergyChartError(null);
      try {
        const { data, error } = await fetchWithAuth(`/api/plate/food-macros?start_date=${start}&end_date=${end}`);
        if (error) throw new Error(error);
        if (!data) {
          console.warn('No macro data received from API');
          setRawFoodMacros([]);
          setMacroData([]);
          setEnergyChartData([]);
          updateLoadingState('insights', 'loaded');
          updateLoadingState('energyChart', 'loaded');
          return;
        }
        setRawFoodMacros(data);

        // Process macro data for insights (always daily)
        const dailyAggregated = aggregateMacros(data, 'daily');
        setMacroData(fillMissingDates(dailyAggregated, start, end));
        updateLoadingState('insights', 'loaded');

        // Process energy chart data based on current viewMode
        const aggregated = aggregateMacros(data, viewMode);
        if (viewMode === 'daily') {
          setEnergyChartData(fillMissingDates(aggregated, start, end));
        } else if (viewMode === 'weekly') {
          setEnergyChartData(fillMissingWeeks(aggregated, start, end));
        } else if (viewMode === 'monthly') {
          setEnergyChartData(fillMissingMonths(aggregated, start, end));
        } else {
          setEnergyChartData(aggregated);
        }
        updateLoadingState('energyChart', 'loaded');
      } catch (err) {
        console.error('Failed to fetch macro data:', err);
        setMacroError(err.message || 'Failed to load nutrition data');
        setEnergyChartError(err.message || 'Failed to load energy chart data');
        setMacroData([]);
        setEnergyChartData([]);
        updateLoadingState('insights', 'error');
        updateLoadingState('energyChart', 'error');
      }
    };
    fetchFoodMacros();
  }, [dateRangeBounds, version, lastFetchedParams]);

  // Re-process energy chart data when viewMode changes (no API call needed)
  useEffect(() => {
    if (!rawFoodMacros) return;

    const { start, end } = dateRangeBounds;
    const aggregated = aggregateMacros(rawFoodMacros, viewMode);

    if (viewMode === 'daily') {
      setEnergyChartData(fillMissingDates(aggregated, start, end));
    } else if (viewMode === 'weekly') {
      setEnergyChartData(fillMissingWeeks(aggregated, start, end));
    } else if (viewMode === 'monthly') {
      setEnergyChartData(fillMissingMonths(aggregated, start, end));
    } else {
      setEnergyChartData(aggregated);
    }
  }, [viewMode, rawFoodMacros, dateRangeBounds]);

  // Fetch weight data for chart (when dateRange or version changes, skip if cached)
  useEffect(() => {
    // Skip fetch if we already have data for this dateRange+version
    if (lastFetchedParams?.dateRange === dateRange && lastFetchedParams?.version === version) {
      return;
    }

    const fetchWeightData = async () => {
      const { start, end } = dateRangeBounds;
      updateLoadingState('weight', 'loading');
      setWeightError(null);
      try {
        const { data, error } = await fetchWithAuth(`/api/weight-log?start_date=${start}&end_date=${end}`);
        if (error) throw new Error(error);
        setWeightData(data || []);
        updateLoadingState('weight', 'loaded');
      } catch (err) {
        console.error('Failed to fetch weight data:', err);
        setWeightError(err.message || 'Failed to load weight data');
        setWeightData([]);
        updateLoadingState('weight', 'error');
      }
    };
    fetchWeightData();
  }, [dateRangeBounds, version, lastFetchedParams]);

  // Update lastFetchedParams and save cache when all data is loaded
  useEffect(() => {
    const allLoaded = loadingState.summary === 'loaded' &&
                      loadingState.energyChart === 'loaded' &&
                      loadingState.insights === 'loaded' &&
                      loadingState.weight === 'loaded';

    if (allLoaded && (lastFetchedParams?.dateRange !== dateRange || lastFetchedParams?.version !== version)) {
      setLastFetchedParams({ dateRange, version });
      setCache({
        version,
        dateRange,
        viewMode,
        summaryData,
        macroData,
        energyChartData,
        weightData,
        rawFoodMacros
      });
    }
  }, [loadingState, dateRange, version, summaryData, macroData, energyChartData, weightData, rawFoodMacros, viewMode, setCache, lastFetchedParams]);

  // Update cache when viewMode changes (without triggering refetch)
  useEffect(() => {
    if (cache && cache.version === version && cache.dateRange === dateRange && cache.viewMode !== viewMode) {
      setCache(prev => ({ ...prev, viewMode, energyChartData }));
    }
  }, [viewMode, energyChartData, cache, version, dateRange, setCache]);

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center">
      <div className="max-w-3xl px-4 py-8 mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Nutrition History</h1>
          <p className="text-gray-600 mt-2">Track your eating patterns and nutritional progress</p>
        </div>
        
        <div className="mb-6 flex justify-center">
          <DateRangeSelector 
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
        
        <div className="space-y-6">

          {/* Content starts directly with the summary */}

          {/* Nutrition Summary */}
          {loadingState.summary === 'loading' ? (
            <SummarySkeleton />
          ) : loadingState.summary === 'error' ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <div className="text-center text-red-500 py-8">{summaryError}</div>
            </div>
          ) : summaryData ? (
            <NutritionSummary summaryData={summaryData} />
          ) : null}
          
          {/* Energy Consumed Chart */}
          {loadingState.energyChart === 'loading' ? (
            <ChartSkeleton title="Energy Consumed" />
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Energy Consumed</h2>
                  <p className="text-sm text-gray-500">{dateRangeLabel}</p>
                </div>
                
                <div className="flex space-x-2 mt-3 md:mt-0">
                  <FilterControl
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                  />
                </div>
              </div>
              
              {loadingState.energyChart === 'error' ? (
                <div className="text-center text-red-500 py-8">{energyChartError}</div>
              ) : (
                <MacroChart 
                  key={`${viewMode}-${dateRange}`} 
                  unit="kcal" 
                  viewMode={viewMode} 
                  data={energyChartData} 
                  loading={false} 
                />
              )}
            </div>
          )}
          
        
            
      
          
          {/* Additional Nutrition Charts - Insights */}
          {loadingState.insights === 'loading' ? (
            <InsightsSkeleton />
          ) : loadingState.insights === 'error' ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <div className="text-center text-red-500 py-8">{macroError}</div>
            </div>
          ) : (
            <NutritionChart macroData={macroData} start={dateRangeBounds.start} end={dateRangeBounds.end} />
          )}

          {/* Weight Tracking Chart */}
          {loadingState.weight === 'loading' ? (
            <WeightSkeleton />
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Weight Progress</h2>
                  <p className="text-sm text-gray-500">{formatDisplayDate(dateRangeBounds.start)} to {formatDisplayDate(dateRangeBounds.end)}</p>
                </div>
                
              </div>
              
              {loadingState.weight === 'error' ? (
                <div className="text-center text-red-500 py-8">{weightError}</div>
              ) : (
                <>
                  <WeightChart weightData={weightData} />
                  
                  {/* Legend for weight chart */}
                  <div className="flex justify-end mt-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                        <span className="w-3 h-3 inline-block rounded-full bg-[#c41e3a] mr-1"></span>
                        <span className="text-sm text-gray-600">Weight</span>
                      </div>
                      {weightData.some(d => d.goal_weight !== undefined) && (
                        <div className="flex items-center">
                          <span className="w-3 h-3 inline-block rounded-full bg-[#b7e4c7] mr-1"></span>
                          <span className="text-sm text-gray-600">Goal Weight</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        
        </div>
      </div>
    </div>
  );
}
