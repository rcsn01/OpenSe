import React from 'react';
import { ConcatenateNodeData } from '../../types';

interface ConcatenateNodePropertiesProps {
  data: ConcatenateNodeData;
  onChange: (key: string, value: any) => void;
}

export const ConcatenateNodeProperties: React.FC<ConcatenateNodePropertiesProps> = () => {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-slate-50 rounded-md text-xs text-slate-600">
        <p className="font-semibold mb-1">How it works</p>
        <p>
          Merges two tables vertically (union). Connect the first table to the <strong>Top</strong> input
          and the second table to the <strong>Bottom</strong> input.
        </p>
        <p className="mt-2">
          Columns from both tables are included. Missing values are filled with <code className="bg-slate-200 px-1 rounded">null</code>.
        </p>
      </div>
    </div>
  );
};
