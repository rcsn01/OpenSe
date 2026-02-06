import { WorkflowRow } from '../components/dashboard/types';
import { OrgSimple, OrgMember } from '../types/organisation';

// Demo user constants
export const DEMO_USER_ID = 'demo-user';
export const DEMO_USER_EMAIL = 'demo@example.com';
export const DEMO_USER_NAME = 'Demo User';
export const DEMO_ORG_ID = 'demo-org';

// Mock Organisation
export const mockOrganisation: OrgSimple = {
    id: DEMO_ORG_ID,
    name: 'Demo Corp',
    owner_id: DEMO_USER_ID,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    tier: 'tier-2',
    seat_limit: 10,
    subscription_status: 'active',
};

// Mock Organisation Members
export const mockOrgMembers: OrgMember[] = [
    { user_id: DEMO_USER_ID, email: DEMO_USER_EMAIL, full_name: DEMO_USER_NAME, role: 'admin', avatar_url: null },
    { user_id: 'member-1', email: 'sarah.chen@democorp.com', full_name: 'Sarah Chen', role: 'admin', avatar_url: null },
    { user_id: 'member-2', email: 'james.wilson@democorp.com', full_name: 'James Wilson', role: 'editor', avatar_url: null },
    { user_id: 'member-3', email: 'emma.rodriguez@democorp.com', full_name: 'Emma Rodriguez', role: 'editor', avatar_url: null },
    { user_id: 'member-4', email: 'michael.johnson@democorp.com', full_name: 'Michael Johnson', role: 'member', avatar_url: null },
    { user_id: 'member-5', email: 'lisa.wang@democorp.com', full_name: 'Lisa Wang', role: 'member', avatar_url: null },
    { user_id: 'member-6', email: 'david.kim@democorp.com', full_name: 'David Kim', role: 'member', avatar_url: null },
    { user_id: 'member-7', email: 'jen.taylor@democorp.com', full_name: 'Jennifer Taylor', role: 'member', avatar_url: null },
];

// Helper to generate timestamps within the past N days
const daysAgo = (days: number, hours = 0) =>
    new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000).toISOString();

// Mock Execution Logs
export type MockExecutionLog = {
    id: string;
    workflow_id: string;
    workflow_name: string;
    user_id: string;
    org_id: string | null;
    status: 'success' | 'failed' | 'running';
    started_at: string;
    finished_at: string | null;
    error_message: string | null;
};

