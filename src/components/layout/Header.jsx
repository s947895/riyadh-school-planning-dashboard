import React from 'react';
import { Moon, Sun, School } from 'lucide-react';
import { useDarkMode } from '../../contexts/DarkModeContext';

const Header = ({ activeTab, setActiveTab }) => {
  const { darkMode, toggleDarkMode } = useDarkMode();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'map', label: 'Interactive Map', icon: '🗺️' },
    { id: 'forecasting', label: 'Forecasting', icon: '📈' },
    { id: 'budget', label: 'Budget Planning', icon: '💰' },
    { id: 'districts', label: 'District Analysis', icon: '🎯' },
  ];

  return (
    <header className="bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <School className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Riyadh School Planning Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ministry of Education - Strategic Planning System
              </p>
            </div>
          </div>
          
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all
                ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
