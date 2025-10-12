import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={48} />
      <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
