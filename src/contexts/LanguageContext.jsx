import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  const [direction, setDirection] = useState(language === 'ar' ? 'rtl' : 'ltr');

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    setDirection(language === 'ar' ? 'rtl' : 'ltr');
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  const value = {
    language,
    direction,
    isRTL: language === 'ar',
    toggleLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

const translations = {
  en: {
    'app.title': 'Riyadh School Planning',
    'app.subtitle': 'Ministry of Education Dashboard',
    'tab.overview': 'Overview',
    'tab.map': 'Interactive Map',
    'tab.forecasting': 'Forecasting',
    'tab.budget': 'Budget Planning',
    'tab.districts': 'District Analysis',
    'districts.title': 'District Analysis & Priorities',
    'districts.filter.tier': 'Filter by Tier',
    'districts.filter.all': 'All Tiers',
    'districts.filter.high': 'High Priority',
    'districts.filter.medium': 'Medium Priority',
    'districts.filter.low': 'Low Priority',
    'districts.sort.label': 'Sort By',
    'districts.sort.score': 'Priority Score',
    'districts.sort.name': 'District Name',
    'districts.sort.deficit': 'Current Deficit',
    'districts.sort.forecast': '2030 Forecast Gap',
    'districts.comparison.selected': 'Selected for Comparison',
    'districts.chart.title': 'District Priority Scores',
    'districts.methodology.title': 'Scoring Methodology',
    'districts.methodology.weighting': 'Weighting Factors',
    'districts.methodology.overcapacity': 'Current Overcapacity',
    'districts.methodology.growth': 'Forecast Growth (2030)',
    'districts.methodology.travel': 'Travel Accessibility',
    'districts.methodology.population': 'Population Impact',
    'districts.methodology.tiers': 'Priority Tiers',
    'districts.methodology.high': 'HIGH',
    'districts.methodology.medium': 'MEDIUM',
    'districts.methodology.low': 'LOW',
    'districts.top.title': 'Top',
    'districts.top.priority': 'Priority Districts',
    'districts.card.population': 'Population',
    'districts.card.score': 'Priority Score',
    'districts.card.overcapacity': 'Overcapacity Schools',
    'districts.card.deficit': 'Current Deficit',
    'districts.card.forecast': '2030 Forecast Gap',
    'districts.card.travel': 'Avg Travel Time',
    'districts.card.components.title': 'Component Scores',
    'districts.card.rationale': 'Investment Rationale',
    'common.min': 'min',
  },
  ar: {
    'app.title': 'تخطيط مدارس الرياض',
    'app.subtitle': 'لوحة معلومات وزارة التعليم',
    'tab.overview': 'نظرة عامة',
    'tab.map': 'الخريطة التفاعلية',
    'tab.forecasting': 'التنبؤ',
    'tab.budget': 'تخطيط الميزانية',
    'tab.districts': 'تحليل الأحياء',
    'districts.title': 'تحليل الأحياء والأولويات',
    'districts.filter.tier': 'تصفية حسب المستوى',
    'districts.filter.all': 'جميع المستويات',
    'districts.filter.high': 'أولوية عالية',
    'districts.filter.medium': 'أولوية متوسطة',
    'districts.filter.low': 'أولوية منخفضة',
    'districts.sort.label': 'ترتيب حسب',
    'districts.sort.score': 'درجة الأولوية',
    'districts.sort.name': 'اسم الحي',
    'districts.sort.deficit': 'العجز الحالي',
    'districts.sort.forecast': 'فجوة توقعات 2030',
    'districts.comparison.selected': 'المحدد للمقارنة',
    'districts.chart.title': 'درجات أولوية الأحياء',
    'districts.methodology.title': 'منهجية التقييم',
    'districts.methodology.weighting': 'عوامل الترجيح',
    'districts.methodology.overcapacity': 'الاكتظاظ الحالي',
    'districts.methodology.growth': 'النمو المتوقع (2030)',
    'districts.methodology.travel': 'سهولة الوصول',
    'districts.methodology.population': 'التأثير السكاني',
    'districts.methodology.tiers': 'مستويات الأولوية',
    'districts.methodology.high': 'عالية',
    'districts.methodology.medium': 'متوسطة',
    'districts.methodology.low': 'منخفضة',
    'districts.top.title': 'أفضل',
    'districts.top.priority': 'أحياء ذات أولوية',
    'districts.card.population': 'السكان',
    'districts.card.score': 'درجة الأولوية',
    'districts.card.overcapacity': 'مدارس مكتظة',
    'districts.card.deficit': 'العجز الحالي',
    'districts.card.forecast': 'فجوة توقعات 2030',
    'districts.card.travel': 'متوسط وقت السفر',
    'districts.card.components.title': 'درجات المكونات',
    'districts.card.rationale': 'مبررات الاستثمار',
    'common.min': 'دقيقة',
  }
};

export default LanguageContext;
