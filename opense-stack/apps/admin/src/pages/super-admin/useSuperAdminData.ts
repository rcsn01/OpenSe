import { useEffect, useMemo, useState } from 'react'
import {
  addWorkflowToGallery,
  type AdminAuditEventRow,
  type AdminWorkflowRow,
  changeOrganisationOwner,
  createAdminUser,
  createOrganisationWithOwner,
  deleteAdminUser,
  deleteOrganisation,
  deleteOrganisationMember,
  inviteMemberToOrganisation,
  listAllWorkflowsForAdmin,
  listAdminAuditEvents,
  listAdminOrgs,
  listAdminUsers,
  listGalleryTemplates,
  listOrganisationMembers,
  removeWorkflowFromGallery,
  renameOrganisation,
  resetAdminUserPassword,
  updateUserProfile,
} from '../../api/etlAdmin'
import type { AdminUserRow, MemberRow, OrgRow } from '../../api/etlAdmin'
import { getErrorMessage } from '../../lib/errors'

export type SuperAdminTabId = 'orgs' | 'users' | 'etl-config'

export const useSuperAdminData = () => {
  const [activeTab, setActiveTab] = useState<SuperAdminTabId>('orgs')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [galleryWorkflows, setGalleryWorkflows] = useState<AdminWorkflowRow[]>([])
  const [allWorkflows, setAllWorkflows] = useState<AdminWorkflowRow[]>([])
  const [etlConfigLoading, setEtlConfigLoading] = useState(false)
  const [selectedWorkflowToAdd, setSelectedWorkflowToAdd] = useState('')
  const [workflowSearch, setWorkflowSearch] = useState('')

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [orgMembers, setOrgMembers] = useState<MemberRow[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [auditEvents, setAuditEvents] = useState<AdminAuditEventRow[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  const [orgName, setOrgName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'member'>('member')

  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')

  const selectedOrg = useMemo(
    () => orgs.find((org) => org.id === selectedOrgId) ?? null,
    [orgs, selectedOrgId],
  )

  const adminCount = useMemo(
    () => users.filter((user) => (user.super_admin_members?.length ?? 0) > 0).length,
    [users],
  )

  const nonTemplateWorkflows = useMemo(
    () => allWorkflows.filter((workflow) => !workflow.is_template),
    [allWorkflows],
  )

  const workflowOptions = useMemo(
    () =>
      nonTemplateWorkflows
        .filter((workflow) =>
          workflow.name.toLowerCase().includes(workflowSearch.toLowerCase()),
        )
        .slice(0, 200)
        .map((workflow) => ({ value: workflow.id, label: workflow.name })),
    [nonTemplateWorkflows, workflowSearch],
  )

  const notify = (text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(null), 3000)
  }

  const loadAll = async () => {
    setLoading(true)
    setError(null)

    try {
      const [nextOrgs, nextUsers] = await Promise.all([listAdminOrgs(), listAdminUsers()])
      setOrgs(nextOrgs)
      setUsers(nextUsers)
      setSelectedOrgId((current) => {
        if (current && nextOrgs.some((org) => org.id === current)) return current
        return nextOrgs[0]?.id ?? null
      })
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Failed to load ETL admin data'))
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async (orgId: string) => {
    setMembersLoading(true)
    try {
      const members = await listOrganisationMembers(orgId)
      setOrgMembers(members)
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Failed to load members'))
      setOrgMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  const loadAuditEvents = async (orgId: string) => {
    setAuditLoading(true)
    try {
      const events = await listAdminAuditEvents(orgId, 20)
      setAuditEvents(events)
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Failed to load audit activity'))
      setAuditEvents([])
    } finally {
      setAuditLoading(false)
    }
  }

  const loadEtlConfig = async () => {
    setEtlConfigLoading(true)
    setError(null)
    try {
      const [templates, workflows] = await Promise.all([listGalleryTemplates(), listAllWorkflowsForAdmin()])
      setGalleryWorkflows(templates)
      setAllWorkflows(workflows)
      setSelectedWorkflowToAdd((current) => {
        if (current && workflows.some((workflow) => workflow.id === current && !workflow.is_template)) {
          return current
        }
        return workflows.find((workflow) => !workflow.is_template)?.id ?? ''
      })
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Failed to load ETL config'))
      setGalleryWorkflows([])
      setAllWorkflows([])
    } finally {
      setEtlConfigLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  useEffect(() => {
    if (!selectedOrgId) {
      setOrgMembers([])
      setAuditEvents([])
      return
    }

    void loadMembers(selectedOrgId)
    void loadAuditEvents(selectedOrgId)
  }, [selectedOrgId])

  useEffect(() => {
    if (activeTab !== 'etl-config') return
    void loadEtlConfig()
  }, [activeTab])

  const onCreateOrg = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    try {
      await createOrganisationWithOwner(orgName.trim(), ownerEmail.trim())
      setOrgName('')
      setOwnerEmail('')
      await loadAll()
      notify('Organisation created successfully')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to create organisation'))
    }
  }

  const onInviteMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedOrgId) return

    setError(null)
    try {
      await inviteMemberToOrganisation(selectedOrgId, inviteEmail, inviteRole)
      setInviteEmail('')
      await loadMembers(selectedOrgId)
      await loadAll()
      notify('Member added to organisation')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to add member'))
    }
  }

  const onRename = async (orgId: string, nextName: string) => {
    const clean = nextName.trim()
    if (!clean) return

    setError(null)
    try {
      await renameOrganisation(orgId, clean)
      await loadAll()
      notify('Organisation updated')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to update organisation'))
    }
  }

  const onTransferOwner = async (orgId: string) => {
    const email = window.prompt('Enter new owner email')?.trim()
    if (!email) return

    setError(null)
    try {
      await changeOrganisationOwner(orgId, email)
      await loadAll()
      notify('Organisation owner changed')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to transfer ownership'))
    }
  }

  const onDeleteOrg = async (orgId: string) => {
    if (!window.confirm('Delete this organisation?')) return

    setError(null)
    try {
      await deleteOrganisation(orgId)
      await loadAll()
      notify('Organisation deleted')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to delete organisation'))
    }
  }

  const onRemoveMember = async (memberId: string) => {
    if (!selectedOrgId) return

    setError(null)
    try {
      await deleteOrganisationMember(memberId)
      await loadMembers(selectedOrgId)
      await loadAll()
      notify('Member removed')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to remove member'))
    }
  }

  const onCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      await createAdminUser(newUserEmail.trim(), newUserPassword, newUserName.trim())
      setNewUserEmail('')
      setNewUserName('')
      setNewUserPassword('')
      await loadAll()
      notify('User created')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to create user'))
    }
  }

  const onResetPassword = async (userId: string) => {
    const password = window.prompt('Enter new password')
    if (!password) return

    setError(null)
    try {
      await resetAdminUserPassword(userId, password)
      notify('Password reset')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to reset password'))
    }
  }

  const onDeleteUser = async (userId: string) => {
    if (!window.confirm('Delete this user account?')) return

    setError(null)
    try {
      await deleteAdminUser(userId)
      await loadAll()
      notify('User deleted')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to delete user'))
    }
  }

  const onRenameUser = async (userId: string, fullName: string) => {
    setError(null)
    try {
      const nextName = fullName.trim()
      await updateUserProfile(userId, { full_name: nextName || undefined })
      await loadAll()
      notify('User updated')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to update user'))
    }
  }

  const onAddWorkflow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedWorkflowToAdd) return

    setError(null)
    try {
      await addWorkflowToGallery(selectedWorkflowToAdd)
      await loadEtlConfig()
      notify('Workflow added to gallery')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to add workflow to gallery'))
    }
  }

  const onRemoveWorkflow = async (workflowId: string) => {
    setError(null)
    try {
      await removeWorkflowFromGallery(workflowId)
      await loadEtlConfig()
      notify('Workflow removed from gallery')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to remove workflow from gallery'))
    }
  }

  return {
    activeTab,
    setActiveTab,
    loading,
    error,
    message,
    orgs,
    users,
    galleryWorkflows,
    adminCount,
    selectedOrgId,
    setSelectedOrgId,
    selectedOrg,
    orgMembers,
    membersLoading,
    auditEvents,
    auditLoading,
    orgName,
    setOrgName,
    ownerEmail,
    setOwnerEmail,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    newUserEmail,
    setNewUserEmail,
    newUserName,
    setNewUserName,
    newUserPassword,
    setNewUserPassword,
    etlConfigLoading,
    selectedWorkflowToAdd,
    setSelectedWorkflowToAdd,
    workflowSearch,
    setWorkflowSearch,
    nonTemplateWorkflows,
    workflowOptions,
    onCreateOrg,
    onInviteMember,
    onRename,
    onTransferOwner,
    onDeleteOrg,
    onRemoveMember,
    onCreateUser,
    onResetPassword,
    onDeleteUser,
    onRenameUser,
    onAddWorkflow,
    onRemoveWorkflow,
  }
}
