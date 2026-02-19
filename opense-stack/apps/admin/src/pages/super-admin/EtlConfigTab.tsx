import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import type { useSuperAdminData } from './useSuperAdminData'

type Props = {
  data: ReturnType<typeof useSuperAdminData>
}

export const EtlConfigTab = ({ data }: Props) => {
  const {
    onAddWorkflow,
    workflowSearch,
    setWorkflowSearch,
    selectedWorkflowToAdd,
    setSelectedWorkflowToAdd,
    workflowOptions,
    etlConfigLoading,
    nonTemplateWorkflows,
    galleryWorkflows,
    onRemoveWorkflow,
  } = data

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
      <Card>
        <CardHeader>
          <CardTitle>Add workflow</CardTitle>
          <CardDescription>Promote an existing workflow into the ETL workflow gallery.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={onAddWorkflow}>
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

          {nonTemplateWorkflows.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] mt-3">No promotable workflows available.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gallery workflows</CardTitle>
          <CardDescription>Workflows visible in ETL Workflow Gallery.</CardDescription>
        </CardHeader>
        <CardContent>
          {etlConfigLoading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Loading ETL config...</p>
          ) : galleryWorkflows.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No workflows in gallery.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Nodes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {galleryWorkflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>{workflow.name}</TableCell>
                    <TableCell>{workflow.description || '—'}</TableCell>
                    <TableCell>{workflow.node_count}</TableCell>
                    <TableCell>{workflow.created_at ? new Date(workflow.created_at).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => onRemoveWorkflow(workflow.id)}>
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
