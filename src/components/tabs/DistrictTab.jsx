import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell } from 'recharts';
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

  if (!districtData || !districtData.district_priorities) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">Unable to load district data.</p>
      </div>
    );
  }

  // Extract districts from the actual API response structure
  const districts = districtData.district_priorities || [];

  // Apply filters and sorting
  let filteredDistricts = [...districts];
  
  // Filter by tier
  if (filterTier !== 'all') {
    filteredDistricts = filteredDistricts.filter(d => 
      d.priority_tier?.toLowerCase() === filterTier.toLowerCase()
    );
  }

  // Sort districts
  filteredDistricts.sort((a, b) => {
    switch (sortBy) {
      case 'priority_score':
        return (b.priority_score || 0) - (a.priority_score || 0);
      case 'district':
        return (a.district || '').localeCompare(b.district || '');
      case 'deficit':
        return (b.metrics?.total_current_deficit || 0) - (a.metrics?.total_current_deficit || 0);
      case 'forecast':
        return (b.metrics?.forecasted_gap_2030 || 0) - (a.metrics?.forecasted_gap_2030 || 0);
      default:
        return 0;
    }
  });

  // Prepare chart data
  const chartData = filteredDistricts.map(d => ({
    name: d.district,
    score: d.priority_score || 0,
    tier: d.priority_tier
  }));

  // Priority stats
  const priorities = districts;
  const highPriorityCount = priorities.filter(d => d.priority_tier === 'HIGH').length;

  // Tier badge colors - consistent with other tabs
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
      {/* Header with Filters - STYLED LIKE OTHER TABS */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
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
                {highPriorityCount}
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

      {/* Priority Scores Chart - STYLED LIKE OTHER TABS */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          District Priority Scores
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" />
            <YAxis dataKey="name" type="category" width={120} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6'
              }}
            />
            <Legend />
            <Bar 
              dataKey="score" 
              name="Priority Score"
              radius={[0, 8, 8, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.tier)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scoring Methodology - NOW WITH EMERALD GRADIENT LIKE OTHER TABS */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg shadow-lg p-6 border border-emerald-200 dark:border-emerald-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Scoring Methodology
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weighting Factors */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              Weighting Factors
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Current Overcapacity</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">40%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Forecast Growth (2030)</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">30%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Travel Accessibility</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">20%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Population Impact</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">10%</span>
              </div>
            </div>
          </div>

          {/* Priority Tiers */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              Priority Tiers
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30">
                  HIGH
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Score ≥ 60</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30">
                  MEDIUM
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Score 40-59</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30">
                  LOW
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Score &lt; 40</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* District Comparison Tool - STYLED LIKE OTHER TABS */}
      {selectedDistricts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            District Comparison ({selectedDistricts.length} selected)
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Component Scores
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={getComparisonData()}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="metric" stroke="#9ca3af" />
                  <PolarRadiusAxis domain={[0, 100]} stroke="#9ca3af" />
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Key Metrics Comparison
              </h4>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Metric</th>
                    {selectedDistricts.map(d => (
                      <th key={d.district} className="px-4 py-2 text-center text-gray-700 dark:text-gray-300">{d.district}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">Priority Score</td>
                    {selectedDistricts.map(d => (
                      <td key={d.district} className="px-4 py-2 text-center font-bold text-gray-900 dark:text-white">
                        {d.priority_score.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">Current Deficit</td>
                    {selectedDistricts.map(d => (
                      <td key={d.district} className="px-4 py-2 text-center text-gray-700 dark:text-gray-300">
                        {(d.metrics?.total_current_deficit || 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">2030 Forecast Gap</td>
                    {selectedDistricts.map(d => (
                      <td key={d.district} className="px-4 py-2 text-center text-gray-700 dark:text-gray-300">
                        {(d.metrics?.forecasted_gap_2030 || 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">Schools Count</td>
                    {selectedDistricts.map(d => (
                      <td key={d.district} className="px-4 py-2 text-center text-gray-700 dark:text-gray-300">
                        {d.metrics?.school_count || 0}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">Avg Travel Time</td>
                    {selectedDistricts.map(d => (
                      <td key={d.district} className="px-4 py-2 text-center text-gray-700 dark:text-gray-300">
                        {(d.metrics?.avg_travel_time || 0).toFixed(1)} min
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* District Cards - STYLED LIKE OTHER TABS */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          District Details
        </h3>
        <div className="space-y-4">
          {filteredDistricts.map((district, index) => {
            const isSelected = selectedDistricts.some(d => d.district === district.district);
            
            return (
              <div
                key={district.district}
                onClick={() => toggleDistrictSelection(district)}
                className={`cursor-pointer transition-all rounded-lg p-6 border-2 ${
                  isSelected 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-600' 
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 p-4 bg-white dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Schools</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {district.metrics?.school_count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Current Deficit</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(district.metrics?.total_current_deficit || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">2030 Gap</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(district.metrics?.forecasted_gap_2030 || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Avg Travel</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(district.metrics?.avg_travel_time || 0).toFixed(1)} min
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

      {/* AI Insights - PROPERLY STYLED WITH EMERALD GRADIENT LIKE OTHER TABS */}
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
