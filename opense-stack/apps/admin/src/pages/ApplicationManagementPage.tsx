import { useMemo, useState } from 'react'
import {
  BasePage,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  TabBar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import { useEffect } from 'react'
import {
  listDefaultConfigurations,
  listFeatureFlags,
  listReleaseNotes,
  updateFeatureFlag,
  upsertDefaultConfiguration,
} from '../api/adminPlatform'
import {
  addWorkflowToGallery,
  listAllWorkflowsForAdmin,
  listGalleryTemplates,
  removeWorkflowFromGallery,
} from '../api/etlAdmin'
import { getErrorMessage } from '../lib/errors'
import { formatAppCode } from '../lib/appCodes'
import type { AppSettingsTabId } from '../types/admin-tabs'

type FeatureFlag = {
  id: string
  key: string
  status: 'enabled' | 'disabled' | 'beta'
  audience: string
}

type ReleaseNote = {
  id: string
  version: string
  app: 'ETL' | 'StoQR'
  published_at: string
  summary: string
}

const settingsTabs: Array<{ id: AppSettingsTabId; label: string }> = [
  { id: 'etl', label: 'ETL Settings' },
  { id: 'stoqr', label: 'StoQR Settings' },
  { id: 'shared', label: 'Suite / Shared' },
]

const statusOptions = [
  { value: 'enabled', label: 'Enabled' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'beta', label: 'Beta Rollout' },
]

export const ApplicationManagementPage = () => {
  const [activeTab, setActiveTab] = useState<AppSettingsTabId>('etl')
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([])
  const [defaultRetentionDays, setDefaultRetentionDays] = useState('365')
  const [defaultSsoProvider, setDefaultSsoProvider] = useState('google-workspace')
  const [savingDefaults, setSavingDefaults] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [etlConfigLoading, setEtlConfigLoading] = useState(false)
  const [workflowSearch, setWorkflowSearch] = useState('')
  const [selectedWorkflowToAdd, setSelectedWorkflowToAdd] = useState('')
  const [galleryWorkflows, setGalleryWorkflows] = useState<Array<{ id: string; name: string; description: string | null; node_count: number; created_at: string | null }>>([])
  const [nonTemplateWorkflows, setNonTemplateWorkflows] = useState<Array<{ id: string; name: string }>>([])

  const filteredReleaseNotes = useMemo(
    () => releaseNotes.filter((entry) => (activeTab === 'etl' ? entry.app === 'ETL' : activeTab === 'stoqr' ? entry.app === 'StoQR' : true)),
    [activeTab, releaseNotes],
  )

  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(() => setMessage(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [message])

  useEffect(() => {
    const load = async () => {
      try {
        const targetAppCode = activeTab === 'shared' ? null : activeTab
        const [flagRows, defaultRows, noteRows] = await Promise.all([
          listFeatureFlags(targetAppCode),
          listDefaultConfigurations(activeTab === 'shared' ? null : targetAppCode),
          listReleaseNotes(targetAppCode),
        ])

        if (flagRows.length > 0) {
          setFlags(
            flagRows.map((row) => ({
              id: row.id,
              key: row.flag_key,
              status: row.rollout_status,
              audience: row.audience,
            })),
          )
        }

        if (noteRows.length > 0) {
          setReleaseNotes(
            noteRows.map((row) => ({
              id: row.id,
              version: row.version,
              app: formatAppCode(row.app_code),
              published_at: row.published_at,
              summary: row.summary,
            })),
          )
        }

        const retention = defaultRows.find((row) => row.config_key === 'default_data_retention_days')
        const sso = defaultRows.find((row) => row.config_key === 'default_sso_provider')
        if (retention) setDefaultRetentionDays(retention.config_value)
        if (sso) setDefaultSsoProvider(sso.config_value)
      } catch (loadError: unknown) {
        setError(getErrorMessage(loadError, 'Failed to load application settings'))
      }
    }

    void load()
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'etl') return

    const loadEtlConfig = async () => {
      setEtlConfigLoading(true)
      try {
        const [templates, workflows] = await Promise.all([listGalleryTemplates(), listAllWorkflowsForAdmin()])
        setGalleryWorkflows(templates)
        const promotable = workflows.filter((workflow) => !workflow.is_template)
        setNonTemplateWorkflows(promotable.map((workflow) => ({ id: workflow.id, name: workflow.name })))
        setSelectedWorkflowToAdd((current) => current || promotable[0]?.id || '')
      } catch (loadError: unknown) {
        setError(getErrorMessage(loadError, 'Failed to load ETL settings'))
      } finally {
        setEtlConfigLoading(false)
      }
    }

    void loadEtlConfig()
  }, [activeTab])

  const workflowOptions = useMemo(
    () =>
      nonTemplateWorkflows
        .filter((workflow) => workflow.name.toLowerCase().includes(workflowSearch.toLowerCase()))
        .slice(0, 200)
        .map((workflow) => ({ value: workflow.id, label: workflow.name })),
    [nonTemplateWorkflows, workflowSearch],
  )

  const updateFlagStatus = async (flagId: string, status: FeatureFlag['status']) => {
    setError(null)
    try {
      await updateFeatureFlag(flagId, status)
      setFlags((current) => current.map((flag) => (flag.id === flagId ? { ...flag, status } : flag)))
      setMessage('Feature flag updated')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to update feature flag'))
    }
  }

  const saveDefaults = async () => {
    setSavingDefaults(true)
    setError(null)
    try {
      await Promise.all([
        upsertDefaultConfiguration(null, 'default_data_retention_days', defaultRetentionDays),
        upsertDefaultConfiguration(null, 'default_sso_provider', defaultSsoProvider),
      ])
      setMessage('Default configurations saved')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to save defaults'))
    } finally {
      setSavingDefaults(false)
    }
  }

  const onAddWorkflow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedWorkflowToAdd) return

    setError(null)
    try {
      await addWorkflowToGallery(selectedWorkflowToAdd)
      setMessage('Workflow added to ETL gallery')
      setActiveTab('etl')
      const [templates, workflows] = await Promise.all([listGalleryTemplates(), listAllWorkflowsForAdmin()])
      setGalleryWorkflows(templates)
      const promotable = workflows.filter((workflow) => !workflow.is_template)
      setNonTemplateWorkflows(promotable.map((workflow) => ({ id: workflow.id, name: workflow.name })))
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to add workflow'))
    }
  }

  const onRemoveWorkflow = async (workflowId: string) => {
    setError(null)
    try {
      await removeWorkflowFromGallery(workflowId)
      setMessage('Workflow removed from ETL gallery')
      const [templates, workflows] = await Promise.all([listGalleryTemplates(), listAllWorkflowsForAdmin()])
      setGalleryWorkflows(templates)
      const promotable = workflows.filter((workflow) => !workflow.is_template)
      setNonTemplateWorkflows(promotable.map((workflow) => ({ id: workflow.id, name: workflow.name })))
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to remove workflow'))
    }
  }

  return (
    <BasePage>
      {error ? (
          <Card className="border-[var(--color-destructive)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-destructive)]">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        {message ? (
          <Card className="border-[var(--color-primary)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-primary)]">{message}</p>
            </CardContent>
          </Card>
        ) : null}

        <TabBar tabs={settingsTabs} activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as AppSettingsTabId)} />

        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
            <CardDescription>Control rollout defaults for all organisations and beta cohorts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Audience</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags
                  .filter((flag) =>
                    activeTab === 'shared' ? true : activeTab === 'etl' ? flag.key.startsWith('etl.') : flag.key.startsWith('stoqr.'),
                  )
                  .map((flag) => (
                    <TableRow key={flag.id}>
                      <TableCell className="font-medium">{flag.key}</TableCell>
                      <TableCell>
                        <Select
                          value={flag.status}
                          options={statusOptions}
                          onChange={(event) => {
                            void updateFlagStatus(flag.id, event.target.value as FeatureFlag['status'])
                          }}
                        />
                      </TableCell>
                      <TableCell>{flag.audience}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            {flags.length === 0 ? <p className="text-sm text-[var(--color-muted-foreground)] mt-3">No feature flags available yet.</p> : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {activeTab === 'etl' ? (
            <Card>
              <CardHeader>
                <CardTitle>ETL Gallery Configuration</CardTitle>
                <CardDescription>Moved from ETL organisations. Promote or remove workflows shown in ETL gallery.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <form className="space-y-3" onSubmit={onAddWorkflow}>
                  <Input
                    value={workflowSearch}
                    onChange={(event) => setWorkflowSearch(event.target.value)}
                    placeholder="Search workflows to add"
                  />
                  <Select
                    value={selectedWorkflowToAdd}
                    options={workflowOptions}
                    onChange={(event) => setSelectedWorkflowToAdd(event.target.value)}
                  />
                  <Button type="submit" disabled={!selectedWorkflowToAdd || etlConfigLoading}>Add workflow</Button>
                </form>

                {etlConfigLoading ? (
                  <p className="text-sm text-[var(--color-muted-foreground)]">Loading ETL settings...</p>
                ) : galleryWorkflows.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted-foreground)]">No workflows in ETL gallery.</p>
                ) : (
                  <div className="space-y-2">
                    {galleryWorkflows.map((workflow) => (
                      <div key={workflow.id} className="rounded-md border border-[var(--color-border)] p-3">
                        <p className="text-sm font-medium">{workflow.name}</p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">{workflow.description ?? '—'} • Nodes: {workflow.node_count}</p>
                        <div className="mt-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            void onRemoveWorkflow(workflow.id)
                          }}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Default Configurations</CardTitle>
              <CardDescription>Baseline configuration applied to new organisations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Default Data Retention (days)</p>
                <Input value={defaultRetentionDays} onChange={(event) => setDefaultRetentionDays(event.target.value)} />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Default SSO Provider</p>
                <Input value={defaultSsoProvider} onChange={(event) => setDefaultSsoProvider(event.target.value)} />
              </div>
              <Button disabled={savingDefaults} onClick={() => {
                void saveDefaults()
              }}>
                {savingDefaults ? 'Saving...' : 'Save Defaults'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Version History / Release Notes</CardTitle>
              <CardDescription>Recent releases and customer-facing update summaries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredReleaseNotes.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">No release notes available yet.</p>
              ) : (
                filteredReleaseNotes.map((release) => (
                  <div key={release.id} className="rounded-md border border-[var(--color-border)] p-3">
                    <p className="text-sm font-medium">{release.version}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{new Date(release.published_at).toLocaleString()}</p>
                    <p className="text-sm mt-2">{release.summary}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
    </BasePage>
  )
}
