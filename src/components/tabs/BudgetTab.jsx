import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, Calculator, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';
import AIInsightsPanel from '../shared/AIInsightsPanel';
import api from '../../services/api';

const BudgetTab = () => {
  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState(null);
  const [budget, setBudget] = useState(1000000000); // 1 Billion SAR default

  useEffect(() => {
    loadData();
  }, [budget]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Use the correct function name from api.js: getBudgetOptimization
      const data = await api.getBudgetOptimization(budget);
      console.log('Budget API Response:', data);
      setBudgetData(data);
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Optimizing budget allocation..." />;
  }

  if (!budgetData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">Unable to load budget data.</p>
      </div>
    );
  }

  // Parse the actual API response structure
  const optimizationResults = budgetData.optimization_results || {};
  const selectedProjects = budgetData.selected_projects || [];
  const alternativeScenarios = budgetData.alternative_scenarios || {};
  const parameters = budgetData.parameters || {};

  // Prepare pie chart data
  const pieData = [
    { 
      name: 'Expansions', 
      value: optimizationResults.projects_by_type?.expansions || 0, 
      color: '#3b82f6' 
    },
    { 
      name: 'New Schools', 
      value: optimizationResults.projects_by_type?.new_schools || 0, 
      color: '#10b981' 
    },
  ];

  // Prepare bar chart data (top 10 projects by cost)
  const topProjects = selectedProjects.slice(0, 10).map(p => ({
    name: p.school_name ? p.school_name.substring(0, 25) : `${p.district} (${p.type})`,
    cost: (p.estimated_cost || 0) / 1000000, // Convert to millions
    roi: p.students_per_sar ? (p.students_per_sar * 1000000) : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Budget Planning & Optimization
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Allocate resources efficiently to maximize student capacity and ROI
        </p>
      </div>

      {/* Budget Slider */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Calculator className="text-blue-600 dark:text-blue-400" size={24} />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Interactive Budget Allocation
          </h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Total Budget (SAR)
            </label>
            <input
              type="range"
              min="500000000"
              max="5000000000"
              step="100000000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
              <span>500M SAR</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {(budget / 1000000000).toFixed(1)}B SAR
              </span>
              <span>5B SAR</span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Projects Selected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {optimizationResults.total_projects || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Students Served</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {(optimizationResults.total_students_served || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Budget Used</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {optimizationResults.budget_utilization_pct || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cost/Student</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {(optimizationResults.avg_cost_per_student || 0).toLocaleString()} SAR
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart: Project Types */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Project Distribution
          </h3>
          {selectedProjects.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <AlertCircle className="mx-auto mb-2" size={48} />
                <p>No projects selected with current budget</p>
                <p className="text-sm">Try increasing the budget allocation</p>
              </div>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expansions</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {optimizationResults.projects_by_type?.expansions || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">New Schools</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {optimizationResults.projects_by_type?.new_schools || 0}
              </p>
            </div>
          </div>
        </div>

        {/* ROI Analysis */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Return on Investment
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Budget Utilization</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {optimizationResults.budget_utilization_pct || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(optimizationResults.budget_utilization_pct || 0, 100)}%` }}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-green-200 dark:border-green-800">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Capacity Added</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                +{(optimizationResults.total_capacity_added || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">student seats</p>
            </div>
            <div className="pt-4 border-t border-green-200 dark:border-green-800">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Estimated Timeline</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {optimizationResults.estimated_timeline || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart: Top Projects */}
      {topProjects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Top 10 Projects by Cost
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topProjects}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fill: 'currentColor' }}
              />
              <YAxis 
                label={{ value: 'Cost (Million SAR)', angle: -90, position: 'insideLeft' }}
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--tooltip-bg)', 
                  border: '1px solid var(--tooltip-border)' 
                }}
              />
              <Legend />
              <Bar dataKey="cost" fill="#3b82f6" name="Cost (M SAR)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Project Prioritization Table */}
      {selectedProjects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Selected Projects ({selectedProjects.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    District
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cost (SAR)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ROI
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Timeline
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {selectedProjects.map((project, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {project.school_name || `${project.district} ${project.type}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {project.district}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.type === 'expansion' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {project.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {((project.estimated_cost || 0) / 1000000).toFixed(1)}M
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {(project.additional_capacity || project.recommended_capacity || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        (project.priority_score || 0) >= 8 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : (project.priority_score || 0) >= 5
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {(project.priority_score || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {project.students_per_sar ? (project.students_per_sar * 1000000).toFixed(2) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {project.implementation_time_months ? `${project.implementation_time_months} months` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alternative Scenarios */}
      {(alternativeScenarios.all_expansions || alternativeScenarios.all_new_schools) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Alternative Budget Scenarios
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alternativeScenarios.all_expansions && (
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  All Expansions Strategy
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {alternativeScenarios.all_expansions.description}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Budget Needed:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {((alternativeScenarios.all_expansions.budget_needed || 0) / 1000000).toFixed(0)}M SAR
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Students Served:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {(alternativeScenarios.all_expansions.students_served || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Timeline:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {alternativeScenarios.all_expansions.timeline}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {alternativeScenarios.all_new_schools && (
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  All New Schools Strategy
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {alternativeScenarios.all_new_schools.description}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Budget Needed:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {((alternativeScenarios.all_new_schools.budget_needed || 0) / 1000000).toFixed(0)}M SAR
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Students Served:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {(alternativeScenarios.all_new_schools.students_served || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Timeline:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {alternativeScenarios.all_new_schools.timeline}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {budgetData?.ai_insights && (
        <AIInsightsPanel 
          insights={budgetData.ai_insights} 
          title="AI Budget Optimization Insights" 
        />
      )}
    </div>
  );
};

export default BudgetTab;