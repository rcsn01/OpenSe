import React from 'react';
import clsx from 'clsx';

type StatusBadgeProps = {
  label: string;
  tone?: 'success' | 'neutral' | 'danger';
  className?: string;
};

const toneClass: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  success: 'bg-green-100 text-green-800',
  neutral: 'bg-slate-100 text-slate-800',
  danger: 'bg-red-100 text-red-800',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, tone = 'neutral', className }) => (
  <span className={clsx('inline-flex px-2 text-xs leading-5 font-semibold rounded-full', toneClass[tone], className)}>
    {label}
  </span>
);
