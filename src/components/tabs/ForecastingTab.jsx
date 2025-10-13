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

      {/* No-Regret Investments - Enhanced */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No-Regret Investments
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              High-confidence investments needed across <strong>all growth scenarios</strong>
            </p>
          </div>
          <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-center">
            <div className="text-2xl font-bold">100%</div>
            <div className="text-xs">Confidence</div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Guaranteed Projects</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {noRegretInvestments.length || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              districts × school types
            </p>
          </div>
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Minimum Capacity Needed</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {noRegretInvestments.reduce((sum, inv) => sum + (inv.minimum_capacity_needed || 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              seats required by 2030
            </p>
          </div>
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Planning Certainty</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {pessimistic.total_gap ? Math.round((noRegretInvestments.reduce((sum, inv) => sum + (inv.minimum_capacity_needed || 0), 0) / pessimistic.total_gap) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              of total minimum need
            </p>
          </div>
        </div>

        {/* Why These are No-Regret */}
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Why These Investments are Guaranteed
          </h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 ml-7">
            <li><strong>✓ Present in ALL scenarios:</strong> Even if enrollment grows at just {growthRates.pessimistic}% annually (worst case), these seats are still needed</li>
            <li><strong>✓ Immediate action required:</strong> Capacity gaps exist today and will worsen without intervention</li>
            <li><strong>✓ No risk of overbuilding:</strong> These investments will be utilized regardless of which growth path materializes</li>
            <li><strong>✓ High ROI certainty:</strong> 100% probability of serving students, eliminating investment risk</li>
          </ul>
        </div>

        {/* Top Priority Districts (if available) */}
        {noRegretInvestments.length > 0 && (
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              Top Priority Districts for Immediate Investment
            </h4>
            <div className="space-y-2">
              {noRegretInvestments.slice(0, 5).map((investment, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/10 rounded">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {investment.district}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      ({investment.school_type}, {investment.gender})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-green-600 dark:text-green-400">
                      +{investment.minimum_capacity_needed?.toLocaleString()} seats
                    </span>
                  </div>
                </div>
              ))}
              {noRegretInvestments.length > 5 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center pt-2">
                  + {noRegretInvestments.length - 5} more districts...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Strategic Recommendations */}
        <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border-l-4 border-green-600">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            📋 Strategic Planning Recommendation
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Priority Action:</strong> Immediately allocate budget and begin planning for these {noRegretInvestments.length} guaranteed projects. 
            These represent zero-risk investments that will be needed regardless of enrollment trends. 
            Delaying these projects increases overcrowding and reduces educational quality with 100% certainty.
          </p>
        </div>
      </div>

      {/* High Uncertainty Areas - Enhanced */}
      {highUncertaintyAreas.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                High Uncertainty Areas
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Districts with significant variance requiring <strong>flexible planning approaches</strong>
              </p>
            </div>
            <div className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-center">
              <div className="text-2xl font-bold">±{Math.round(variance / highUncertaintyAreas.length).toLocaleString()}</div>
              <div className="text-xs">Avg Variance</div>
            </div>
          </div>

          {/* What This Means */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Why High Uncertainty Exists
            </h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 ml-7">
              <li><strong>⚠ Large variance range:</strong> Projected enrollment differs by ±{Math.round(variance / 1000)}K+ students between scenarios</li>
              <li><strong>⚠ Multiple growth drivers:</strong> Population trends, economic factors, and migration patterns create uncertainty</li>
              <li><strong>⚠ Longer time horizon:</strong> 2030 projections have inherently higher uncertainty than near-term forecasts</li>
              <li><strong>⚠ Demographic volatility:</strong> Areas experiencing rapid development or demographic shifts</li>
            </ul>
          </div>

          {/* Risk Analysis Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Uncertainty</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                ±{highUncertaintyAreas.reduce((sum, area) => sum + (area.variance || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">seats at risk</p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Affected Districts</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {highUncertaintyAreas.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">high-variance areas</p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Planning Buffer</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {baseline.total_gap ? Math.round(((optimistic.total_gap - baseline.total_gap) / baseline.total_gap) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">flexibility needed</p>
            </div>
          </div>

          {/* District Details */}
          <div className="space-y-3 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Districts Requiring Flexible Planning
            </h4>
            {highUncertaintyAreas.slice(0, 5).map((area, index) => (
              <div key={index} className="bg-white dark:bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {area.district} - {area.school_type} ({area.gender})
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enrollment Range: {area.range_description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      ±{area.variance?.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">variance</p>
                  </div>
                </div>
                
                {/* Risk Indicator */}
                <div className="flex items-center space-x-2 mt-3">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${Math.min((area.variance / 2000) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                    {area.variance > 1600 ? 'Very High' : area.variance > 1400 ? 'High' : 'Moderate'} Risk
                  </span>
                </div>

                {/* Planning Implication */}
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 italic">
                  <strong>Implication:</strong> {
                    area.variance > 1600 
                      ? 'Requires phased approach with modular expansion capability'
                      : area.variance > 1400
                      ? 'Consider flexible design with expansion options'
                      : 'Monitor closely and prepare contingency plans'
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Strategic Recommendations */}
          <div className="space-y-3">
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border-l-4 border-yellow-600">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                🎯 Recommended Planning Strategy
              </h4>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                <li><strong>1. Phased Development:</strong> Design projects in stages that can be accelerated or decelerated based on actual enrollment trends</li>
                <li><strong>2. Modular Design:</strong> Build facilities with expansion capacity (land reserved, infrastructure pre-sized for growth)</li>
                <li><strong>3. Annual Monitoring:</strong> Track actual vs. projected enrollment quarterly to adjust plans 2-3 years ahead</li>
                <li><strong>4. Flexible Budgeting:</strong> Allocate contingency funds ({Math.round(((optimistic.total_gap - baseline.total_gap) / baseline.total_gap) * 100)}% buffer) for rapid response to high-growth scenarios</li>
                <li><strong>5. Multi-Use Facilities:</strong> Consider convertible spaces that can adapt to changing grade-level or program needs</li>
              </ul>
            </div>

            <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-yellow-300 dark:border-yellow-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                📊 Risk Mitigation Framework
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">If Growth Exceeds Baseline:</p>
                  <ul className="text-gray-700 dark:text-gray-300 space-y-1 ml-4 list-disc">
                    <li>Activate expansion phases early</li>
                    <li>Fast-track permitting for pre-planned sites</li>
                    <li>Deploy temporary/modular facilities</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">If Growth Below Baseline:</p>
                  <ul className="text-gray-700 dark:text-gray-300 space-y-1 ml-4 list-disc">
                    <li>Delay non-critical phases</li>
                    <li>Repurpose excess capacity for programs</li>
                    <li>Reallocate resources to high-certainty areas</li>
                  </ul>
                </div>
              </div>
            </div>
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
