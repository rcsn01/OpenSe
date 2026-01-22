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
  // Use specific color for output handle or default to slate
  const outputColor = color.startsWith('bg-') ? color.replace('bg-', '!bg-') : '!bg-slate-500';

  return (
    <div
      className={clsx(
        // Aesthetics: Thicker border, larger rounding, subtle shadow
        'bg-white border-[0px] rounded-xl shadow-md w-64 transition-all duration-200',
        // Selection: Professional ring with opacity instead of harsh outline
        selected ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300',
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
          // Connection Dots: Bigger (!w-4), White Border to separate from line, pop on hover
          className="!w-4 !h-4 !bg-slate-400 !border-2 !border-white transition-transform hover:scale-110"
          style={{ top: inputs.length > 1 ? `${((index + 1) * 100) / (inputs.length + 1)}%` : '50%' }}
        />
      ))}

      {/* Header: Clean layout with consistent spacing */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-100 bg-slate-50/80 rounded-t-[9px]">
        <div className={clsx('p-2 rounded-lg text-white shadow-sm', color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate leading-tight">{label}</p>
          {description ? <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">{description}</p> : null}
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
          // Connection Dots: Bigger, matched color, white border
          className={clsx('!w-4 !h-4 !border-2 !border-white transition-transform hover:scale-110', outputColor)}
          style={{ top: outputs.length > 1 ? `${((index + 1) * 100) / (outputs.length + 1)}%` : '50%' }}
        />
      ))}
    </div>
  );
};