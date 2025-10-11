import React, { useState, useEffect } from 'react';
import { Sun, Moon, Home, Map, TrendingUp, DollarSign, Target } from 'lucide-react';

// Types
interface Tab {
  id: string;
  name: string;
  icon: React.ReactNode;
}

// Main App Component
export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [darkMode, setDarkMode] = useState(false);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: <Home className="w-5 h-5" /> },
    { id: 'map', name: 'Interactive Map', icon: <Map className="w-5 h-5" /> },
    { id: 'forecasting', name: 'Forecasting', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'budget', name: 'Budget Planning', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'districts', name: 'District Analysis', icon: <Target className="w-5 h-5" /> },
  ];

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo & Title */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Riyadh School Planning
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ministry of Education Dashboard
                  </p>
                </div>
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-700" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'map' && <MapTab />}
          {activeTab === 'forecasting' && <ForecastingTab />}
          {activeTab === 'budget' && <BudgetTab />}
          {activeTab === 'districts' && <DistrictsTab />}
        </main>
      </div>
    </div>
  );
}

// Overview Tab Component with API Integration
function OverviewTab() {
  const [capacityData, setCapacityData] = useState(null);
  const [priorityData, setPriorityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch capacity analysis
        const capacityRes = await fetch('https://n8n.hantoush.space/webhook/analyze-capacity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const capacityJson = await capacityRes.json();
        
        // Fetch district priorities
        const priorityRes = await fetch('https://n8n.hantoush.space/webhook/district-priorities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const priorityJson = await priorityRes.json();
        
        setCapacityData(capacityJson);
        setPriorityData(priorityJson);
        setError(null);
      } catch (err) {
        setError('Failed to load data. Please try again.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">Error Loading Data</h3>
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const summary = capacityData?.summary || {};
  const criticalSchools = capacityData?.overcapacity_schools?.filter(s => s.status === 'CRITICAL OVERCAPACITY').slice(0, 5) || [];
  const topPriorities = priorityData?.top_priorities?.slice(0, 5) || [];
  const aiInsights = capacityData?.ai_insights?.explanation || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            System Overview
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Last updated: {new Date().toLocaleString('en-US', { 
              dateStyle: 'medium', 
              timeStyle: 'short' 
            })}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          Refresh Data
        </button>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Schools"
          value={summary.total_schools?.toString() || '0'}
          subtitle="Across Riyadh"
          color="blue"
        />
        <KPICard
          title="Overcapacity"
          value={summary.overcapacity_schools?.toString() || '0'}
          subtitle="Schools above 100%"
          color="red"
        />
        <KPICard
          title="Critical"
          value={summary.critical_count?.toString() || '0'}
          subtitle="Require urgent action"
          color="orange"
        />
        <KPICard
          title="Student Deficit"
          value={summary.total_deficit?.toLocaleString() || '0'}
          subtitle="Current shortage"
          color="purple"
        />
        <KPICard
          title="Avg Utilization"
          value={`${summary.avg_utilization?.toFixed(1) || '0'}%`}
          subtitle="System-wide"
          color="green"
        />
      </div>

      {/* Critical Alerts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              🚨 Critical Alerts
            </h3>
            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full">
              {criticalSchools.length} Critical
            </span>
          </div>
        </div>
        <div className="p-6">
          {criticalSchools.length > 0 ? (
            <div className="space-y-3">
              {criticalSchools.map((school, index) => (
                <Alert
                  key={school.id || index}
                  severity="critical"
                  title={school.name}
                  message={`${school.utilization}% capacity (${school.deficit} students over limit) - ${school.district}`}
                  district={school.district}
                  utilization={school.utilization}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No critical alerts at this time
            </p>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Priority Districts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              🎯 Top 5 Priority Districts
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Ranked by priority score
            </p>
          </div>
          <div className="p-6">
            {topPriorities.length > 0 ? (
              <div className="space-y-3">
                {topPriorities.map((priority, index) => (
                  <PriorityItem
                    key={priority.district}
                    rank={index + 1}
                    district={priority.district}
                    score={priority.score}
                    tier={priority.tier}
                    issues={priority.key_issues}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No priority data available
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              📊 System Metrics
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Current status breakdown
            </p>
          </div>
          <div className="p-6 space-y-4">
            <MetricRow
              label="Total Capacity"
              value="Available across all schools"
              stat={capacityData?.all_schools?.reduce((sum, s) => sum + s.capacity, 0).toLocaleString() || '0'}
            />
            <MetricRow
              label="Total Enrollment"
              value="Current student count"
              stat={capacityData?.all_schools?.reduce((sum, s) => sum + s.enrollment, 0).toLocaleString() || '0'}
            />
            <MetricRow
              label="2030 Forecast Gap"
              value="Projected shortage"
              stat={capacityData?.forecast_2030?.[0]?.gap?.toLocaleString() || 'N/A'}
              highlight="red"
            />
            <MetricRow
              label="Recommendations"
              value="Action items"
              stat={capacityData?.recommendations?.length?.toString() || '0'}
              highlight="blue"
            />
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <AIInsightsPanel content={aiInsights} />
    </div>
  );
}

// Placeholder components for other tabs
function MapTab() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Interactive Map
      </h2>
      <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Map tab coming soon...</p>
      </div>
    </div>
  );
}

function ForecastingTab() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Forecasting & Scenarios
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mt-4">Forecasting tab coming soon...</p>
    </div>
  );
}

function BudgetTab() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Budget Planning
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mt-4">Budget tab coming soon...</p>
    </div>
  );
}

function DistrictsTab() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        District Analysis
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mt-4">Districts tab coming soon...</p>
    </div>
  );
}

// Reusable Components
function KPICard({ title, value, subtitle, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 ${colorClasses[color]} transition-all hover:shadow-lg`}>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        {title}
      </h3>
      <div className={`text-3xl font-bold mb-1 ${colorClasses[color].split(' ')[2]}`}>
        {value}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
  );
}

function Alert({ severity, title, message, district, utilization }) {
  const severityClasses = {
    critical: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
    warning: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20',
  };

  return (
    <div className={`border-l-4 p-4 rounded transition-all hover:shadow-md ${severityClasses[severity]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{title}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{message}</p>
        </div>
        {utilization && (
          <div className="ml-4 flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center border-4 border-red-500">
              <div className="text-center">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {utilization}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PriorityItem({ rank, district, score, tier, issues }) {
  const [expanded, setExpanded] = useState(false);
  
  const tierColors = {
    'CRITICAL': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    'HIGH': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    'MEDIUM': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    'LOW': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all hover:shadow-md">
      <div 
        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            #{rank}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">{district}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Priority Score: {score.toFixed(1)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${tierColors[tier] || tierColors['MEDIUM']}`}>
            {tier}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {expanded && issues && issues.length > 0 && (
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Issues:</p>
          <ul className="space-y-1">
            {issues.map((issue, idx) => (
              <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                <span className="text-emerald-600 dark:text-emerald-400 mr-2">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value, stat, highlight }) {
  const highlightColors = {
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div>
        <p className="font-medium text-gray-900 dark:text-white text-sm">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{value}</p>
      </div>
      <div className={`text-lg font-bold ${highlight ? highlightColors[highlight] : 'text-gray-900 dark:text-white'}`}>
        {stat}
      </div>
    </div>
  );
}

function AIInsightsPanel({ content }) {
  if (!content) return null;

  // Parse markdown-style content
  const formatContent = (text) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('## ')) {
          return <h4 key={i} className="text-base font-bold text-gray-900 dark:text-white mt-4 mb-2">{line.replace('## ', '')}</h4>;
        }
        if (line.startsWith('### ')) {
          return <h5 key={i} className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1">{line.replace('### ', '')}</h5>;
        }
        // Bold text
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
            </p>
          );
        }
        // Regular paragraph
        if (line.trim()) {
          return <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{line}</p>;
        }
        return null;
      });
  };

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg shadow border border-emerald-200 dark:border-emerald-800">
      <div className="p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              AI Strategic Insights
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {formatContent(content)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
