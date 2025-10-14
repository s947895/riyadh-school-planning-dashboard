import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, Calculator, AlertCircle, Sliders } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';
import AIInsightsPanel from '../shared/AIInsightsPanel';
import api from '../../services/api';

const BudgetTab = () => {
  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState(null);
  const [budget, setBudget] = useState(1000000000); // 1 Billion SAR default
  const [threshold, setThreshold] = useState(400); // Default threshold
  const [maxBudget, setMaxBudget] = useState(5000000000); // Will be updated from API

  useEffect(() => {
    loadData();
  }, [budget, threshold]); // Reload when either changes

  const loadData = async () => {
    setLoading(true);
    try {
      // Call API with both budget AND threshold parameters
      const data = await api.getBudgetOptimizer(budget, threshold);
      console.log('Budget API Response:', data);
      setBudgetData(data);
      
      // Update max budget based on total project cost
      if (data?.project_pool?.total_cost_all_projects) {
        const totalCost = data.project_pool.total_cost_all_projects;
        // Add 20% buffer to max slider value
        setMaxBudget(Math.ceil(totalCost * 1.2 / 1000000000) * 1000000000);
      }
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
  const projectPool = budgetData.project_pool || {};
  const thresholdAnalysis = projectPool.threshold_analysis || {};

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
    roi: p.students_per_sar ? (p.students_per_sar * 1000000).toFixed(2) : 0
  }));

  // Format currency
  const formatCurrency = (value) => {
    return `${(value / 1000000).toFixed(0)}M SAR`;
  };

  // Get threshold hint
  const getThresholdHint = () => {
    const current = thresholdAnalysis[threshold] || {};
    const lower = thresholdAnalysis[Math.max(100, threshold - 100)] || {};
    
    if (lower.new_schools_count > current.new_schools_count) {
      return `Lowering to ${threshold - 100} would add ${lower.new_schools_count - (current.new_schools_count || 0)} more new school projects`;
    }
    return `Current threshold generates ${current.new_schools_count || projectPool.new_school_options || 0} new school options`;
  };

  return (
    <div className="space-y-6">
      {/* What-If Analysis Controls */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Sliders className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            What-If Analysis Controls
          </h3>
        </div>

        {/* Budget Slider */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Budget
            </label>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(budget)}
            </span>
          </div>
          <input
            type="range"
            min="500000000"
            max={maxBudget}
            step="100000000"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>500M SAR</span>
            <span className="text-purple-600 dark:text-purple-400">
              Max needed: {formatCurrency(projectPool.total_cost_all_projects || maxBudget)}
            </span>
            <span>{formatCurrency(maxBudget)}</span>
          </div>
        </div>

        {/* Threshold Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              New School Threshold (minimum gap size)
            </label>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {threshold} students
            </span>
          </div>
          <input
            type="range"
            min="100"
            max="600"
            step="50"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>100 (more projects)</span>
            <span className="text-indigo-600 dark:text-indigo-400 text-center">
              {getThresholdHint()}
            </span>
            <span>600 (fewer projects)</span>
          </div>
        </div>

        {/* Quick Stats about Project Pool */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Available Projects</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {projectPool.total_options || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ({projectPool.expansion_options || 0} exp + {projectPool.new_school_options || 0} new)
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Selected</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {selectedProjects.length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round((selectedProjects.length / (projectPool.total_options || 1)) * 100)}% of pool
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Utilization</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {optimizationResults.budget_utilization_pct || 0}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              of {formatCurrency(budget)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Projects Selected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {optimizationResults.total_projects || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {optimizationResults.projects_by_type?.expansions || 0} exp + {optimizationResults.projects_by_type?.new_schools || 0} new
              </p>
            </div>
            <Calculator className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Students Served</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(optimizationResults.total_students_served || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                +{optimizationResults.total_capacity_added || 0} capacity
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Budget Used</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {optimizationResults.budget_utilization_pct || 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatCurrency(optimizationResults.total_budget_allocated || 0)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cost per Student</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {((optimizationResults.avg_cost_per_student || 0) / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                SAR per student
              </p>
            </div>
            <Calculator className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Project Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Project Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
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
        </div>

        {/* Bar Chart - Top Projects */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top 10 Projects by Cost
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProjects}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={10} />
              <YAxis label={{ value: 'Cost (Million SAR)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="cost" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROI Analysis Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          ROI Analysis
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Average Cost per Student:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {((optimizationResults.avg_cost_per_student || 0) / 1000).toFixed(0)}K SAR
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Budget Utilization:</span>
            <div className="flex items-center">
              <div className="w-48 bg-gray-200 rounded-full h-2 mr-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${optimizationResults.budget_utilization_pct || 0}%` }}
                ></div>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {optimizationResults.budget_utilization_pct || 0}%
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Estimated Timeline:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {optimizationResults.estimated_timeline || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Project Prioritization Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Selected Projects ({selectedProjects.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  District
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Timeline
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {selectedProjects.map((project, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {project.school_name || `${project.district} (New School)`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      project.type === 'expansion' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {project.type === 'expansion' ? 'Expansion' : 'New School'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {project.district}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatCurrency(project.estimated_cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    +{project.additional_capacity || project.recommended_capacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {project.implementation_time_months}mo
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alternative Scenarios */}
      {Object.keys(alternativeScenarios).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Alternative Scenarios
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alternativeScenarios.all_expansions && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
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
                      {formatCurrency(alternativeScenarios.all_expansions.budget_needed || 0)}
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
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
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
                      {formatCurrency(alternativeScenarios.all_new_schools.budget_needed || 0)}
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