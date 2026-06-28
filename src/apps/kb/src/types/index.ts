export type OrganisationOption = {
  id: string
  name: string
}

export type OpenKbTeam = {
  id: string
  organisation_id: string
  name: string
  slug: string
  description_text: string | null
  status: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type OpenKbTeamInput = {
  organisation_id: string
  name: string
  slug?: string | null
  description_text?: string | null
}

export type OpenKbTeamUpdateInput = Partial<Pick<OpenKbTeamInput, 'name' | 'slug' | 'description_text'>> &
  Partial<Pick<OpenKbTeam, 'status'>> & {
    id: string
    organisation_id: string
  }

export type Project = {
  id: string
  organisation_id: string
  team_id: string | null
  name: string
  identifier: string
  description_text: string | null
  status: 'active' | 'archived'
  visibility: 'private' | 'public'
  sort_order: number
  created_at: string
  updated_at: string | null
  team?: Pick<OpenKbTeam, 'id' | 'name' | 'slug' | 'description_text' | 'status'> | null
}

export type ProjectInput = {
  organisation_id: string
  team_id?: string | null
  name: string
  identifier: string
  description_text?: string | null
}

export type ProjectUpdateInput = Partial<Pick<ProjectInput, 'name' | 'description_text' | 'team_id'>> &
  Partial<Pick<Project, 'status' | 'visibility'>> & {
    id: string
    organisation_id: string
  }

export type ProjectSummary = {
  project_count: number
  issue_count: number
  cycle_count: number
  module_count: number
}

export type ProjectTab = {
  id: string
  organisation_id: string
  project_id: string
  tab_key: string
  label: string
  sort_order: number
  metadata: Record<string, unknown>
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type ProjectTabInput = {
  organisation_id: string
  project_id: string
  tab_key: string
  label: string
  sort_order?: number
  metadata?: Record<string, unknown>
}

export type ProjectTabUpdateInput = {
  id: string
  organisation_id: string
  project_id: string
  label?: string
  sort_order?: number
  metadata?: Record<string, unknown>
  deleted_at?: string | null
}

export type ProjectDeployBoard = {
  id: string
  organisation_id: string
  project_id: string
  name: string | null
  slug: string
  title: string | null
  description_text: string | null
  status: 'active' | 'paused' | 'archived' | string | null
  payload: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type ProjectMessage = {
  id: string
  organisation_id: string
  project_id: string
  profile_id: string | null
  description_json: EditorDocument
  description_html: string | null
  description_text: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  profile?: OpenKbProfile | null
}

export type ProjectMessageInput = {
  organisation_id: string
  project_id: string
  description_json: EditorDocument
  description_html?: string | null
  description_text?: string | null
}

export type ProjectDeployBoardInput = {
  organisation_id: string
  project_id: string
  slug: string
  title?: string | null
  description_text?: string | null
  status?: string | null
}

export type ProjectDeployBoardUpdateInput = Partial<Omit<ProjectDeployBoardInput, 'organisation_id' | 'project_id'>> & {
  id: string
  organisation_id: string
  project_id: string
}

export type PublicDeployBoard = {
  board_id: string
  organisation_id: string
  project_id: string
  slug: string
  title: string
  description_text: string | null
  status: string | null
  payload: Record<string, unknown>
  project_name: string
  project_identifier: string
  project_description_text: string | null
}

export type PublicDeployBoardIssue = {
  issue_id: string
  project_id: string
  sequence_id: number | null
  title: string
  description_text: string | null
  priority: IssuePriority
  state_id: string | null
  state_name: string | null
  state_group_key: string | null
  state_color: string | null
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string | null
}

export type EditorDocument = {
  type?: string
  attrs?: Record<string, unknown>
  content?: EditorDocument[]
  marks?: Array<{
    type: string
    attrs?: Record<string, unknown>
  }>
  text?: string
  [key: string]: unknown
}

export type IssuePriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

export type IssueState = {
  id: string
  organisation_id: string
  project_id: string | null
  name: string
  group_key: string
  color: string
  sort_order: number
  is_default: boolean
}

export type IssueStateInput = {
  organisation_id: string
  project_id: string
  name: string
  group_key: string
  color: string
}

export type IssueLabel = {
  id: string
  organisation_id: string
  project_id: string | null
  name: string
  color: string
  parent_id: string | null
}

export type IssueLabelInput = {
  organisation_id: string
  project_id?: string | null
  name: string
  color: string
}

export type OpenKbProfile = {
  id: string
  email: string | null
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

export type OrganisationMemberProfile = {
  profile_id: string
  role: string
  profile: OpenKbProfile
}

export type ProjectMemberRole = 'lead' | 'admin' | 'member' | 'viewer'

export type ProjectMember = {
  id: string
  organisation_id: string
  project_id: string
  profile_id: string
  role: ProjectMemberRole
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  profile: OpenKbProfile | null
}

export type ProjectMemberInput = {
  organisation_id: string
  project_id: string
  profile_id: string
  role: ProjectMemberRole
}

export type IssueLabelLink = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  label_id: string | null
  label: IssueLabel | null
}

export type IssueAssignee = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  profile_id: string | null
  profile: OpenKbProfile | null
}

export type IssueProject = Pick<Project, 'id' | 'name' | 'identifier'>

export type Issue = {
  id: string
  organisation_id: string
  project_id: string
  sequence_id: number | null
  title: string
  description_json: EditorDocument
  description_html: string | null
  description_text: string | null
  priority: IssuePriority
  state_id: string | null
  estimate_point_id: string | null
  parent_issue_id: string | null
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  archived_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  project?: IssueProject | null
  state?: IssueState | null
}

export type IssueInput = {
  organisation_id: string
  project_id: string
  title: string
  description_json?: EditorDocument | null
  description_html?: string | null
  description_text?: string | null
  priority: IssuePriority
  state_id?: string | null
  estimate_point_id?: string | null
  start_date?: string | null
  target_date?: string | null
}

export type DraftIssuePayload = {
  priority?: IssuePriority
  state_id?: string | null
  estimate_point_id?: string | null
  start_date?: string | null
  target_date?: string | null
}

export type DraftIssue = {
  id: string
  organisation_id: string
  project_id: string
  profile_id: string | null
  title: string | null
  description_json: EditorDocument
  description_html: string | null
  description_text: string | null
  status: 'draft' | 'deleted' | 'published' | string | null
  payload: DraftIssuePayload
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  project?: IssueProject | null
}

export type DraftIssueInput = {
  organisation_id: string
  project_id: string
  profile_id: string
  title: string
  description_json?: EditorDocument | null
  description_html?: string | null
  description_text?: string | null
  payload?: DraftIssuePayload
}

export type DraftIssueUpdateInput = Partial<Omit<DraftIssueInput, 'profile_id'>> & {
  id: string
  organisation_id: string
}

export type IssueFilters = {
  project_id?: string | null
  state_id?: string | null
  priority?: IssuePriority | null
  assignee_id?: string | null
  label_id?: string | null
  cycle_id?: string | null
  module_id?: string | null
  target?: 'overdue' | 'due_soon' | 'no_target' | null
  query?: string | null
}

export type IssueViewLayout = 'list' | 'board' | 'table' | 'calendar' | 'gantt'

export type IssueUpdateInput = Partial<
  Pick<IssueInput, 'title' | 'description_json' | 'description_html' | 'description_text' | 'priority' | 'state_id' | 'estimate_point_id' | 'start_date' | 'target_date'>
> & {
  id: string
  organisation_id: string
}

export type IssueComment = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  profile_id: string | null
  actor_profile_id: string | null
  description_json: EditorDocument
  description_html: string | null
  description_text: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
}

export type IssueCommentInput = {
  organisation_id: string
  project_id: string
  issue_id: string
  description_json: EditorDocument
  description_html?: string | null
  description_text?: string | null
}

export type IssueAttachmentMetadata = {
  storage_path: string
  bucket: string
  file_name: string
  mime_type: string | null
  size: number
}

export type IssueAttachment = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  name: string | null
  title: string | null
  description_text: string | null
  status: string | null
  metadata: IssueAttachmentMetadata
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  signed_url?: string | null
}

