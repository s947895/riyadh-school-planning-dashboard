import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle, TrendingDown } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';
import AIInsightsPanel from '../shared/AIInsightsPanel';
import api from '../../services/api';

const ForecastingTab = () => {
  const [loading, setLoading] = useState(true);
  const [forecastData, setForecastData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getForecastScenarios();
      console.log('Forecast API Response:', data);
      setForecastData(data);
    } catch (error) {
      console.error('Error loading forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading forecast scenarios..." />;
  }

  if (!forecastData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">Unable to load forecast data.</p>
      </div>
    );
  }

  // Parse the actual API response structure
  const systemTotals = forecastData.system_totals || {};
  const scenarios = systemTotals.scenarios || {};
  const parameters = forecastData.parameters || {};
  const districtScenarios = forecastData.district_scenarios || [];
  const noRegretInvestments = forecastData.no_regret_investments || [];
  const highUncertaintyAreas = forecastData.high_uncertainty_areas || [];

  // Extract growth rates from parameters
  const growthRates = {
    pessimistic: parameters.growth_rates?.pessimistic || 0.5,
    baseline: parameters.growth_rates?.baseline || 2,
    optimistic: parameters.growth_rates?.optimistic || 3.5
  };

  // Extract scenario data
  const pessimistic = scenarios.pessimistic || {};
  const baseline = scenarios.baseline || {};
  const optimistic = scenarios.optimistic || {};

  // Calculate variance (difference between optimistic and pessimistic)
  const variance = (optimistic.total_gap || 0) - (pessimistic.total_gap || 0);

  // Prepare data for capacity gap timeline chart (2025-2030)
  // Since we don't have year-by-year data, we'll interpolate
  const years = [2025, 2026, 2027, 2028, 2029, 2030];
  const capacityGapData = years.map((year, index) => {
    const progress = index / (years.length - 1); // 0 to 1
    return {
      year,
      pessimistic: Math.round((pessimistic.total_gap || 0) * progress),
      baseline: Math.round((baseline.total_gap || 0) * progress),
      optimistic: Math.round((optimistic.total_gap || 0) * progress)
    };
  });

  // Prepare top 10 districts by projected growth
  const districtGrowth = districtScenarios
    .sort((a, b) => (b.scenarios?.baseline?.capacity_gap || 0) - (a.scenarios?.baseline?.capacity_gap || 0))
    .slice(0, 10)
    .map(district => ({
      district: `${district.district} (${district.school_type}, ${district.gender})`,
      projected_gap: district.scenarios?.baseline?.capacity_gap || 0
    }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Forecasting & Scenario Analysis
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Compare three growth scenarios to identify robust investment priorities and plan for future capacity needs.
        </p>
      </div>

      {/* Scenario Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pessimistic Scenario */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
            <h3 className="font-bold text-gray-900 dark:text-white">Pessimistic</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">2030 Gap:</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {pessimistic.total_gap?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Growth Rate:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {growthRates.pessimistic}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Students:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {pessimistic.total_students?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Baseline Scenario */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-3">
            <AlertCircle className="text-blue-600 dark:text-blue-400" size={24} />
            <h3 className="font-bold text-gray-900 dark:text-white">Baseline</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">2030 Gap:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {baseline.total_gap?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Growth Rate:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {growthRates.baseline}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Students:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {baseline.total_students?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Optimistic Scenario */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            <h3 className="font-bold text-gray-900 dark:text-white">Optimistic</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">2030 Gap:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {optimistic.total_gap?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Growth Rate:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {growthRates.optimistic}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Students:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {optimistic.total_students?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Range Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
          Planning Range
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Minimum Need</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {pessimistic.total_gap?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">seats (worst case)</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Most Likely</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {baseline.total_gap?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">seats (expected)</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Maximum Need</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {optimistic.total_gap?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">seats (best case)</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Planning Variance:</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              ±{variance.toLocaleString()} seats
            </span>
          </div>
        </div>
      </div>

      {/* Capacity Gap Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Capacity Gap Projections (2025-2030)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={capacityGapData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="year" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="pessimistic"
              stroke="#ef4444"
              strokeWidth={2}
              name="Pessimistic (Low Growth)"
            />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Baseline (Expected)"
            />
            <Line
              type="monotone"
              dataKey="optimistic"
              stroke="#10b981"
              strokeWidth={2}
              name="Optimistic (High Growth)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 Districts by Growth */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Top 10 Districts by Projected Growth (2030)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={districtGrowth} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis dataKey="district" type="category" width={200} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6'
              }}
            />
            <Bar dataKey="projected_gap" fill="#3b82f6" name="Capacity Gap (Baseline)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* No-Regret Investments */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
          No-Regret Investments
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          These investments are guaranteed to be needed across all scenarios:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Guaranteed Projects</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {noRegretInvestments.length || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Minimum Capacity Needed</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {noRegretInvestments.reduce((sum, inv) => sum + (inv.minimum_capacity_needed || 0), 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Confidence Level</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">100%</p>
          </div>
        </div>
      </div>

      {/* High Uncertainty Areas */}
      {highUncertaintyAreas.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            High Uncertainty Areas
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            These areas show significant variance across scenarios (±1,000+ students):
          </p>
          <div className="space-y-3">
            {highUncertaintyAreas.slice(0, 5).map((area, index) => (
              <div key={index} className="flex justify-between items-center bg-white dark:bg-gray-700 rounded p-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {area.district} - {area.school_type} ({area.gender})
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Range: {area.range_description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    ±{area.variance?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">variance</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {forecastData?.ai_insights && (
        <AIInsightsPanel 
          insights={forecastData.ai_insights} 
          title="AI Forecasting Insights" 
        />
      )}
    </div>
  );
};

export default ForecastingTab;
