import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`rounded-card border border-[#E5E7EB] bg-white p-4 shadow-soft transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