export const mockExecutionLogs: MockExecutionLog[] = [
    { id: 'log-1', workflow_id: 'wf-1', workflow_name: 'Daily Sales Report', user_id: DEMO_USER_ID, org_id: DEMO_ORG_ID, status: 'success', started_at: daysAgo(0, 2), finished_at: daysAgo(0, 1.9), error_message: null },
    { id: 'log-2', workflow_id: 'wf-2', workflow_name: 'Customer Sync', user_id: 'member-2', org_id: DEMO_ORG_ID, status: 'running', started_at: daysAgo(0, 0.5), finished_at: null, error_message: null },
    { id: 'log-3', workflow_id: 'wf-1', workflow_name: 'Daily Sales Report', user_id: DEMO_USER_ID, org_id: DEMO_ORG_ID, status: 'failed', started_at: daysAgo(1, 3), finished_at: daysAgo(1, 2.95), error_message: 'Connection timeout to external API' },
    { id: 'log-4', workflow_id: 'wf-3', workflow_name: 'Inventory Check', user_id: 'member-3', org_id: DEMO_ORG_ID, status: 'success', started_at: daysAgo(1, 8), finished_at: daysAgo(1, 7.8), error_message: null },
    { id: 'log-5', workflow_id: 'wf-2', workflow_name: 'Customer Sync', user_id: 'member-2', org_id: DEMO_ORG_ID, status: 'success', started_at: daysAgo(1, 12), finished_at: daysAgo(1, 11.9), error_message: null },
    { id: 'log-6', workflow_id: 'wf-4', workflow_name: 'Weekly Backup', user_id: DEMO_USER_ID, org_id: null, status: 'success', started_at: daysAgo(2, 6), finished_at: daysAgo(2, 5.5), error_message: null },
    { id: 'log-7', workflow_id: 'wf-1', workflow_name: 'Daily Sales Report', user_id: DEMO_USER_ID, org_id: DEMO_ORG_ID, status: 'success', started_at: daysAgo(2, 2), finished_at: daysAgo(2, 1.9), error_message: null },
    { id: 'log-8', workflow_id: 'wf-5', workflow_name: 'Email Campaign', user_id: 'member-4', org_id: DEMO_ORG_ID, status: 'failed', started_at: daysAgo(2, 14), finished_at: daysAgo(2, 14), error_message: 'Invalid email template format' },
    { id: 'log-9', workflow_id: 'wf-3', workflow_name: 'Inventory Check', user_id: 'member-3', org_id: DEMO_ORG_ID, status: 'success', started_at: daysAgo(3, 8), finished_at: daysAgo(3, 7.7), error_message: null },
    { id: 'log-10', workflow_id: 'wf-1', workflow_name: 'Daily Sales Report', user_id: DEMO_USER_ID, org_id: DEMO_ORG_ID, status: 'success', started_at: daysAgo(3, 2), finished_at: daysAgo(3, 1.9), error_message: null },
    { id: 'log-11', workflow_id: 'wf-2', workflow_name: 'Customer Sync', user_id: 'member-2', org_id: DEMO_ORG_ID, status: 'success', started_at: daysAgo(3, 12), finished_at: daysAgo(3, 11.85), error_message: null },
    { id: 'log-12', workflow_id: 'wf-6', workflow_name: 'Data Transform', user_id: DEMO_USER_ID, org_id: null, status: 'running', started_at: daysAgo(0, 0.1), finished_at: null, error_message: null },
    { id: 'log-13', workflow_id: 'wf-1', workflow_name: 'Daily Sales Report', user_id: DEMO_USER_ID, org_id: DEMO_ORG_ID, status: 'success', started_at: daysAgo(4, 2), finished_at: daysAgo(4, 1.9), error_message: null },
    { id: 'log-14', workflow_id: 'wf-5', workflow_name: 'Email Campaign', user_id: 'member-4', org_id: DEMO_ORG_ID, status: 'success', started_at: daysAgo(4, 10), finished_at: daysAgo(4, 9.8), error_message: null },
    { id: 'log-15', workflow_id: 'wf-3', workflow_name: 'Inventory Check', user_id: 'member-3', org_id: DEMO_ORG_ID, status: 'failed', started_at: daysAgo(5, 8), finished_at: daysAgo(5, 8), error_message: 'Database connection refused' },
    { id: 'log-16', workflow_id: 'wf-1', workflow_name: 'Daily Sales Report', user_id: DEMO_USER_ID, org_id: DEMO_ORG_ID, status: 'success', started_at: daysAgo(5, 2), finished_at: daysAgo(5, 1.9), error_message: null },
    { id: 'log-17', workflow_id: 'wf-2', workflow_name: 'Customer Sync', user_id: 'member-2', org_id: DEMO_ORG_ID, status: 'success', started_at: daysAgo(5, 12), finished_at: daysAgo(5, 11.9), error_message: null },
    { id: 'log-18', workflow_id: 'wf-4', workflow_name: 'Weekly Backup', user_id: DEMO_USER_ID, org_id: null, status: 'success', started_at: daysAgo(6, 6), finished_at: daysAgo(6, 5.4), error_message: null },
    { id: 'log-19', workflow_id: 'wf-1', workflow_name: 'Daily Sales Report', user_id: DEMO_USER_ID, org_id: DEMO_ORG_ID, status: 'failed', started_at: daysAgo(6, 2), finished_at: daysAgo(6, 2), error_message: 'Rate limit exceeded' },
    { id: 'log-20', workflow_id: 'wf-3', workflow_name: 'Inventory Check', user_id: 'member-3', org_id: DEMO_ORG_ID, status: 'success', started_at: daysAgo(6, 8), finished_at: daysAgo(6, 7.8), error_message: null },
];

// Default demo workflow template
export const defaultDemoWorkflow: WorkflowRow = {
    id: 'demo-workflow-1',
    name: 'Hello World Pipeline',
    created_at: daysAgo(7),
    owner_id: DEMO_USER_ID,
    org_id: null,
    owner: { full_name: DEMO_USER_NAME, email: DEMO_USER_EMAIL },
};

// Default graph data for the demo workflow
export const defaultDemoGraphData = {
    nodes: [
        {
            id: 'source-1',
            type: 'source',
            position: { x: 100, y: 200 },
            data: { label: 'CSV Input', sourceType: 'csv' },
        },
        {
            id: 'transform-1',
            type: 'transform',
            position: { x: 350, y: 200 },
            data: { label: 'Filter Rows', transformType: 'filter' },
        },
        {
            id: 'destination-1',
            type: 'destination',
            position: { x: 600, y: 200 },
            data: { label: 'JSON Output', destinationType: 'json' },
        },
    ],
    edges: [
        { id: 'e1', source: 'source-1', target: 'transform-1', animated: true },
        { id: 'e2', source: 'transform-1', target: 'destination-1', animated: true },
    ],
};
