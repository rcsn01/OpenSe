import React, { useState } from 'react';
import { History, RotateCcw, X, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useWorkflowVersions } from '../../hooks/queries/useVersions';
import { WorkflowVersion } from '../../api/versions';

interface VersionHistoryPanelProps {
  workflowId: string | null;
  onRestore: (version: WorkflowVersion) => void;
  onClose: () => void;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  workflowId,
  onRestore,
  onClose,
}) => {
  const { data: versions = [], isLoading } = useWorkflowVersions(workflowId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 h-full shadow-lg z-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Version History</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : versions.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No versions yet.</p>
            <p className="text-xs mt-1">Versions are created each time you save.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {versions.map((version, index) => {
              const isExpanded = expandedId === version.id;
              const isCurrent = index === 0;

              return (
                <div key={version.id} className="group">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : version.id)}
                    className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="mt-0.5">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          v{version.version_number}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-medium border border-green-200">
                            Latest
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {version.name || 'Untitled'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {formatDate(version.created_at)}
                      </p>
                      {version.change_summary && (
                        <p className="text-[10px] text-slate-500 mt-1 italic">
                          {version.change_summary}
                        </p>
                      )}
                    </div>
                  </button>

                  {isExpanded && !isCurrent && (
                    <div className="px-4 pb-3 pl-10">
                      <button
                        onClick={() => onRestore(version)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore this version
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <p className="text-[10px] text-slate-400 text-center">
          Versions are created automatically when you save.
        </p>
      </div>
    </aside>
  );
};
