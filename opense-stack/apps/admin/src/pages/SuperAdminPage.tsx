import { Building2, LayoutTemplate, ShieldCheck, Users } from 'lucide-react'
import {
  BasePage,
  Card,
  CardContent,
  TabBar,
} from '@repo/ui'
import { EtlConfigTab } from './super-admin/EtlConfigTab'
import { OrganisationsTab } from './super-admin/OrganisationsTab'
import { UsersTab } from './super-admin/UsersTab'
import { type SuperAdminTabId, useSuperAdminData } from './super-admin/useSuperAdminData'

const tabs: Array<{ id: SuperAdminTabId; label: string; icon: React.ReactNode }> = [
  { id: 'orgs', label: 'Organisations', icon: <Building2 className="h-4 w-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
  { id: 'etl-config', label: 'ETL config', icon: <LayoutTemplate className="h-4 w-4" /> },
]

export const SuperAdminPage = () => {
  const data = useSuperAdminData()

  return (
    <BasePage isLoading={data.loading} loadingMessage="Loading ETL admin...">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">ETL Super Admin</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage ETL organisations, users, and workflow gallery config.</p>
        </div>

        {data.error && (
          <Card className="border-[var(--color-destructive)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-destructive)]">{data.error}</p>
            </CardContent>
          </Card>
        )}

        {data.message && (
          <Card className="border-[var(--color-primary)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-primary)]">{data.message}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Organisations</p>
              <p className="text-2xl font-semibold mt-1">{data.orgs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Users</p>
              <p className="text-2xl font-semibold mt-1">{data.users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Super Admins</p>
              <p className="text-2xl font-semibold mt-1 flex items-center gap-2"><ShieldCheck className="h-5 w-5" />{data.adminCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Gallery Workflows</p>
              <p className="text-2xl font-semibold mt-1">{data.galleryWorkflows.length}</p>
            </CardContent>
          </Card>
        </div>

        <TabBar tabs={tabs} activeTab={data.activeTab} onTabChange={(tab) => data.setActiveTab(tab as SuperAdminTabId)} />

        {data.activeTab === 'orgs' ? <OrganisationsTab data={data} /> : null}
        {data.activeTab === 'users' ? <UsersTab data={data} /> : null}
        {data.activeTab === 'etl-config' ? <EtlConfigTab data={data} /> : null}
      </div>
    </BasePage>
  )
}
