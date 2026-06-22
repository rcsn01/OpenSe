import { test as base, expect, type Page, type Route } from '@playwright/test';

const defaultSupabaseUrl = 'http://127.0.0.1:54321';

const ORG_ID = '11110000-0000-4000-8000-00000000e2e0';
const PROJECT_ID = '11110000-0000-4000-8000-00000000e2e1';
const ISSUE_ID = '11110000-0000-4000-8000-00000000e2e2';
const PAGE_ID = '11110000-0000-4000-8000-00000000e2e3';
const STATE_ID = '11110000-0000-4000-8000-00000000e2e4';
const USER_ID = '11110000-0000-4000-8000-00000000e2e5';
const NEW_PROJECT_ID = '11110000-0000-4000-8000-00000000e261';
const NEW_ISSUE_ID = '11110000-0000-4000-8000-00000000e262';

const permissionCodes = [
  'dashboard.view',
  'projects.view',
  'projects.create',
  'projects.edit',
  'projects.delete',
  'projects.members.manage',
  'issues.view',
  'issues.create',
  'issues.edit',
  'issues.delete',
  'planning.view',
  'planning.manage',
  'pages.view',
  'pages.manage',
  'intake.view',
  'intake.manage',
  'analytics.view',
  'settings.view',
  'settings.roles.manage',
  'settings.integrations.manage',
  'automation.manage',
];

