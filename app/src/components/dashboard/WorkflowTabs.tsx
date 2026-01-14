import React from 'react';
import clsx from 'clsx';
import { WorkflowTabsProps } from './types';

export const WorkflowTabs: React.FC<WorkflowTabsProps> = ({ activeTab, onChange }) => {
  return (
    <div className="border-b border-slate-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onChange('personal')}
          className={clsx(
            'pb-4 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === 'personal'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          )}
        >
          My Personal Workflows
        </button>
        <button
          onClick={() => onChange('org')}
          className={clsx(
            'pb-4 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === 'org'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          )}
        >
          W-ETL Workflows
        </button>
      </nav>
    </div>
  );
};
