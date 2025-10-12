import React, { useState, useEffect } from 'react';
import { School, Users, AlertTriangle, TrendingUp, MapPin } from 'lucide-react';
import KPICard from '../shared/KPICard';
import AIInsightsPanel from '../shared/AIInsightsPanel';
import LoadingSpinner from '../shared/LoadingSpinner';
import api from '../../services/api';

const OverviewTab = () => {
  const [loading, setLoading] = useState(true);
  const [capacityData, setCapacityData] = useState(null);
  const [districtData, setDistrictData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [capacity, districts] = await Promise.all([
        api.getCapacityAnalysis(),
        api.getDistrictPriorities()
      ]);
      setCapacityData(capacity);
      setDistrictData(districts);
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading system overview..." />;
  }

  const capacityAnalysis = capacityData?.results || {};
  const priorities = districtData?.results?.priorities || [];
  const topPriorities = priorities.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* System-wide KPIs */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          System-wide Key Performance Indicators
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Schools"
            value={capacityAnalysis.total_schools || '0'}
            icon={School}
            color="blue"
          />
          <KPICard
            title="Total Students"
            value={(capacityAnalysis.total_students || 0).toLocaleString()}
            icon={Users}
            color="green"
          />
          <KPICard
            title="Capacity Deficit"
            value={(capacityAnalysis.total_deficit || 0).toLocaleString()}
            subtitle="Students over capacity"
            icon={AlertTriangle}
            color="red"
          />
          <KPICard
            title="Utilization Rate"
            value={`${(capacityAnalysis.utilization_rate || 0).toFixed(1)}%`}
            icon={TrendingUp}
            color="purple"
          />
        </div>
      </section>

      {/* Critical Alerts */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Critical Alerts
        </h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                Immediate Action Required
              </h3>
              <ul className="space-y-2 text-sm text-red-800 dark:text-red-200">
                <li>
                  • <strong>{capacityAnalysis.overcapacity_count || 0} schools</strong> are currently over capacity
                </li>
                <li>
                  • <strong>{(capacityAnalysis.total_deficit || 0).toLocaleString()} students</strong> without adequate seats
                </li>
                <li>
                  • <strong>{capacityAnalysis.critical_districts || 0} districts</strong> require immediate intervention
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Top 5 Priority Districts */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Top 5 Priority Districts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topPriorities.map((district, index) => (
            <div
              key={district.district}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <MapPin className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                </div>
                <span className={`
                  px-3 py-1 rounded-full text-xs font-semibold
                  ${district.priority_tier === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : ''}
                  ${district.priority_tier === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : ''}
                  ${district.priority_tier === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : ''}
                `}>
                  {district.priority_tier}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {district.district}
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Priority Score:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {district.priority_score.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Schools:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {district.school_count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Current Deficit:</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {district.current_deficit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Insights */}
      {capacityData?.ai_insights && (
        <AIInsightsPanel insights={capacityData.ai_insights} />
      )}
    </div>
  );
};

export default OverviewTab;
