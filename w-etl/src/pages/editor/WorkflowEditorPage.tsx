import React, { useCallback, useMemo, useState } from 'react';
import {
  Play,
  Save,
  Download,
  ArrowLeft,
  FileInput,
  Filter,
  Scissors,
  Save as SaveIcon,
  MousePointer2,
  Info,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowInstance,
  addEdge,
  Connection,
  Edge,
  Node,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

type Row = Record<string, any>;

type BaseNodeData = {
  label: string;
  description?: string;
  sampleRows?: Row[];
  setData?: (updater: (prev: any) => any) => void;
};

type FileNodeData = BaseNodeData & {
  rows: Row[];
};

type FilterNodeData = BaseNodeData & {
  field: string;
  operator: 'equals' | 'contains';
  value: string;
};

type RemoveNodeData = BaseNodeData & {
  field: string;
};

type SaveNodeData = BaseNodeData & {
  lastSavedCsv?: string;
};

type WorkflowNodeData = FileNodeData | FilterNodeData | RemoveNodeData | SaveNodeData;

const NODE_PALETTE = [
  { type: 'file', label: 'File Input', icon: FileInput, color: 'bg-blue-500' },
  { type: 'filter', label: 'Filter Rows', icon: Filter, color: 'bg-indigo-500' },
  { type: 'remove', label: 'Remove Column', icon: Scissors, color: 'bg-orange-500' },
  { type: 'save', label: 'Save CSV', icon: SaveIcon, color: 'bg-green-500' },
];

const sampleRows: Row[] = [
  { id: 1, name: 'Alice', country: 'US', amount: 120 },
  { id: 2, name: 'Bob', country: 'UK', amount: 80 },
  { id: 3, name: 'Charlie', country: 'US', amount: 200 },
  { id: 4, name: 'Diana', country: 'DE', amount: 150 },
];

const FileInputNode = ({ data }: { data: FileNodeData }) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="source" position={Position.Right} className="!bg-blue-500" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-blue-100 text-blue-700"><FileInput className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label}</p>
        <p className="text-xs text-slate-500">Provide sample rows</p>
      </div>
    </div>
    <button
      className="w-full text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md py-1"
      onClick={() => data.setData?.((prev: FileNodeData) => ({ ...prev, rows: sampleRows }))}
    >
      Load sample data
    </button>
    <div className="mt-2 text-xs text-slate-600 space-y-1">
      <p>Rows: {data.rows?.length || 0}</p>
      <p>Columns: {data.rows?.[0] ? Object.keys(data.rows[0]).length : 0}</p>
    </div>
  </div>
);

const FilterNode = ({ data }: { data: FilterNodeData }) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} className="!bg-slate-400" />
    <Handle type="source" position={Position.Right} className="!bg-indigo-500" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-indigo-100 text-indigo-700"><Filter className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label}</p>
        <p className="text-xs text-slate-500">Keep rows matching</p>
      </div>
    </div>
    <div className="space-y-2 text-xs text-slate-700">
      <input
        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
        placeholder="Field (e.g. country)"
        value={data.field}
        onChange={(e) => data.setData?.((prev: FilterNodeData) => ({ ...prev, field: e.target.value }))}
      />
      <select
        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
        value={data.operator}
        onChange={(e) => data.setData?.((prev: FilterNodeData) => ({ ...prev, operator: e.target.value as FilterNodeData['operator'] }))}
      >
        <option value="equals">equals</option>
        <option value="contains">contains</option>
      </select>
      <input
        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
        placeholder="Value"
        value={data.value}
        onChange={(e) => data.setData?.((prev: FilterNodeData) => ({ ...prev, value: e.target.value }))}
      />
    </div>
  </div>
);

const RemoveColumnNode = ({ data }: { data: RemoveNodeData }) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} className="!bg-slate-400" />
    <Handle type="source" position={Position.Right} className="!bg-orange-500" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-orange-100 text-orange-700"><Scissors className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label}</p>
        <p className="text-xs text-slate-500">Drop a column</p>
      </div>
    </div>
    <input
      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
      placeholder="Column name (e.g. amount)"
      value={data.field}
      onChange={(e) => data.setData?.((prev: RemoveNodeData) => ({ ...prev, field: e.target.value }))}
    />
  </div>
);

const SaveFileNode = ({ data }: { data: SaveNodeData }) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} className="!bg-slate-400" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-green-100 text-green-700"><SaveIcon className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label}</p>
        <p className="text-xs text-slate-500">Final output</p>
      </div>
    </div>
    <div className="text-xs text-slate-600 space-y-1">
      <p>Rows saved: {data.lastSavedCsv ? 'Updated' : '—'}</p>
      {data.lastSavedCsv && <p className="truncate" title={data.lastSavedCsv}>CSV ready</p>}
    </div>
  </div>
);

const nodeTypes = {
  file: FileInputNode,
  filter: FilterNode,
  remove: RemoveColumnNode,
  save: SaveFileNode,
};

