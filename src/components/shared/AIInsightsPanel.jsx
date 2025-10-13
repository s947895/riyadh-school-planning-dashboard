import React from 'react';
import { Sparkles } from 'lucide-react';

const AIInsightsPanel = ({ insights, title = "AI Strategic Insights" }) => {
  if (!insights) return null;

  // Handle different formats - insights could be an object or string
  let content = '';
  
  if (typeof insights === 'string') {
    content = insights;
  } else if (typeof insights === 'object') {
    // Extract the text content from the insights object
    // Based on your API structure: { explanation, summary, recommendations, etc }
    content = insights.explanation || insights.summary || '';
    
    // If recommendations array exists, add it to content
    if (insights.recommendations && Array.isArray(insights.recommendations)) {
      content += '\n\n## Recommendations\n';
      insights.recommendations.forEach((rec, idx) => {
        content += `\n${idx + 1}. ${rec}`;
      });
    }
  }

  if (!content) return null;

  // Parse markdown-style content
  const formatContent = (text) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return null;

      // Headers
      if (trimmed.startsWith('## ')) {
        return (
          <h4 key={i} className="text-base font-bold text-gray-900 dark:text-white mt-4 mb-2">
            {trimmed.replace('## ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h5 key={i} className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1">
            {trimmed.replace('### ', '')}
          </h5>
        );
      }

      // Numbered lists
      if (/^\d+\.\s/.test(trimmed)) {
        const content = trimmed.replace(/^\d+\.\s/, '');
        const parts = content.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="text-sm text-gray-700 dark:text-gray-300 mb-2 ml-4">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 mr-2">
              {trimmed.match(/^\d+/)[0]}.
            </span>
            {parts.map((part, j) => 
              j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : part
            )}
          </p>
        );
      }

      // Bullet points
      if (trimmed.startsWith('- ')) {
        const content = trimmed.substring(2);
        const parts = content.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="text-sm text-gray-700 dark:text-gray-300 mb-2 ml-4">
            {parts.map((part, j) => 
              j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : part
            )}
          </p>
        );
      }

      // Regular paragraphs with bold support
      const parts = trimmed.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
          {parts.map((part, j) => 
            j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : part
          )}
        </p>
      );
    });
  };

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg shadow-lg border border-emerald-200 dark:border-emerald-800 p-6">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
            <Sparkles className="text-white" size={24} />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {title}
          </h3>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {formatContent(content)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsPanel;