export type IssueAttachmentInput = {
  organisation_id: string
  project_id: string
  issue_id: string
  file: File
}

export type IssueBlocker = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  blocker_issue_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  blocker_issue: Issue | null
}

export type IssueRelationType = 'related' | 'duplicate' | 'blocked_by' | 'blocks'

export type IssueRelation = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  related_issue_id: string | null
  relation_type: IssueRelationType
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  related_issue: Issue | null
}

export type IssueLinkType = 'external' | 'repository' | 'document' | 'support'

export type IssueExternalLink = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  title: string | null
  url: string | null
  link_type: IssueLinkType
  description_text: string | null
  status: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type IssueSubscriber = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  profile_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  profile: OpenKbProfile | null
}

export type IssueMention = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  profile_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  profile: OpenKbProfile | null
}

export type IssueVote = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  profile_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type IssueReaction = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  profile_id: string | null
  name: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type CommentReaction = IssueReaction & {
  comment_id: string | null
}

export type IssueActivity = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  actor_profile_id: string | null
  created_by: string | null
  name: string | null
  title: string | null
  description_text: string | null
  status: string | null
  payload: {
    event?: string
    entity?: string
    entity_id?: string | null
    previous?: unknown
    current?: unknown
  }
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  actor_profile: OpenKbProfile | null
}

