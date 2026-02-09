import React from 'react';
import clsx from 'clsx';

export const Field = ({ label, children, description, className }: { label?: string; description?: string; children: React.ReactNode; className?: string }) => (
  <label className={clsx('flex flex-col gap-1 text-xs text-slate-700', className)}>
    {label ? <span className="font-medium text-slate-800">{label}</span> : null}
    {children}
    {description ? <span className="text-[11px] text-slate-500">{description}</span> : null}
  </label>
);

export const TextInput = ({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={clsx('w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300', className)}
    {...rest}
  />
);

export const NumberInput = ({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    type="number"
    className={clsx('w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300', className)}
    {...rest}
  />
);

export const Select = ({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={clsx('w-full rounded-md border border-slate-200 px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300', className)}
    {...rest}
  >
    {children}
  </select>
);

export const TextArea = ({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={clsx('w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300', className)}
    {...rest}
  />
);

export const Checkbox = ({ label, className, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className={clsx('flex items-center gap-2 text-xs text-slate-700', className)}>
    <input type="checkbox" className="rounded border-slate-300" {...rest} />
    <span>{label}</span>
  </label>
);
