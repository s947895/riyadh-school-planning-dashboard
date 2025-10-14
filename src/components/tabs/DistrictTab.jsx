import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell } from 'recharts';
import { TrendingUp, AlertCircle, Users, Clock, MapPin, School, AlertTriangle } from 'lucide-react';
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-500 dark:text-gray-400">Unable to load district data.</p>
      </div>
    );
  }

  const districts = districtData.district_priorities || [];

  // Apply filters and sorting
  let filteredDistricts = [...districts];
  
  if (filterTier !== 'all') {
    filteredDistricts = filteredDistricts.filter(d => 
      d.priority_tier?.toLowerCase() === filterTier.toLowerCase()
    );
  }

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

  const chartData = filteredDistricts.map(d => ({
    name: d.district,
    score: d.priority_score || 0,
    tier: d.priority_tier
  }));

  const priorities = districts;
  const highPriorityCount = priorities.filter(d => d.priority_tier === 'HIGH').length;

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
      {/* Filters Bar */}
      <div className="flex flex-wrap gap-4 items-center">
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

        <div className="ml-auto text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Selected for Comparison</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {selectedDistricts.length}/3
          </p>
        </div>
      </div>

      {/* Priority Scores Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          District Priority Scores
        </h3>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e5e7eb" 
              horizontal={true} 
              vertical={false}
            />
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={150} 
              stroke="#9ca3af"
              style={{ fontSize: '13px' }}
              tick={{ fill: '#374151' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '12px'
              }}
              labelStyle={{
                color: '#111827',
                fontWeight: 600,
                marginBottom: '4px'
              }}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            />
            <Bar 
              dataKey="score" 
              name="Priority Score" 
              radius={[0, 8, 8, 0]}
              maxBarSize={40}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.tier)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scoring Methodology */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg shadow p-6 border border-emerald-200 dark:border-emerald-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Scoring Methodology
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              Weighting Factors
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">Current Overcapacity</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">40%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">Forecast Growth (2030)</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">30%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">Travel Accessibility</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">20%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">Population Impact</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">10%</span>
              </div>
            </div>
          </div>

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

      {/* District Comparison Tool */}
      {selectedDistricts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            District Comparison ({selectedDistricts.length} selected)
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Component Scores
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={getComparisonData()}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" stroke="#6b7280" />
                  <PolarRadiusAxis domain={[0, 100]} stroke="#6b7280" />
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

            <div className="overflow-x-auto">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
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
                    <td className="px-4 py-2">2030 Forecast Gap</td>
                    {selectedDistricts.map(d => (
                      <td key={d.district} className="px-4 py-2 text-center">
                        {(d.metrics?.forecasted_gap_2030 || 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Top Priority Districts - MATCHING OVERVIEW TAB STYLE */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Top {Math.min(6, filteredDistricts.length)} Priority Districts
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredDistricts.slice(0, 6).map((district, index) => {
            const isSelected = selectedDistricts.some(d => d.district === district.district);
            
            return (
              <div
                key={district.district}
                onClick={() => toggleDistrictSelection(district)}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-6 ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          #{index + 1} {district.district}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Population: {(district.metrics?.population || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(district.priority_tier)}`}>
                    {district.priority_tier}
                  </span>
                </div>

                {/* Priority Score - Large Blue Circle */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {Math.round(district.priority_score)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid - 2x2 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-start gap-3">
                    <School className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Overcapacity Schools</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {district.metrics?.school_count || 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current Deficit</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        {(district.metrics?.total_current_deficit || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-orange-500 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">2030 Forecast Gap</p>
                      <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        {(district.metrics?.forecasted_gap_2030 || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-purple-500 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Avg Travel Time</p>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {(district.metrics?.avg_travel_time || 0).toFixed(1)} min
                      </p>
                    </div>
                  </div>
                </div>

                {/* Component Scores */}
                <div className="mb-6">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Component Scores
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Current Overcapacity:</span>
                      <span className="font-semibold">{Math.round(district.component_scores?.current_overcapacity || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Forecast Growth:</span>
                      <span className="font-semibold">{Math.round(district.component_scores?.forecast_growth || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Travel Accessibility:</span>
                      <span className="font-semibold">{Math.round(district.component_scores?.travel_accessibility || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Population Impact:</span>
                      <span className="font-semibold">{Math.round(district.component_scores?.population_impact || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Investment Rationale */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border-l-4 border-green-500">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Investment Rationale
                  </h5>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {district.investment_rationale?.slice(0, 3).map((rationale, idx) => (
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
