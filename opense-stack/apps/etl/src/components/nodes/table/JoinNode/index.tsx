import { Handle, Position } from 'reactflow';

export const JoinNode = () => (
  <div className="bg-white border border-green-200 rounded-lg p-4 shadow-md w-64">
    <div className="font-bold text-sm mb-4 text-green-700">Join Tables</div>

    <div className="relative flex items-center mb-2">
      <Handle
        type="target"
        position={Position.Left}
        id="input-left"
        className="w-3 h-3 bg-blue-500 !left-[-18px]"
      />
      <span className="text-xs text-slate-500 ml-2">Table A</span>
    </div>

    <div className="relative flex items-center mb-4">
      <Handle
        type="target"
        position={Position.Left}
        id="input-right"
        className="w-3 h-3 bg-orange-500 !left-[-18px]"
      />
      <span className="text-xs text-slate-500 ml-2">Table B</span>
    </div>

    <Handle
      type="source"
      position={Position.Right}
      id="output-merged"
      className="w-3 h-3 bg-green-500"
    />
    <div className="text-right text-xs text-slate-400 mt-2">
      Connect both inputs to merge rows
    </div>
  </div>
);
