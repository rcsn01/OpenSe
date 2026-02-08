import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { WorkflowRow } from '../components/dashboard/types';
import {
    DEMO_USER_ID,
    DEMO_ORG_ID,
    defaultDemoWorkflow,
    defaultDemoGraphData
} from '../lib/demoData';

// Type for workflow with graph data
type DemoWorkflow = WorkflowRow & {
    graph_data: any;
};

interface DemoContextType {
    // Demo mode flag
    isDemoUser: boolean;
    setIsDemoUser: (value: boolean) => void;

    // Transient workflow storage
    demoWorkflows: Map<string, DemoWorkflow>;
    listDemoWorkflows: (mode: 'personal' | 'org') => WorkflowRow[];
    getDemoWorkflow: (id: string) => DemoWorkflow | null;
    saveDemoWorkflow: (workflow: DemoWorkflow) => DemoWorkflow;
    deleteDemoWorkflow: (id: string) => void;

    // Reset demo state
    resetDemoState: () => void;
}

const DemoContext = createContext<DemoContextType | null>(null);

// Initialize with default demo workflow
const createInitialWorkflows = (): Map<string, DemoWorkflow> => {
    const map = new Map<string, DemoWorkflow>();
    map.set(defaultDemoWorkflow.id, {
        ...defaultDemoWorkflow,
        graph_data: defaultDemoGraphData,
    });
    return map;
};

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDemoUser, setIsDemoUser] = useState(false);
    const [workflowsMap, setWorkflowsMap] = useState<Map<string, DemoWorkflow>>(createInitialWorkflows);

    // List workflows by mode (personal or org)
    const listDemoWorkflows = useCallback((mode: 'personal' | 'org'): WorkflowRow[] => {
        const workflows = Array.from(workflowsMap.values());
        if (mode === 'personal') {
            return workflows.filter(w => w.org_id === null);
        } else {
            return workflows.filter(w => w.org_id === DEMO_ORG_ID);
        }
    }, [workflowsMap]);

    // Get single workflow
    const getDemoWorkflow = useCallback((id: string): DemoWorkflow | null => {
        return workflowsMap.get(id) || null;
    }, [workflowsMap]);

    // Save workflow (create or update)
    const saveDemoWorkflow = useCallback((workflow: DemoWorkflow): DemoWorkflow => {
        const now = new Date().toISOString();
        const id = workflow.id || `demo-wf-${Date.now()}`;

        const savedWorkflow: DemoWorkflow = {
            ...workflow,
            id,
            created_at: workflow.created_at || now,
            owner_id: DEMO_USER_ID,
        };

        setWorkflowsMap(prev => {
            const next = new Map(prev);
            next.set(id, savedWorkflow);
            return next;
        });

        return savedWorkflow;
    }, []);

    // Delete workflow
    const deleteDemoWorkflow = useCallback((id: string): void => {
        setWorkflowsMap(prev => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    }, []);

    // Reset demo state (called on logout)
    const resetDemoState = useCallback(() => {
        setIsDemoUser(false);
        setWorkflowsMap(createInitialWorkflows());
    }, []);

    const value = useMemo(() => ({
        isDemoUser,
        setIsDemoUser,
        demoWorkflows: workflowsMap,
        listDemoWorkflows,
        getDemoWorkflow,
        saveDemoWorkflow,
        deleteDemoWorkflow,
        resetDemoState,
    }), [
        isDemoUser,
        workflowsMap,
        listDemoWorkflows,
        getDemoWorkflow,
        saveDemoWorkflow,
        deleteDemoWorkflow,
        resetDemoState,
    ]);

    return (
        <DemoContext.Provider value={value}>
            {children}
        </DemoContext.Provider>
    );
};

export const useDemoContext = (): DemoContextType => {
    const context = useContext(DemoContext);
    if (!context) {
        throw new Error('useDemoContext must be used within a DemoProvider');
    }
    return context;
};

// Optional hook that returns null if not in demo context (for use in conditional contexts)
export const useDemoContextOptional = (): DemoContextType | null => {
    return useContext(DemoContext);
};
