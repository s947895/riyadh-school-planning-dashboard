import { useState } from 'react';
import { DarkModeProvider } from './contexts/DarkModeContext';
import Header from './components/layout/Header';
import OverviewTab from './components/tabs/OverviewTab';
import MapTab from './components/tabs/MapTab';
import ForecastingTab from './components/tabs/ForecastingTab';
import BudgetTab from './components/tabs/BudgetTab';
import DistrictTab from './components/tabs/DistrictTab';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'map':
        return <MapTab />;
      case 'forecasting':
        return <ForecastingTab />;
      case 'budget':
        return <BudgetTab />;
      case 'districts':
        return <DistrictTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderTabContent()}
        </main>
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
              © 2025 Riyadh Ministry of Education - School Planning Dashboard
            </p>
          </div>
        </footer>
      </div>
    </DarkModeProvider>
  );
}

export default App;
