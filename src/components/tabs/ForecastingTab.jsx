import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';
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

  const results = forecastData?.results || {};
  const scenarios = results.scenarios || {};

  // Prepare data for line chart (Capacity Gap Projections)
  const years = [2025, 2026, 2027, 2028, 2029, 2030];
  const capacityGapData = years.map(year => ({
    year,
    pessimistic: scenarios.pessimistic?.[`gap_${year}`] || 0,
    baseline: scenarios.baseline?.[`gap_${year}`] || 0,
    optimistic: scenarios.optimistic?.[`gap_${year}`] || 0,
  }));

  // Prepare data for bar chart (District Growth)
  const districtGrowth = results.district_growth?.slice(0, 10) || [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Forecasting & Scenario Analysis
      </h2>

      {/* Scenario Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pessimistic Scenario */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-3">
            <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
            <h3 className="font-bold text-gray-900 dark:text-white">Pessimistic</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">2030 Gap:</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {scenarios.pessimistic?.gap_2030?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Growth Rate:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {scenarios.pessimistic?.growth_rate || 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Variance:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ±{scenarios.pessimistic?.variance?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Baseline Scenario */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
            <h3 className="font-bold text-gray-900 dark:text-white">Baseline</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">2030 Gap:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {scenarios.baseline?.gap_2030?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Growth Rate:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {scenarios.baseline?.growth_rate || 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Variance:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ±{scenarios.baseline?.variance?.toLocaleString() || 0}
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
                {scenarios.optimistic?.gap_2030?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Growth Rate:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {scenarios.optimistic?.growth_rate || 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Variance:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ±{scenarios.optimistic?.variance?.toLocaleString() || 0}
              </span>
            </div>
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
              name="Pessimistic"
            />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Baseline"
            />
            <Line
              type="monotone"
              dataKey="optimistic"
              stroke="#10b981"
              strokeWidth={2}
              name="Optimistic"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* District Growth Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Top 10 Districts by Projected Growth (2030)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={districtGrowth} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis dataKey="district" type="category" width={120} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6'
              }}
            />
            <Bar dataKey="projected_gap" fill="#3b82f6" name="Projected Gap" />
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
              {results.no_regret_investments || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Minimum Capacity Needed</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {results.minimum_capacity?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Confidence Level</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">100%</p>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {forecastData?.ai_insights && (
        <AIInsightsPanel insights={forecastData.ai_insights} title="AI Forecasting Insights" />
      )}
    </div>
  );
};

export default ForecastingTab;
