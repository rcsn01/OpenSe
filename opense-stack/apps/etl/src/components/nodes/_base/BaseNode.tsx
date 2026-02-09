// app/src/components/nodes/_base/BaseNode.tsx

import React, { ReactNode } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

// Allow simple string IDs or objects with labels
export type HandleConfig = string | { id: string; label?: string };

export type BaseNodeProps = {
  label: string;
  icon: LucideIcon;
  color?: string;
  description?: string;
  children?: ReactNode; // Made optional
  
  // Updated to accept configurations
  inputs?: HandleConfig[];
  outputs?: HandleConfig[];
  
  // New Resize props
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  
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
  resizable = false,
  minWidth = 200,
  minHeight = 100,
  selected,
  className,
  contentClassName,
  wrapperProps = {},
}: BaseNodeProps) => {
  const outputColor = color.startsWith('bg-') ? color.replace('bg-', '!bg-') : '!bg-slate-500';

  // Helper to normalize handle config
  const getHandleId = (h: HandleConfig) => (typeof h === 'string' ? h : h.id);
  const getHandleLabel = (h: HandleConfig) => (typeof h === 'string' ? null : h.label);

  return (
    <div
      className={clsx(
        'bg-white border-[0px] rounded-xl shadow-md transition-all duration-200 flex flex-col',
        selected ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300',
        // Default width if not resizing, otherwise let style handle it or class override
        !resizable && 'w-64', 
        resizable && 'h-full w-full min-w-[200px]',
        className
      )}
      {...wrapperProps}
    >
      {/* 1. Resize Border (Optional) */}
      {resizable && selected && (
        <NodeResizer
          minWidth={minWidth}
          minHeight={minHeight}
          isVisible={true}
          lineClassName="border-transparent !border-[10px] opacity-100"
          lineStyle={{ borderColor: 'transparent' }}
          handleClassName="h-5 w-5 bg-blue-500 rounded-full border-2 border-white shadow-sm"
        />
      )}

      {/* 2. Input Handles (Left) */}
      {inputs.map((config, index) => (
        <div 
            key={getHandleId(config)}
            className="absolute left-0 flex items-center"
            style={{ 
                top: inputs.length > 1 ? `${((index + 1) * 100) / (inputs.length + 1)}%` : '50%',
                transform: 'translateY(-50%)' 
            }}
        >
            <Handle
              type="target"
              position={Position.Left}
              id={getHandleId(config)}
              className="!w-4 !h-4 !bg-slate-400 !border-2 !border-white transition-transform hover:scale-110 !relative !left-[-8px]"
            />
            {/* Optional Input Label */}
            {getHandleLabel(config) && (
                <span className="text-[10px] text-slate-400 ml-1 font-medium uppercase tracking-wide bg-white/90 px-1 rounded">
                    {getHandleLabel(config)}
                </span>
            )}
        </div>
      ))}

      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-100 bg-slate-50/80 rounded-t-[9px] shrink-0">
        <div className={clsx('p-2 rounded-lg text-white shadow-sm', color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate leading-tight">{label}</p>
          {description ? <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">{description}</p> : null}
        </div>
      </div>

      {/* Content */}
      <div className={clsx('p-3 space-y-3 flex-1', contentClassName)}>
        {children}
      </div>

      {/* 3. Output Handles (Right) */}
      {outputs.map((config, index) => (
        <div 
            key={getHandleId(config)}
            className="absolute right-0 flex items-center flex-row-reverse"
            style={{ 
                top: outputs.length > 1 ? `${((index + 1) * 100) / (outputs.length + 1)}%` : '50%',
                transform: 'translateY(-50%)' 
            }}
        >
            <Handle
              type="source"
              position={Position.Right}
              id={getHandleId(config)}
              className={clsx('!w-4 !h-4 !border-2 !border-white transition-transform hover:scale-110 !relative !right-[-8px]', outputColor)}
            />
            {/* Optional Output Label */}
            {getHandleLabel(config) && (
                <span className="text-[10px] text-slate-400 mr-1 font-medium uppercase tracking-wide bg-white/90 px-1 rounded">
                    {getHandleLabel(config)}
                </span>
            )}
        </div>
      ))}
    </div>
  );
};