const getSupabaseStorageKey = (supabaseUrl: string) => {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${projectRef}-auth-token`;
};

const json = (body: unknown, status = 200, headers?: Record<string, string>) => ({
  status,
  headers: {
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'content-range',
    'content-type': 'application/json',
    ...(headers ?? {}),
  },
  body: JSON.stringify(body),
});

const continuePreflight = async (route: Route) => {
  if (route.request().method() === 'OPTIONS') {
    await route.fulfill(json({}));
    return true;
  }

  return false;
};

const isObjectResponse = (route: Route) =>
  route.request().headers().accept?.includes('application/vnd.pgrst.object+json') ?? false;

const maybeSingle = <T,>(route: Route, rows: T[]) => {
  if (route.request().method() === 'HEAD') {
    return json(null, 200, { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
  }

  return isObjectResponse(route) ? json(rows[0] ?? null) : json(rows);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const doc = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const now = new Date('2026-06-20T00:00:00.000Z').toISOString();

const project = {
  id: PROJECT_ID,
  organisation_id: ORG_ID,
  team_id: null,
  name: 'Open-KB E2E',
  identifier: 'OKBE',
  description_text: 'Mock Open-KB project for route coverage.',
  description_html: '<p>Mock Open-KB project for route coverage.</p>',
  description_json: doc('Mock Open-KB project for route coverage.'),
  status: 'active',
  visibility: 'private',
  sort_order: 0,
  settings: {},
  metadata: {},
  created_by: USER_ID,
  updated_by: null,
  created_at: now,
  updated_at: now,
  deleted_at: null,
};

const state = {
  id: STATE_ID,
  organisation_id: ORG_ID,
  project_id: PROJECT_ID,
  name: 'Todo',
  group_key: 'backlog',
  color: '#64748b',
  sort_order: 0,
  is_default: true,
  metadata: {},
  created_by: USER_ID,
  updated_by: null,
  created_at: now,
  updated_at: now,
  deleted_at: null,
};

const issue = {
  id: ISSUE_ID,
  organisation_id: ORG_ID,
  project_id: PROJECT_ID,
  sequence_id: 1,
  title: 'Mock Open-KB issue',
  description_text: 'Issue used by route coverage.',
  description_html: '<p>Issue used by route coverage.</p>',
  description_json: doc('Issue used by route coverage.'),
  priority: 'medium',
  state_id: STATE_ID,
  issue_type_id: null,
  estimate_point_id: null,
  parent_issue_id: null,
  start_date: null,
  target_date: null,
  completed_at: null,
  archived_at: null,
  metadata: {},
  created_by: USER_ID,
  updated_by: null,
  created_at: now,
  updated_at: now,
  deleted_at: null,
  state,
  project: {
    id: PROJECT_ID,
    name: project.name,
    identifier: project.identifier,
  },
};

const pageRow = {
  id: PAGE_ID,
  organisation_id: ORG_ID,
  project_id: PROJECT_ID,
  title: 'Mock Open-KB page',
  slug: 'mock-open-kb-page',
  content_json: doc('Page used by route coverage.'),
  content_html: '<p>Page used by route coverage.</p>',
  content_text: 'Page used by route coverage.',
  status: 'published',
  metadata: {},
  created_by: USER_ID,
  updated_by: null,
  created_at: now,
  updated_at: now,
  deleted_at: null,
  project: {
    id: PROJECT_ID,
    name: project.name,
    identifier: project.identifier,
  },
};

const defaultProjectTabs = (projectId: string, organisationId = ORG_ID, createdBy = USER_ID) => [
  { tab_key: 'overview', label: 'Overview', sort_order: 10 },
  { tab_key: 'list', label: 'List', sort_order: 20 },
  { tab_key: 'drafts', label: 'Drafts', sort_order: 30 },
  { tab_key: 'cycles', label: 'Cycles', sort_order: 40 },
  { tab_key: 'estimates', label: 'Estimates', sort_order: 60 },
  { tab_key: 'pages', label: 'Pages', sort_order: 70 },
  { tab_key: 'settings', label: 'Settings', sort_order: 80 },
].map(({ tab_key, label, sort_order }) => ({
  id: `11110000-0000-4000-8000-${projectId.slice(-8)}${String(sort_order).padStart(4, '0')}`.slice(0, 36),
  organisation_id: organisationId,
  project_id: projectId,
  tab_key,
  label,
  sort_order,
  metadata: tab_key === 'list' ? { required: true } : {},
  created_by: createdBy,
  updated_by: null,
  created_at: now,
  updated_at: now,
  deleted_at: null,
}));

type MockRow = Record<string, any>;

const buildIssueRelations = (row: MockRow, projects: MockRow[], states: MockRow[]) => ({
  ...row,
  project: projects.find((item) => item.id === row.project_id)
    ? {
        id: row.project_id,
        name: projects.find((item) => item.id === row.project_id)?.name,
        identifier: projects.find((item) => item.id === row.project_id)?.identifier,
      }
    : row.project ?? null,
  state: states.find((item) => item.id === row.state_id) ?? row.state ?? null,
});

const filterRowsForRequest = (route: Route, rows: MockRow[]) => {
  const url = new URL(route.request().url());
  let filtered = rows;

  for (const [key, value] of url.searchParams.entries()) {
    if (['select', 'order', 'limit', 'offset', 'or'].includes(key)) continue;
    if (key.includes('.')) continue;
    if (value.startsWith('eq.')) {
      const expected = value.slice(3);
      filtered = filtered.filter((row) => row[key] === expected);
    } else if (value === 'is.null') {
      filtered = filtered.filter((row) => row[key] === null || row[key] === undefined);
    } else if (value.startsWith('in.(') && value.endsWith(')')) {
      const expected = new Set(value.slice(4, -1).split(','));
      filtered = filtered.filter((row) => expected.has(String(row[key])));
    }
  }

  return filtered;
};

const profile = {
  id: USER_ID,
  email: 'open-kb-e2e@example.com',
  full_name: 'Open-KB E2E User',
  username: 'open-kb-e2e',
  avatar_url: null,
  avatar_storage_path: null,
  recovery_email: null,
  created_at: now,
  updated_at: now,
};

const rowsForTable = (
  table: string,
  store: Record<string, MockRow[]>,
  projects: MockRow[],
  states: MockRow[],
) => {
  switch (table) {
    case 'public_deploy_board':
      return [{
        board_id: '11110000-0000-4000-8000-00000000e2b0',
        organisation_id: ORG_ID,
        project_id: PROJECT_ID,
        slug: 'okb-e2e-board',
        title: 'Open-KB public board',
        description_text: 'Mock public board.',
        status: 'active',
        payload: {},
        project_name: project.name,
        project_identifier: project.identifier,
        project_description_text: project.description_text,
      }];
    case 'public_deploy_board_issues':
      return [{
        issue_id: ISSUE_ID,
        project_id: PROJECT_ID,
        sequence_id: issue.sequence_id,
        title: issue.title,
        description_text: issue.description_text,
        priority: issue.priority,
        state_id: STATE_ID,
        state_name: state.name,
        state_group_key: state.group_key,
        state_color: state.color,
        start_date: null,
        target_date: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      }];
    case 'organisation_members':
      return [
        {
          org_id: ORG_ID,
          user_id: USER_ID,
          role: 'owner',
          organisations: { id: ORG_ID, name: 'Open-KB E2E Org' },
          organisation_member_app_seats: [{ app_code: 'open-kb' }],
        },
      ];
    case 'profiles':
      return [profile];
    case 'my_permissions':
      return permissionCodes.map((code) => ({ organisation_id: ORG_ID, code }));
    case 'projects':
      return projects;
    case 'states':
      return states;
    case 'issues':
      return store.issues.map((row) => buildIssueRelations(row, projects, states));
    case 'pages':
      return store.pages;
    case 'feature_flags':
      return [{
        organisation_id: ORG_ID,
        github_sync_enabled: false,
        slack_sync_enabled: false,
        api_tokens_enabled: true,
        updated_at: now,
        updated_by: USER_ID,
      }];
    case 'app_permissions':
      return permissionCodes.map((code, index) => ({
        code,
        description: `${code} permission`,
        page_key: code.split('.')[0],
        action_key: code.split('.')[1] ?? null,
        label: code,
        sort_order: index,
        hidden: false,
        deprecated: false,
      }));
    case 'roles':
      return [{
        id: '11110000-0000-4000-8000-00000000e2f0',
        organisation_id: ORG_ID,
        name: 'Owner',
        description: 'Owner role',
        role_rank: 1000,
        created_at: now,
        updated_at: now,
        role_permissions: permissionCodes.map((permission_code) => ({ permission_code })),
      }];
    default:
      return store[table] ?? [];
  }
};

export const installOpenKbMockSupabase = async (page: Page) => {
  const supabaseUrl = process.env.SUPABASE_URL || defaultSupabaseUrl;
  const currentUser = {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: profile.email,
    email_confirmed_at: now,
    confirmed_at: now,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: profile.full_name },
    identities: [],
    created_at: now,
    updated_at: now,
  };
  const store: Record<string, MockRow[]> = {
    projects: [clone(project)],
    states: [clone(state)],
    issues: [clone(issue)],
    pages: [clone(pageRow)],
    project_tabs: defaultProjectTabs(PROJECT_ID).map(clone),
    project_messages: [],
    cycles: [],
    modules: [],
    estimates: [],
    estimate_points: [],
    intakes: [],
    draft_issues: [],
    stickies: [],
    notifications: [],
    user_notification_preferences: [],
    user_favorites: [],
    user_recent_visits: [],
    project_members: [],
    labels: [],
    issue_views: [],
    issue_comments: [],
    issue_activities: [],
    issue_attachments: [],
    issue_blockers: [],
    issue_relations: [],
    issue_links: [],
    issue_subscribers: [],
    issue_votes: [],
    issue_reactions: [],
    comment_reactions: [],
    cycle_issues: [],
    module_issues: [],
    intake_issues: [],
    project_deploy_boards: [],
    api_tokens: [],
    webhooks: [],
    webhook_logs: [],
    organisation_integrations: [],
    github_repositories: [],
    github_repository_syncs: [],
    slack_project_syncs: [],
    teams: [],
  };
  const nextIdFor = (table: string) =>
    table === 'projects'
      ? NEW_PROJECT_ID
      : table === 'issues'
        ? NEW_ISSUE_ID
        : `11110000-0000-4000-8000-${table.replace(/[^a-z0-9]/gi, '').slice(0, 8).padEnd(8, '0')}${String((store[table]?.length ?? 0) + 1).padStart(4, '0')}`.slice(0, 36);
  const createRow = (table: string, payload: MockRow) => {
    const created = {
      ...payload,
      id: payload.id ?? nextIdFor(table),
      created_by: payload.created_by ?? USER_ID,
      updated_by: payload.updated_by ?? null,
      created_at: payload.created_at ?? now,
      updated_at: payload.updated_at ?? now,
      deleted_at: payload.deleted_at ?? null,
    };

    if (table === 'projects') {
      created.status = created.status ?? 'active';
      created.visibility = created.visibility ?? 'private';
      created.sort_order = created.sort_order ?? store.projects.length;
      created.settings = created.settings ?? {};
      created.metadata = created.metadata ?? {};
      created.team = null;
      store.project_tabs = [
        ...(store.project_tabs ?? []),
        ...defaultProjectTabs(created.id, created.organisation_id, created.created_by),
      ];
    }

    if (table === 'issues') {
      created.sequence_id = created.sequence_id ?? store.issues.length + 1;
      created.priority = created.priority ?? 'none';
      created.state_id = created.state_id ?? STATE_ID;
      created.issue_type_id = created.issue_type_id ?? null;
      created.estimate_point_id = created.estimate_point_id ?? null;
      created.parent_issue_id = created.parent_issue_id ?? null;
      created.start_date = created.start_date ?? null;
      created.target_date = created.target_date ?? null;
      created.completed_at = created.completed_at ?? null;
      created.archived_at = created.archived_at ?? null;
      created.metadata = created.metadata ?? {};
    }

    if (table === 'issue_activities') {
      created.actor_profile_id = created.actor_profile_id ?? USER_ID;
      created.actor_profile = profile;
    }

    if (table === 'issue_comments') {
      created.profile_id = created.profile_id ?? USER_ID;
      created.actor_profile_id = created.actor_profile_id ?? USER_ID;
    }

    store[table] = store[table] ?? [];
    store[table].push(created);
    return created;
  };
  const updateRows = (route: Route, table: string, payload: MockRow) => {
    const currentRows = store[table] ?? [];
    const matchingIds = new Set(filterRowsForRequest(route, currentRows).map((row) => row.id));
    store[table] = currentRows.map((row) =>
      matchingIds.has(row.id)
        ? {
            ...row,
            ...payload,
            updated_at: now,
          }
        : row,
    );
    return store[table].filter((row) => matchingIds.has(row.id));
  };
  const session = {
    access_token: 'open-kb-e2e-access-token',
    refresh_token: 'open-kb-e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: currentUser,
  };
  const serializedSession = JSON.stringify(session);
  const storageKey = getSupabaseStorageKey(supabaseUrl);

  await page.context().clearCookies();

  await page.addInitScript(
    ({ storageKey, serializedSession, organisationId }) => {
      window.localStorage.setItem(storageKey, serializedSession);
      document.cookie = `${storageKey}=${encodeURIComponent(serializedSession)}; Path=/; Max-Age=31536000; SameSite=Lax`;
      window.localStorage.setItem('open_kb_selected_organisation', organisationId);
    },
    {
      storageKey,
      serializedSession,
      organisationId: ORG_ID,
    },
  );

  await page.route('**/auth/v1/user**', async (route) => {
    if (await continuePreflight(route)) return;
    await route.fulfill(json({ ...currentUser, user: currentUser }));
  });

  await page.route('**/rest/v1/rpc/public_deploy_board_issues**', async (route) => {
    if (await continuePreflight(route)) return;
    await route.fulfill(json([{
      issue_id: ISSUE_ID,
      project_id: PROJECT_ID,
      sequence_id: issue.sequence_id,
      title: issue.title,
      description_text: issue.description_text,
      priority: issue.priority,
      state_id: STATE_ID,
      state_name: state.name,
      state_group_key: state.group_key,
      state_color: state.color,
      start_date: null,
      target_date: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    }]));
  });

  await page.route('**/rest/v1/rpc/public_deploy_board**', async (route) => {
    if (await continuePreflight(route)) return;
    await route.fulfill(json([{
      board_id: '11110000-0000-4000-8000-00000000e2b0',
      organisation_id: ORG_ID,
      project_id: PROJECT_ID,
      slug: 'okb-e2e-board',
      title: 'Open-KB public board',
      description_text: 'Mock public board.',
      status: 'active',
      payload: {},
      project_name: project.name,
      project_identifier: project.identifier,
      project_description_text: project.description_text,
    }]));
  });

  await page.route('**/rest/v1/**', async (route) => {
    if (await continuePreflight(route)) return;

    const url = new URL(route.request().url());
    const table = url.pathname.split('/').filter(Boolean).pop() ?? '';
    const method = route.request().method();
    if (url.pathname.includes('/rest/v1/rpc/')) {
      await route.fulfill(json(rowsForTable(table, store, store.projects, store.states)));
      return;
    }

    if (method === 'POST') {
      const posted = JSON.parse(route.request().postData() || '{}');
      const payloads = Array.isArray(posted) ? posted : [posted];
      const rows = payloads.map((payload) => createRow(table, payload));
      await route.fulfill(maybeSingle(route, rows.map((row) => table === 'issues' ? buildIssueRelations(row, store.projects, store.states) : row)));
      return;
    }

    if (method === 'PATCH') {
      const payload = JSON.parse(route.request().postData() || '{}');
      const rows = updateRows(route, table, payload);
      await route.fulfill(maybeSingle(route, rows.map((row) => table === 'issues' ? buildIssueRelations(row, store.projects, store.states) : row)));
      return;
    }

    if (method === 'DELETE') {
      const matchingIds = new Set(filterRowsForRequest(route, store[table] ?? []).map((row) => row.id));
      store[table] = (store[table] ?? []).filter((row) => !matchingIds.has(row.id));
      await route.fulfill(json([]));
      return;
    }

    const tableRows = rowsForTable(table, store, store.projects, store.states);
    await route.fulfill(maybeSingle(route, filterRowsForRequest(route, tableRows)));
  });

  await page.route('**/storage/v1/**', async (route) => {
    if (await continuePreflight(route)) return;
    await route.fulfill(json({ signedURL: 'https://example.test/open-kb-asset' }));
  });
};

type OpenKbFixtures = {
  openKbPage: Page;
};

export const test = base.extend<OpenKbFixtures>({
  openKbPage: async ({ page }, use) => {
    await installOpenKbMockSupabase(page);
    await use(page);
  },
});

export { expect, PROJECT_ID, ISSUE_ID, PAGE_ID, NEW_PROJECT_ID, NEW_ISSUE_ID };