const toCsv = (rows: Row[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach((r) => {
    lines.push(headers.map((h) => JSON.stringify(r[h] ?? '')).join(','));
  });
  return lines.join('\n');
};

export const WorkflowEditorPage = () => {
  const { id } = useParams();
  const [workflowName, setWorkflowName] = useState(id ? `Workflow ${id}` : 'New Workflow');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [runMessage, setRunMessage] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const onConnect = useCallback((connection: Edge | Connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true, type: 'smoothstep' }, eds));
  }, [setEdges]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const position = rfInstance?.project({ x: event.clientX - 320, y: event.clientY - 80 }) || { x: 100, y: 100 };
    const id = `${type}-${Date.now()}`;

    const baseData: WorkflowNodeData = {
      label: NODE_PALETTE.find((p) => p.type === type)?.label || 'Node',
      rows: [],
      field: '',
      operator: 'equals',
      value: '',
    } as WorkflowNodeData;

    const dataWithSetter = { ...baseData, setData: (updater: any) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: updater(n.data) } : n)) };

    setNodes((nds) => nds.concat({ id, type: type as any, position, data: dataWithSetter }));
  }, [rfInstance, setNodes]);

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const computeFlow = () => {
    const incoming: Record<string, Edge[]> = {};
    edges.forEach((e) => {
      if (!incoming[e.target]) incoming[e.target] = [];
      incoming[e.target].push(e as Edge);
    });

    const dataOut: Record<string, Row[]> = {};
    const unresolved = new Set(nodes.map((n) => n.id));
    let progress = true;

    while (unresolved.size && progress) {
      progress = false;
      for (const id of Array.from(unresolved)) {
        const node = nodes.find((n) => n.id === id);
        if (!node) continue;

        const deps = incoming[id] || [];
        const inputs = deps.map((d) => dataOut[d.source]).filter(Boolean) as Row[][];
        if (deps.length && inputs.length !== deps.length) continue;

        let out: Row[] = [];
        if (node.type === 'file') {
          const d = node.data as FileNodeData;
          out = d.rows || [];
        } else if (node.type === 'filter') {
          const d = node.data as FilterNodeData;
          const sourceRows = inputs[0] || [];
          if (!d.field || d.value === undefined) {
            out = sourceRows;
          } else {
            out = sourceRows.filter((r) => {
              const val = (r[d.field] ?? '').toString();
              return d.operator === 'equals' ? val === d.value : val.toLowerCase().includes(d.value.toLowerCase());
            });
          }
        } else if (node.type === 'remove') {
          const d = node.data as RemoveNodeData;
          const sourceRows = inputs[0] || [];
          if (!d.field) {
            out = sourceRows;
          } else {
            out = sourceRows.map((r) => {
              const clone = { ...r };
              delete clone[d.field];
              return clone;
            });
          }
        } else if (node.type === 'save') {
          const sourceRows = inputs[0] || [];
          const csv = toCsv(sourceRows);
          out = sourceRows;
          setNodes((nds) => nds.map((n) => n.id === node.id ? { ...n, data: { ...(n.data as SaveNodeData), lastSavedCsv: csv } } : n));
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${workflowName || 'workflow'}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        dataOut[id] = out;
        unresolved.delete(id);
        progress = true;
      }
    }

    if (unresolved.size) {
      setRunMessage('Some nodes could not run. Please check connections.');
    } else {
      setRunMessage('Run complete. Outputs updated.');
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setRunMessage('');
    try {
      computeFlow();
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveName = () => {
    setRunMessage('Name saved locally. (Backend wiring pending)');
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 text-slate-400 hover:bg-slate-100 rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-lg font-semibold text-slate-900 border-none focus:ring-0 p-0 hover:bg-slate-50 rounded px-2"
          />
          <button
            onClick={handleSaveName}
            className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md bg-blue-50 border border-blue-200"
          >
            Save Name
          </button>
        </div>

        <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                <Download className="w-4 h-4" />
                Export
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <button
              onClick={handleSaveName}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-md shadow-sm transition-colors"
            >
                <Save className="w-4 h-4" />
                Save
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Play className="w-4 h-4 fill-current" />
                {isRunning ? 'Running...' : 'Run'}
            </button>
        </div>
      </header>

      {runMessage && (
        <div className="px-4 py-2 text-sm text-blue-700 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <Info className="w-4 h-4" />
          {runMessage}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nodes</h3>
            </div>
            
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {NODE_PALETTE.map((node) => (
                    <div
                        key={node.type}
                        onDragStart={(event) => onDragStart(event, node.type)}
                        draggable
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm cursor-grab hover:border-blue-300 hover:ring-1 hover:ring-blue-100 transition-all active:cursor-grabbing"
                    >
                        <div className={`p-2 rounded-md ${node.color} text-white`}>
                            <node.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{node.label}</span>
                    </div>
                ))}
            </div>

            <div className="mt-auto p-4 border-t border-slate-200 bg-slate-100/50">
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700">
                   <MousePointer2 className="w-4 h-4 shrink-0 mt-0.5" />
                   <p>Drag nodes from this panel onto the canvas to build your workflow.</p>
                </div>
            </div>
        </aside>

        <main className="flex-1 relative bg-slate-100 overflow-hidden">
            <div 
                className="absolute inset-0 opacity-[0.4]"
                style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setRfInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              fitView
            >
              <Background gap={20} size={1} color="#cbd5e1" />
              <MiniMap nodeColor={() => '#0ea5e9'} />
              <Controls />
            </ReactFlow>
        </main>
      </div>
    </div>
  );
};
