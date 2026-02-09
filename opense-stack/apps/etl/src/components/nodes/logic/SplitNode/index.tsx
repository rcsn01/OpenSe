import { Handle, Position } from 'reactflow';

export const SplitNode = () => (
  <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-md w-64">
    <div className="font-bold text-sm mb-4 text-purple-700">Split Rows</div>

    <div className="relative mb-4">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-slate-500 !left-[-18px]"
      />
      <span className="text-xs text-slate-500 ml-2">Main Input</span>
    </div>

    <div className="border-t border-slate-100 my-2"></div>

    <div className="relative flex justify-end items-center mb-2">
      <span className="text-xs text-slate-500 mr-2">Evens</span>
      <Handle
        type="source"
        position={Position.Right}
        id="output-even"
        className="w-3 h-3 bg-blue-500 !right-[-18px]"
      />
    </div>

    <div className="relative flex justify-end items-center">
      <span className="text-xs text-slate-500 mr-2">Odds</span>
      <Handle
        type="source"
        position={Position.Right}
        id="output-odd"
        className="w-3 h-3 bg-orange-500 !right-[-18px]"
      />
    </div>
  </div>
);
