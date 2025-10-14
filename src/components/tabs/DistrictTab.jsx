import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, AlertCircle, Users, Clock, MapPin } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';
import AIInsightsPanel from '../shared/AIInsightsPanel';
import api from '../../services/api';

const DistrictAnalysisTab = () => {
  const [loading, setLoading] = useState(true);
  const [districtData, setDistrictData] = useState(null);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [sortBy, setSortBy] = useState('priority_score');
  const [filterTier, setFilterTier] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getDistrictPriorities();
      console.log('District Priorities API Response:', data);
      setDistrictData(data);
    } catch (error) {
      console.error('Error loading district data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Analyzing district priorities..." />;
  }

  if (!districtData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">Unable to load district data.</p>
      </div>
    );
  }

  // Parse API response
  const priorities = districtData.district_priorities || [];
  const methodology = districtData.scoring_methodology || {};
  const weights = methodology.weights || {};

  // Filter and sort districts
  let filteredDistricts = priorities;
  if (filterTier !== 'all') {
    filteredDistricts = priorities.filter(d => d.priority_tier === filterTier.toUpperCase());
  }

  // Sort districts
  filteredDistricts = [...filteredDistricts].sort((a, b) => {
    if (sortBy === 'priority_score') return b.priority_score - a.priority_score;
    if (sortBy === 'district') return a.district.localeCompare(b.district);
    if (sortBy === 'deficit') return (b.metrics?.total_current_deficit || 0) - (a.metrics?.total_current_deficit || 0);
    if (sortBy === 'forecast') return (b.metrics?.total_forecast_gap_2030 || 0) - (a.metrics?.total_forecast_gap_2030 || 0);
    return 0;
  });

  // Prepare chart data
  const chartData = priorities.map(d => ({
    name: d.district,
    score: Math.round(d.priority_score * 10) / 10,
    tier: d.priority_tier
  })).sort((a, b) => b.score - a.score);

  // Get tier color
  const getTierColor = (tier) => {
    switch (tier?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'MEDIUM':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'LOW':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  // Get bar color based on tier
  const getBarColor = (tier) => {
    switch (tier?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return '#dc2626';
      case 'MEDIUM':
        return '#f59e0b';
      case 'LOW':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  // Toggle district selection for comparison
  const toggleDistrictSelection = (district) => {
    setSelectedDistricts(prev => {
      const isSelected = prev.some(d => d.district === district.district);
      if (isSelected) {
        return prev.filter(d => d.district !== district.district);
      } else if (prev.length < 3) {
        return [...prev, district];
      }
      return prev;
    });
  };

  // Prepare radar chart data for comparison
  const getComparisonData = () => {
    if (selectedDistricts.length === 0) return [];
    
    const metrics = [
      { metric: 'Overcapacity', key: 'current_overcapacity' },
      { metric: 'Growth', key: 'forecast_growth' },
      { metric: 'Travel Time', key: 'travel_accessibility' },
      { metric: 'Population', key: 'population_impact' }
    ];

    return metrics.map(m => {
      const dataPoint = { metric: m.metric };
      selectedDistricts.forEach(d => {
        dataPoint[d.district] = d.component_scores?.[m.key] || 0;
      });
      return dataPoint;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          District Analysis & Priorities
        </h2>
        
        <div className="flex flex-wrap gap-4">
          {/* Tier Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Filter by Tier
            </label>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Tiers</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="priority_score">Priority Score</option>
              <option value="district">District Name</option>
              <option value="deficit">Current Deficit</option>
              <option value="forecast">2030 Forecast Gap</option>
            </select>
          </div>

          {/* Stats Summary */}
          <div className="ml-auto flex gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Districts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{priorities.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">High Priority</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {priorities.filter(d => d.priority_tier === 'HIGH').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Selected for Comparison</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {selectedDistricts.length}/3
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Scores Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          District Priority Scores
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="score" 
              name="Priority Score"
              radius={[0, 8, 8, 0]}
            >
              {chartData.map((entry, index) => (
                <cell key={`cell-${index}`} fill={getBarColor(entry.tier)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scoring Methodology */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Scoring Methodology
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weighting Factors */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Weighting Factors</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• <strong>Overcapacity ({(weights.current_overcapacity * 100).toFixed(0)}%):</strong> Current deficit severity</li>
              <li>• <strong>Forecast ({(weights.forecast_growth * 100).toFixed(0)}%):</strong> Projected 2030 gap</li>
              <li>• <strong>Travel Time ({(weights.travel_time * 100).toFixed(0)}%):</strong> Accessibility challenges</li>
              <li>• <strong>Population ({(weights.population_size * 100).toFixed(0)}%):</strong> Density and growth</li>
            </ul>
          </div>

          {/* Priority Tiers */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Priority Tiers</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• <strong>Critical (&gt;75):</strong> Immediate intervention required</li>
              <li>• <strong>High (60-75):</strong> Near-term action needed</li>
              <li>• <strong>Medium (45-60):</strong> Medium-term planning</li>
              <li>• <strong>Low (&lt;45):</strong> Monitor and maintain</li>
            </ul>
          </div>
        </div>
      </div>

      {/* District Comparison Tool */}
      {selectedDistricts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              District Comparison ({selectedDistricts.length} selected)
            </h3>
            <button
              onClick={() => setSelectedDistricts([])}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Clear Selection
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={getComparisonData()}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  {selectedDistricts.map((district, index) => (
                    <Radar
                      key={district.district}
                      name={district.district}
                      dataKey={district.district}
                      stroke={['#3b82f6', '#10b981', '#f59e0b'][index]}
                      fill={['#3b82f6', '#10b981', '#f59e0b'][index]}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left">Metric</th>
                    {selectedDistricts.map(d => (
                      <th key={d.district} className="px-4 py-2 text-center">{d.district}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="px-4 py-2 font-medium">Priority Score</td>
                    {selectedDistricts.map(d => (
                      <td key={d.district} className="px-4 py-2 text-center font-bold">
                        {d.priority_score.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Current Deficit</td>
                    {selectedDistricts.map(d => (
                      <td key={d.district} className="px-4 py-2 text-center">
                        {(d.metrics?.total_current_deficit || 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2">2030 Gap</td>
                    {selectedDistricts.map(d => (
                      <td key={d.district} className="px-4 py-2 text-center">
                        {(d.metrics?.total_forecast_gap_2030 || 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Avg Travel Time</td>
                    {selectedDistricts.map(d => (
                      <td key={d.district} className="px-4 py-2 text-center">
                        {Math.round(d.metrics?.avg_travel_time_minutes || 0)} min
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Population</td>
                    {selectedDistricts.map(d => (
                      <td key={d.district} className="px-4 py-2 text-center">
                        {(d.metrics?.population || 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detailed District Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Detailed District Analysis
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Click on districts to select for comparison (max 3)
          </p>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredDistricts.map((district, index) => {
            const isSelected = selectedDistricts.some(d => d.district === district.district);
            
            return (
              <div
                key={district.district}
                onClick={() => toggleDistrictSelection(district)}
                className={`p-6 cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                        #{index + 1}. {district.district}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(district.priority_tier)}`}>
                        {district.priority_tier}
                      </span>
                      {isSelected && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Selected for Comparison
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {district.tier_description}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {district.priority_score.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Priority Score</p>
                  </div>
                </div>

                {/* Component Scores */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {Math.round(district.component_scores?.current_overcapacity || 0)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Overcapacity Score</p>
                  </div>

                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {Math.round(district.component_scores?.forecast_growth || 0)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Growth Score</p>
                  </div>

                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {Math.round(district.component_scores?.travel_accessibility || 0)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Travel Score</p>
                  </div>

                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Users className="w-4 h-4 text-green-500" />
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {Math.round(district.component_scores?.population_impact || 0)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Population Score</p>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Overcapacity Schools</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {district.metrics?.num_overcapacity_schools || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Current Deficit</p>
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {(district.metrics?.total_current_deficit || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">2030 Gap</p>
                    <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                      {(district.metrics?.total_forecast_gap_2030 || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Avg Travel Time</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {Math.round(district.metrics?.avg_travel_time_minutes || 0)} min
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Population</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(district.metrics?.population || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Investment Rationale */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Investment Rationale
                  </h5>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {district.investment_rationale?.map((rationale, idx) => (
                      <li key={idx}>• {rationale}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insights */}
      {districtData?.ai_insights && (
        <AIInsightsPanel 
          insights={districtData.ai_insights} 
          title="AI District Analysis Insights"
        />
      )}
    </div>
  );
};

export default DistrictAnalysisTab;
