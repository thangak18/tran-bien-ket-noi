import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
