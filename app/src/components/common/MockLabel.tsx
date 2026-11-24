import React from 'react';

export interface MockLabelProps {
  text?: string;
  className?: string;
}

export const MockLabel: React.FC<MockLabelProps> = ({ text = 'Mô phỏng', className = '' }) => {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 select-none ${className}`}
    >
      {text}
    </span>
  );
};
