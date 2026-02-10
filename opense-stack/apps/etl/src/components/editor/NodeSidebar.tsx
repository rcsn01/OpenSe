import React, { useMemo, useState } from 'react';
import { MousePointer2, Search, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { nodesByCategory } from '../../components/nodes/registry';
import { Input } from '@repo/ui';
import clsx from 'clsx';

const CATEGORY_ORDER = ['Input', 'Data', 'Logic', 'Visualization', 'Output'];

interface NodeSidebarProps {
    onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export const NodeSidebar: React.FC<NodeSidebarProps> = ({ onDragStart }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    const toggleCategory = (category: string) => {
        setCollapsedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const paletteGroups = useMemo(() => {
        // 1. Get ordered categories
        const ordered = CATEGORY_ORDER.map((category) => ({
            category,
            nodes: nodesByCategory[category] || []
        })).filter((entry) => entry.nodes.length);

        // 2. Get remaining categories
        const remaining = Object.entries(nodesByCategory)
            .filter(([category]) => !CATEGORY_ORDER.includes(category))
            .map(([category, nodes]) => ({ category, nodes }));

        let allGroups = [...ordered, ...remaining];

        // 3. Filter by search
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            allGroups = allGroups.map(group => ({
                ...group,
                nodes: group.nodes.filter(node =>
                    node.label.toLowerCase().includes(lowerTerm) ||
                    node.type.toLowerCase().includes(lowerTerm)
                )
            })).filter(group => group.nodes.length > 0);
        }

        return allGroups;
    }, [searchTerm]);

    return (
        <aside className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 h-full">
            <div className="p-4 border-b border-slate-200 bg-white">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Components</h3>
                <Input
                    prefix={<Search className="w-4 h-4" />}
                    placeholder="Search nodes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-50"
                />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {paletteGroups.map((group) => {
                    const isCollapsed = collapsedCategories[group.category];
                    // Auto-expand if searching
                    const isOpen = searchTerm ? true : !isCollapsed;

                    return (
                        <div key={group.category} className="rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleCategory(group.category)}
                                className="w-full flex items-center justify-between p-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors rounded-md"
                            >
                                <span>{group.category}</span>
                                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>

                            {isOpen && (
                                <div className="mt-1 space-y-2 px-2 pb-2">
                                    {group.nodes.map((node) => (
                                        <div
                                            key={node.type}
                                            onDragStart={(event) => onDragStart(event, node.type)}
                                            draggable
                                            className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm cursor-grab hover:border-blue-400 hover:shadow-md transition-all active:cursor-grabbing relative"
                                        >
                                            <div className="absolute left-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <GripVertical className="w-3 h-3" />
                                            </div>
                                            <div className={clsx(`p-2 rounded-md ${node.color} text-white shrink-0 shadow-sm transition-transform group-hover:scale-105`, "ml-3")}>
                                                <node.icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-slate-800 truncate">{node.label}</span>
                                                <span className="text-[10px] text-slate-400 font-mono truncate">{node.type}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {paletteGroups.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        No nodes found matching "{searchTerm}"
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-100/50">
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700">
                    <MousePointer2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Drag nodes from this panel onto the canvas to build your workflow.</p>
                </div>
            </div>
        </aside>
    );
};
