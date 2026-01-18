import React, { ReactNode } from 'react';
import { Handle, Position } from 'reactflow';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

export type BaseNodeProps = {
  label: string;
  icon: LucideIcon;
  color?: string; // e.g. "bg-blue-500"
  description?: string;
  children: ReactNode;
  inputs?: string[];
  outputs?: string[];
  selected?: boolean;
  className?: string;
  contentClassName?: string;
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
};

export const BaseNode = ({
  label,
  icon: Icon,
  color = 'bg-slate-500',
  description,
  children,
  inputs = ['in'],
  outputs = ['out'],
  selected,
  className,
  contentClassName,
  wrapperProps = {},
}: BaseNodeProps) => {
  const outputColor = color.startsWith('bg-') ? color.replace('bg-', '!bg-') : '!bg-slate-500';

  return (
    <div
      className={clsx(
        'bg-white border-2 rounded-lg shadow-sm w-64 transition-all',
        selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200',
        className,
      )}
      {...wrapperProps}
    >
      {inputs.map((id, index) => (
        <Handle
          key={id}
          type="target"
          position={Position.Left}
          id={id}
          className="!w-3 !h-3 !bg-slate-400"
          style={{ top: inputs.length > 1 ? `${((index + 1) * 100) / (inputs.length + 1)}%` : '50%' }}
        />
      ))}

      <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-slate-50/50 rounded-t-lg">
        <div className={clsx('p-1.5 rounded-md text-white', color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
          {description ? <p className="text-[11px] text-slate-500 truncate">{description}</p> : null}
        </div>
      </div>

      <div className={clsx('p-3 space-y-3', contentClassName)}>
        {children}
      </div>

      {outputs.map((id, index) => (
        <Handle
          key={id}
          type="source"
          position={Position.Right}
          id={id}
          className={clsx('!w-3 !h-3', outputColor)}
          style={{ top: outputs.length > 1 ? `${((index + 1) * 100) / (outputs.length + 1)}%` : '50%' }}
        />
      ))}
    </div>
  );
};