export type OpenKbNotification = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  profile_id: string | null
  actor_profile_id: string | null
  name: string | null
  title: string | null
  description_text: string | null
  status: 'unread' | 'read' | string | null
  payload: {
    issue_id?: string
    project_id?: string
    activity_id?: string
    event?: string
    entity?: string
    entity_id?: string | null
  }
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type OpenKbNotificationPreferencePayload = {
  issue_notifications_enabled?: boolean
}

export type OpenKbNotificationPreference = {
  id: string
  organisation_id: string
  profile_id: string | null
  name: string | null
  status: string | null
  payload: OpenKbNotificationPreferencePayload
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type OpenKbVisitKind = 'project' | 'issue'

export type OpenKbPersonalItemPayload = {
  route?: string
  identifier?: string | null
  description?: string | null
}

export type OpenKbPersonalItem = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  profile_id: string | null
  name: OpenKbVisitKind
  title: string | null
  description_text: string | null
  status: string | null
  payload: OpenKbPersonalItemPayload
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type SavedIssueView = {
  id: string
  organisation_id: string
  project_id: string | null
  name: string | null
  title: string | null
  status: string | null
  payload: {
    filters?: IssueFilters
    view?: IssueViewLayout
  }
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type SavedIssueViewInput = {
  organisation_id: string
  project_id?: string | null
  name: string
  filters: IssueFilters
  view: IssueViewLayout
}

export type CycleStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export type Cycle = {
  id: string
  organisation_id: string
  project_id: string
  name: string
  description_text: string | null
  starts_at: string | null
  ends_at: string | null
  status: CycleStatus
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  project?: IssueProject | null
}

export type CycleInput = {
  organisation_id: string
  project_id: string
  name: string
  description_text?: string | null
  starts_at?: string | null
  ends_at?: string | null
  status: CycleStatus
}

export type CycleIssueLink = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  cycle_id: string | null
  cycle: Cycle | null
}

export type ModuleStatus = 'backlog' | 'planned' | 'in_progress' | 'completed' | 'cancelled'

export type ProjectModule = {
  id: string
  organisation_id: string
  project_id: string
  name: string
  description_text: string | null
  lead_profile_id: string | null
  status: ModuleStatus
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  project?: IssueProject | null
}

export type ModuleInput = {
  organisation_id: string
  project_id: string
  name: string
  description_text?: string | null
  status: ModuleStatus
}

export type ModuleIssueLink = {
  id: string
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  module_id: string | null
  module: ProjectModule | null
}

export type Estimate = {
  id: string
  organisation_id: string
  project_id: string
  name: string
  description_text: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  project?: IssueProject | null
}

export type EstimatePoint = {
  id: string
  organisation_id: string
  project_id: string | null
  estimate_id: string | null
  name: string | null
  value: number
  sort_order: number
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  estimate?: Estimate | null
}

export type IntakeStatus = 'open' | 'closed' | 'paused'

export type IntakeIssueStatus = 'submitted' | 'accepted' | 'declined' | 'snoozed'

export type Intake = {
  id: string
  organisation_id: string
  project_id: string | null
  name: string | null
  title: string | null
  description_text: string | null
  status: IntakeStatus | string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  project?: IssueProject | null
}

export type IntakeIssue = {
  id: string
  organisation_id: string
  project_id: string | null
  intake_id: string | null
  issue_id: string | null
  name: string | null
  title: string | null
  description_text: string | null
  status: IntakeIssueStatus | string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  intake?: Intake | null
  issue?: Issue | null
}

export type IntakeInput = {
  organisation_id: string
  project_id: string
  title: string
  description_text?: string | null
  status: IntakeStatus
}

export type IntakeIssueInput = {
  organisation_id: string
  project_id: string
  intake_id: string
  title: string
  description_text?: string | null
}

export type AnalyticsBreakdownItem = {
  id: string
  label: string
  value: number
  color?: string
}

export type AnalyticsTrendPoint = {
  date: string
  issues: number
  completed?: number
}

export type OpenKbAnalyticsSummary = {
  total_projects: number
  total_issues: number
  open_issues: number
  completed_issues: number
  total_cycles: number
  total_modules: number
  total_intake_requests: number
  overdue_issues: number
  due_soon_issues: number
  average_completion_days: number | null
  issues_by_priority: AnalyticsBreakdownItem[]
  issues_by_state: AnalyticsBreakdownItem[]
  issues_by_project: AnalyticsBreakdownItem[]
  issues_by_due_bucket: AnalyticsBreakdownItem[]
  issue_creation_trend: AnalyticsTrendPoint[]
  issue_completion_trend: AnalyticsTrendPoint[]
}

export type FeatureFlags = {
  organisation_id: string
  github_sync_enabled: boolean
  slack_sync_enabled: boolean
  api_tokens_enabled: boolean
  updated_at: string
  updated_by: string | null
}

export type FeatureFlagUpdateInput = {
  organisation_id: string
  github_sync_enabled?: boolean
  slack_sync_enabled?: boolean
  api_tokens_enabled?: boolean
}

export type OpenKbApiToken = {
  id: string
  organisation_id: string
  profile_id: string
  name: string
  scopes: string[]
  expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string | null
}

export type OpenKbApiTokenInput = {
  organisation_id: string
  profile_id: string
  name: string
  token_hash: string
  scopes: string[]
  expires_at?: string | null
}

export type OpenKbWebhookStatus = 'active' | 'paused' | 'disabled'

export type OpenKbWebhook = {
  id: string
  organisation_id: string
  name: string
  url: string
  events: string[]
  status: OpenKbWebhookStatus
  description_text: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type OpenKbWebhookInput = {
  organisation_id: string
  name: string
  url: string
  events: string[]
  status?: OpenKbWebhookStatus
  description_text?: string | null
  secret_hash?: string | null
}

export type OpenKbWebhookUpdateInput = Partial<Omit<OpenKbWebhookInput, 'organisation_id'>> & {
  id: string
  organisation_id: string
}

export type OpenKbWebhookLog = {
  id: string
  organisation_id: string
  project_id: string | null
  webhook_id: string | null
  name: string | null
  title: string | null
  status: string | null
  external_id: string | null
  http_status: number | null
  attempt_count: number
  delivered_at: string | null
  next_retry_at: string | null
  payload: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  webhook?: Pick<OpenKbWebhook, 'id' | 'name' | 'url' | 'status'> | null
}

export type OpenKbOrganisationIntegration = {
  id: string
  organisation_id: string
  integration_id: string | null
  provider: 'github' | 'slack'
  name: string | null
  status: string | null
  external_account_id: string | null
  scopes: string[]
  expires_at: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type OpenKbGitHubRepository = {
  id: string
  organisation_id: string
  project_id: string | null
  organisation_integration_id: string | null
  repository_owner: string
  repository_name: string
  installation_id: string | null
  default_branch: string | null
  status: string | null
  payload: Record<string, unknown>
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type OpenKbGitHubRepositoryInput = {
  organisation_id: string
  project_id?: string | null
  repository_owner: string
  repository_name: string
  installation_id?: string | null
  default_branch?: string | null
}

export type OpenKbGitHubRepositorySync = {
  id: string
  organisation_id: string
  project_id: string | null
  github_repository_id: string | null
  sync_type: string | null
  name: string | null
  title: string | null
  status: string | null
  external_id: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type OpenKbOutboundProviderSync = {
  id: string
  provider: 'github' | 'slack'
  organisation_id: string
  project_id: string | null
  issue_id: string | null
  comment_id: string | null
  title: string | null
  status: string | null
  external_id: string | null
  attempt_count: number
  next_retry_at: string | null
  processed_at: string | null
  last_error_text: string | null
  target: string | null
  payload: Record<string, unknown>
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type OpenKbProviderSyncRetryInput = {
  organisationId: string
  provider: 'github' | 'slack'
  syncId: string
}

export type OpenKbProviderDisconnectInput = {
  organisationId: string
  provider: 'github' | 'slack'
}

export type OpenKbSlackProjectSync = {
  id: string
  organisation_id: string
  project_id: string
  organisation_integration_id: string | null
  issue_id?: string | null
  comment_id?: string | null
  channel_id: string
  channel_name: string | null
  status: string | null
  external_id: string | null
  sync_direction?: 'inbound' | 'outbound'
  attempt_count?: number
  next_retry_at?: string | null
  processed_at?: string | null
  last_error_text?: string | null
  payload: Record<string, unknown>
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type OpenKbSlackProjectSyncInput = {
  organisation_id: string
  project_id: string
  channel_id: string
  channel_name?: string | null
}

export type AppPermission = {
  code: string
  description: string | null
  page_key: string | null
  action_key: string | null
  label: string | null
  sort_order: number
  hidden: boolean
  deprecated: boolean
}

export type OpenKbRole = {
  id: string
  organisation_id: string
  name: string
  description: string | null
  role_rank: number
  created_at: string
  updated_at: string | null
  permission_codes: string[]
}

export type RolePermissionInput = {
  organisation_id: string
  role_id: string
  permission_code: string
  enabled: boolean
}
