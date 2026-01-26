import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Save, Download, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface EditorHeaderProps {
    workflowName: string;
    onNameChange: (name: string) => void;
    onNameBlur: () => void;
    onImportClick: () => void;
    onExportClick: () => void;
    onSave: () => void;
    onRun: () => void;
    isSaving: boolean;
    isRunning: boolean;
    importInputRef: React.RefObject<HTMLInputElement | null>;
    onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
    workflowName,
    onNameChange,
    onNameBlur,
    onImportClick,
    onExportClick,
    onSave,
    onRun,
    isSaving,
    isRunning,
    importInputRef,
    onImportFile
}) => {
    return (
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 z-10 shrink-0 shadow-sm">
            <div className="flex items-center gap-4">
                <Link to="/" className="p-2 text-slate-400 hover:bg-slate-100 rounded-md transition-colors" title="Back to Dashboard">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="h-6 w-px bg-slate-200" />
                <input
                    value={workflowName}
                    onChange={(e) => onNameChange(e.target.value)}
                    onBlur={onNameBlur}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.currentTarget.blur();
                        }
                    }}
                    className="text-lg font-semibold text-slate-900 border-none focus:ring-0 p-0 hover:bg-slate-50 rounded px-2 w-64 lg:w-96 transition-colors bg-transparent"
                    placeholder="Workflow Name"
                />
            </div>

            <div className="flex items-center gap-2">
                <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={onImportFile}
                />

                <Button
                    variant="ghost"
                    onClick={onImportClick}
                    className="text-slate-600"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Import
                </Button>

                <Button
                    variant="ghost"
                    onClick={onExportClick}
                    className="text-slate-600"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                </Button>

                <div className="h-6 w-px bg-slate-200 mx-2" />

                <Button
                    variant="secondary"
                    onClick={onSave}
                    disabled={isSaving}
                    className="min-w-[80px]"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>

                <Button
                    variant="primary"
                    onClick={onRun}
                    disabled={isRunning}
                    className="min-w-[80px]"
                >
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    {isRunning ? 'Running...' : 'Run'}
                </Button>
            </div>
        </header>
    );
};
