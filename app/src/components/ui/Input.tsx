import React from 'react';
import clsx from 'clsx';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  prefix?: React.ReactNode;
};

export const Input: React.FC<InputProps> = ({ className, prefix, ...props }) => {
  return (
    <div className={clsx('relative w-full', prefix ? 'flex items-center' : '')}>
      {prefix ? <div className="absolute left-3 text-slate-400 flex items-center pointer-events-none">{prefix}</div> : null}
      <input
        className={clsx(
          'w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm',
          prefix ? 'pl-9' : '',
          className
        )}
        {...props}
      />
    </div>
  );
};
