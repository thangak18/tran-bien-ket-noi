import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div
      role="tablist"
      className={`flex space-x-2 overflow-x-auto border-b border-gray-200 pb-2 no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex min-h-[var(--tap)] flex-shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
