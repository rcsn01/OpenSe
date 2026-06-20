import { Badge } from '@repo/ui'
import { OpenKbPageShell } from '../components/OpenKbPageShell'

export const PlaceholderPage = ({ title }: { title: string }) => (
  <OpenKbPageShell>
    <div className="max-w-3xl rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <Badge variant="warning">In progress</Badge>
      <h1 className="mt-4 text-xl font-semibold tracking-normal">{title}</h1>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
        The database surface for this Plane feature is in the Open-KB schema. The interactive workflow will be implemented in the next feature slice.
      </p>
    </div>
  </OpenKbPageShell>
)
