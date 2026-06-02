import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Save, Download, ArrowLeft, Undo2, Redo2, History, Bell } from 'lucide-react';
import { Button } from '@repo/ui';

interface EditorHeaderProps {
    workflowName: string;
    onNameChange: (name: string) => void;
    onNameBlur: () => void;
    /** Tab to show when returning to dashboard (personal vs org). Ensures saved workflow appears in the list. */
    dashboardTab?: 'personal' | 'org';
    onImportClick: () => void;
    onExportClick: () => void;
    onSave: () => void;
    onRun: () => void;
    isSaving: boolean;
    isRunning: boolean;
    importInputRef: React.RefObject<HTMLInputElement | null>;
    onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
    // Undo/Redo
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    // Version History
    onToggleVersionHistory?: () => void;
    hasVersionHistory?: boolean;
    // Notifications
    onToggleNotifications?: () => void;
    hasNotifications?: boolean;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
    workflowName,
    onNameChange,
    onNameBlur,
    dashboardTab = 'personal',
    onImportClick,
    onExportClick,
    onSave,
    onRun,
    isSaving,
    isRunning,
    importInputRef,
    onImportFile,
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false,
    onToggleVersionHistory,
    hasVersionHistory = false,
    onToggleNotifications,
    hasNotifications = false,
}) => {
    return (
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 z-10 shrink-0 shadow-sm">
            <div className="flex items-center gap-4">
                <Link to={`/dashboard/${dashboardTab}`} className="p-2 text-slate-400 hover:bg-slate-100 rounded-md transition-colors" title="Back to Dashboard">
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

            <div className="flex items-center gap-1">
                {/* Undo/Redo */}
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 className="w-4 h-4" />
                </button>
                <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Redo (Ctrl+Y)"
                >
                    <Redo2 className="w-4 h-4" />
                </button>

                <div className="h-6 w-px bg-slate-200 mx-1" />

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

                {/* Version History */}
                {hasVersionHistory && onToggleVersionHistory && (
                    <Button
                        variant="ghost"
                        onClick={onToggleVersionHistory}
                        className="text-slate-600"
                    >
                        <History className="w-4 h-4 mr-2" />
                        History
                    </Button>
                )}

                {/* Notifications */}
                {hasNotifications && onToggleNotifications && (
                    <Button
                        variant="ghost"
                        onClick={onToggleNotifications}
                        className="text-slate-600"
                    >
                        <Bell className="w-4 h-4 mr-2" />
                        Alerts
                    </Button>
                )}

                <div className="h-6 w-px bg-slate-200 mx-1" />

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
