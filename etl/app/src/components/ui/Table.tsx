import React from 'react';
import clsx from 'clsx';

type TableProps = {
  children: React.ReactNode;
  className?: string;
};

export const Table: React.FC<TableProps> = ({ children, className }) => (
  <div className={clsx('bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden', className)}>
    {children}
  </div>
);
