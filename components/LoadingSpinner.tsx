import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string; // Tailwind text color class e.g. text-blue-500
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', color = 'text-slate-300' }) => {
  let spinnerSizeClass = 'h-8 w-8';
  if (size === 'sm') spinnerSizeClass = 'h-5 w-5';
  if (size === 'lg') spinnerSizeClass = 'h-12 w-12';

  return (
    <div className={`inline-block animate-spin-fast rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] ${spinnerSizeClass} ${color}`} role="status">
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
        Loading...
      </span>
    </div>
  );
};