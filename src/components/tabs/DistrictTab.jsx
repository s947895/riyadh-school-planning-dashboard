import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';
import AIInsightsPanel from '../shared/AIInsightsPanel';
import api from '../../services/api';

const DistrictTab = () => {
  const [loading, setLoading] = useState(true);
  const [districtData, setDistrictData] = useState(null);
  const [expandedDistricts, setExpandedDistricts] = useState(new Set());
  const [selectedForComparison, setSelectedForComparison] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getDistrictPriorities();
      setDistrictData(data);
    } catch (error) {
      console.error('Error loading district data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (district) => {
    const newExpanded = new Set(expandedDistricts);
    if (newExpanded.has(district)) {
      newExpanded.delete(district);
    } else {
      newExpanded.add(district);
    }
    setExpandedDistricts(newExpanded);
  };

  const toggleComparison = (district) => {
    if (selectedForComparison.includes(district.district)) {
      setSelectedForComparison(selectedForComparison.filter(d => d !== district.district));
    } else if (selectedForComparison.length < 4) {
      setSelectedForComparison([...selectedForComparison, district.district]);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading district analysis..." />;
  }

  const results = districtData?.results || {};
  const priorities = results.priorities || [];
  
  // Prepare radar chart data for comparison
  const comparisonData = selectedForComparison.map(districtName => {
    const district = priorities.find(d => d.district === districtName);
    if (!district) return null;
    
    return {
      district: districtName,
      overcapacity: district.overcapacity_score || 0,
      forecast: district.forecast_score || 0,
      travel: district.travel_score || 0,
      population: district.population_score || 0,
    };
  }).filter(Boolean);

  // Get tier color
  const getTierColor = (tier) => {
    switch (tier) {
      case 'Critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'Low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          District Analysis & Priorities
        </h2>
        {selectedForComparison.length > 0 && (
          <button
            onClick={() => setSelectedForComparison([])}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Clear Comparison ({selectedForComparison.length})
          </button>
        )}
      </div>

      {/* Priority Scores Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          District Priority Scores
        </h3>
        <ResponsiveContainer width="100%" height={600}>
          <BarChart data={priorities} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis dataKey="district" type="category" width={150} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6'
              }}
            />
            <Legend />
            <Bar dataKey="priority_score" fill="#3b82f6" name="Priority Score" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* District Comparison Tool */}
      {selectedForComparison.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            District Comparison (Select up to 4)
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={comparisonData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="district" stroke="#9ca3af" />
              <PolarRadiusAxis stroke="#9ca3af" />
              {comparisonData.map((_, index) => (
                <Radar
                  key={index}
                  name={comparisonData[index].district}
                  dataKey={`overcapacity`}
                  stroke={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index]}
                  fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index]}
                  fillOpacity={0.3}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed District Cards */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Detailed District Analysis
        </h3>
        {priorities.map((district, index) => (
          <div
            key={district.district}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* District Header */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                  <MapPin className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      {district.district}
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(district.priority_tier)}`}>
                      {district.priority_tier}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Priority Score: <span className="font-semibold">{district.priority_score.toFixed(2)}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleComparison(district)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedForComparison.includes(district.district)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  disabled={!selectedForComparison.includes(district.district) && selectedForComparison.length >= 4}
                >
                  {selectedForComparison.includes(district.district) ? 'Selected' : 'Compare'}
                </button>
                <button
                  onClick={() => toggleExpand(district.district)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {expandedDistricts.has(district.district) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedDistricts.has(district.district) && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-900/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Schools</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {district.school_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Deficit</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {district.current_deficit.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">2030 Forecast Gap</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {district.forecast_2030_gap.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Travel Time</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {district.avg_travel_time.toFixed(1)} min
                    </p>
                  </div>
                </div>

                {/* Component Scores */}
                <div className="mb-4">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Component Scores</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Overcapacity</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {district.overcapacity_score.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Forecast</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {district.forecast_score.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Travel Time</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {district.travel_score.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Population</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {district.population_score.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Investment Rationale */}
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Investment Rationale</h5>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {district.investment_rationale.map((reason, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Scoring Methodology */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Scoring Methodology
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Weighting Factors</h4>
            <ul className="space-y-1 text-gray-700 dark:text-gray-300">
              <li>• <strong>Overcapacity (40%):</strong> Current deficit severity</li>
              <li>• <strong>Forecast (30%):</strong> Projected 2030 gap</li>
              <li>• <strong>Travel Time (20%):</strong> Accessibility challenges</li>
              <li>• <strong>Population (10%):</strong> Density and growth</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Priority Tiers</h4>
            <ul className="space-y-1 text-gray-700 dark:text-gray-300">
              <li>• <strong>Critical (&gt;75):</strong> Immediate intervention required</li>
              <li>• <strong>High (60-75):</strong> Near-term action needed</li>
              <li>• <strong>Medium (45-60):</strong> Medium-term planning</li>
              <li>• <strong>Low (&lt;45):</strong> Monitor and maintain</li>
            </ul>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {districtData?.ai_insights && (
        <AIInsightsPanel insights={districtData.ai_insights} title="AI District Analysis Insights" />
      )}
    </div>
  );
};

export default DistrictTab;
