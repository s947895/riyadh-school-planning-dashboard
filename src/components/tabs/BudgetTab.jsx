import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, Calculator } from 'lucide-react';
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
      const data = await api.getBudgetOptimizer(budget);
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

  const results = budgetData?.results || {};
  const projects = results.selected_projects || [];
  
  // Prepare pie chart data
  const pieData = [
    { name: 'Expansions', value: results.expansion_count || 0, color: '#3b82f6' },
    { name: 'New Schools', value: results.new_school_count || 0, color: '#10b981' },
  ];

  // Prepare bar chart data (top 10 projects)
  const topProjects = projects.slice(0, 10).map(p => ({
    name: `${p.school_name.substring(0, 20)}...`,
    cost: p.estimated_cost / 1000000, // Convert to millions
    roi: p.roi_score,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Budget Planning & Optimization
      </h2>

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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Projects Selected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {results.total_projects || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Students Served</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {results.total_students_served?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Budget Used</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {((results.total_cost || 0) / 1000000000).toFixed(2)}B
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Utilization</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {results.budget_utilization || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cost Breakdown Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Project Type Distribution
          </h3>
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
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Expansions</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {results.expansion_count || 0}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">New Schools</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {results.new_school_count || 0}
              </p>
            </div>
          </div>
        </div>

        {/* ROI Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              ROI Analysis
            </h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cost per Student</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {results.cost_per_student?.toLocaleString() || 0} SAR
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Project ROI</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {results.avg_roi?.toFixed(2) || 0}
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Budget Efficiency</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {results.budget_utilization || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Priority Projects */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Top 10 Priority Projects
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topProjects}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
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
            <Bar dataKey="cost" fill="#3b82f6" name="Cost (Million SAR)" />
            <Bar dataKey="roi" fill="#10b981" name="ROI Score" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Project List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Selected Projects
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  School
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cost (SAR)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  ROI Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Timeline
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {projects.slice(0, 20).map((project, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {project.school_name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      project.project_type === 'Expansion'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {project.project_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {project.estimated_cost.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {project.students_served}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
                    {project.roi_score.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {project.timeline}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Insights */}
      {budgetData?.ai_insights && (
        <AIInsightsPanel insights={budgetData.ai_insights} title="AI Budget Optimization Insights" />
      )}
    </div>
  );
};

export default BudgetTab;
