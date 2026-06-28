import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@repo/shared/auth/context'
import { useCurrentAccountProfileSummary } from '@repo/shared/account-profile'
import { supabase } from '@repo/shared/supabase'
import {
  ArrowLeft,
  Bell,
  CheckSquare,
  ChevronDown,
  Circle,
  FolderKanban,
  Home,
  PanelsTopLeft,
  Plus,
  Star,
} from 'lucide-react'
import {
  AppShellLayout,
  Button,
  SWITCHABLE_APP_ICONS,
  type AppShellNavItem,
} from '@repo/ui'
import { toast } from 'sonner'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useMyPermissions } from '../hooks/queries/usePermissions'
import { useProjects } from '../hooks/queries/useProjects'
import { useAddFavorite, useFavorites, useRemoveFavorite } from '../hooks/queries/usePersonal'
import { buildAccountsProfileUrl, buildAccountsSettingsUrl } from '../lib/authRedirect'
import { getTasksPath } from '../lib/projectRoutes'
import { OrganisationSwitcher } from '../components/OrganisationSwitcher'

const OpenKbBrandIcon = SWITCHABLE_APP_ICONS['open-kb']

const isSectionActive = (sectionRoot: string) => (pathname: string) =>
  pathname === sectionRoot || pathname.startsWith(`${sectionRoot}/`)

type PermissionedNavItem = AppShellNavItem & { permission: string }

export const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const accountProfile = useCurrentAccountProfileSummary({ user, client: supabase })
  const { organisationId } = useOrganisation()
  const { data: permissions = [], isLoading: permissionsLoading } = useMyPermissions(organisationId)
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const { data: favorites = [] } = useFavorites(organisationId, user?.id ?? null)
  const addFavorite = useAddFavorite()
  const removeFavorite = useRemoveFavorite()

  const currentPath = `${location.pathname}${location.search}`
  const projectIdFromPath = location.pathname.startsWith('/projects/')
    ? location.pathname.split('/')[2]
    : null
  const activeProjectId = projectIdFromPath && projectIdFromPath !== 'new' ? projectIdFromPath : null
  const activeProject = activeProjectId ? projects.find((project) => project.id === activeProjectId) : null
  const activeProjectFavorite = favorites.find((favorite) => favorite.name === 'project' && favorite.project_id === activeProject?.id)

  const personalNavItems: PermissionedNavItem[] = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: <Home className="h-5 w-5" />,
      permission: 'dashboard.view',
      isActive: isSectionActive('/dashboard'),
    },
    {
      href: getTasksPath('list'),
      label: 'Tasks',
      icon: <CheckSquare className="h-5 w-5" />,
      permission: 'issues.view',
      isActive: isSectionActive('/tasks'),
    },
    {
      href: '/notifications',
      label: 'Inbox',
      icon: <Bell className="h-5 w-5" />,
      permission: 'dashboard.view',
      isActive: isSectionActive('/notifications'),
    },
  ]

  const projectNavItems: PermissionedNavItem[] = projects.map((project) => ({
    href: `/projects/${project.id}`,
    label: project.name,
    icon: <FolderKanban className="h-5 w-5" />,
    permission: 'projects.view',
    isActive: isSectionActive(`/projects/${project.id}`),
  }))

  const handleSignOut = async () => {
    await logout()
    navigate('/')
  }

  const handleToggleProjectFavorite = async () => {
    if (!organisationId || !user || !activeProject) return

    try {
      if (activeProjectFavorite) {
        await removeFavorite.mutateAsync({ organisationId, favoriteId: activeProjectFavorite.id })
        toast.success('Removed favorite')
      } else {
        await addFavorite.mutateAsync({
          organisationId,
          profileId: user.id,
          kind: 'project',
          projectId: activeProject.id,
          title: activeProject.name,
          description: activeProject.description_text,
          status: activeProject.status,
          route: `/projects/${activeProject.id}`,
          identifier: activeProject.identifier,
        })
        toast.success('Added favorite')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update favorite')
    }
  }

  const filterByPermission = (items: PermissionedNavItem[]): AppShellNavItem[] =>
    items
      .filter((item) => permissionsLoading || permissions.includes(item.permission))
      .map((item) => ({ href: item.href, label: item.label, icon: item.icon, isActive: item.isActive }))

  const projectsTrailing = permissionsLoading || permissions.includes('projects.create') ? (
    <NavLink
      to="/projects/new"
      aria-label="Create project"
      className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
    >
      <Plus className="h-4 w-4" />
    </NavLink>
  ) : null

  const projectItems = filterByPermission(projectNavItems)

  if (!projectsLoading && projectItems.length === 0 && (permissionsLoading || permissions.includes('projects.view'))) {
    projectItems.push({
      href: '/projects',
      label: 'No projects',
      icon: <PanelsTopLeft className="h-5 w-5" />,
      isActive: isSectionActive('/projects'),
    })
  }

  const projectTopBarContent = activeProject ? (
    <div className="flex h-9 min-w-0 max-w-full items-center gap-2 overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Back to projects"
        onClick={() => navigate('/projects')}
        className="shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-0 max-w-[min(52vw,34rem)] overflow-hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-base font-semibold leading-6 tracking-normal text-[var(--color-foreground)] sm:text-lg">
            {activeProject.name}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
          <button
            type="button"
            aria-label={activeProjectFavorite ? 'Remove project from favorites' : 'Add project to favorites'}
            onClick={handleToggleProjectFavorite}
            disabled={addFavorite.isPending || removeFavorite.isPending}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] disabled:opacity-60"
          >
            <Star className={activeProjectFavorite ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
          </button>
          <Circle className="hidden h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)] sm:block" />
          <span className="hidden shrink-0 text-sm font-medium text-[var(--color-muted-foreground)] sm:inline">Set status</span>
        </div>
      </div>
    </div>
  ) : undefined

  return (
    <AppShellLayout
      brand={{
        icon: <OpenKbBrandIcon className="h-5 w-5" />,
        name: 'Open-KB',
        version: 'v0.1',
        trailing: <OrganisationSwitcher />,
      }}
      navGroups={[
        { title: 'Personal', items: filterByPermission(personalNavItems) },
        { title: projectsLoading ? 'Projects loading...' : 'Projects', trailing: projectsTrailing, items: projectItems },
      ]}
      currentPath={currentPath}
      renderNavLink={(item, { className, children }) => (
        <NavLink to={item.href} className={className}>
          {children}
        </NavLink>
      )}
      profileSrc={accountProfile.profileSrc}
      profileFallback={accountProfile.profileFallback}
      searchContent={projectTopBarContent}
      onProfileClick={() => window.location.assign(buildAccountsProfileUrl())}
      onSettingsClick={() => window.location.assign(buildAccountsSettingsUrl())}
      onLogout={handleSignOut}
    >
      <Outlet />
    </AppShellLayout>
  )
}
