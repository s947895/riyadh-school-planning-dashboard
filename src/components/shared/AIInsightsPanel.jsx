import React from 'react';
import { Sparkles } from 'lucide-react';

const AIInsightsPanel = ({ insights, title = "AI Strategic Insights" }) => {
  if (!insights) return null;

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
            {formatContent(insights)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsPanel;







/**

import React from 'react';
import { Sparkles } from 'lucide-react';

const AIInsightsPanel = ({ insights, title = "AI Strategic Insights" }) => {
  if (!insights) {
    return null;
  }

  const formatContent = (content) => {
    if (!content) return null;
    
    // Handle JSON object from n8n
    let textContent = content;
    if (typeof content === 'object') {
      // Extract the explanation field if it exists
      textContent = content.explanation || content.analysis || JSON.stringify(content, null, 2);
    } else if (typeof content !== 'string') {
      textContent = String(content);
    }
    
    // Split by newlines and format
    return textContent.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return null;

      // Handle markdown headers (## Header)
      if (trimmed.startsWith('##')) {
        return (
          <h4 key={i} className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
            {trimmed.replace(/^##\s*/, '')}
          </h4>
        );
      }

      // Handle bold headers (lines ending with :)
      if (trimmed.endsWith(':') && trimmed.length < 60 && !trimmed.includes('http')) {
        return (
          <h4 key={i} className="font-semibold text-gray-900 dark:text-white mt-3 mb-2">
            {trimmed}
          </h4>
        );
      }

      // Handle bullet points
      if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.match(/^[\d]+\./)) {
        return (
          <li key={i} className="text-sm text-gray-700 dark:text-gray-300 ml-4 mb-1 list-disc">
            {trimmed.replace(/^[-•\d.]\s*/, '')}
          </li>
        );
      }

      // Regular paragraphs
      return (
        <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
          {trimmed}
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
            {formatContent(insights)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsPanel;




        */
