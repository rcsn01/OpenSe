import { useCreateWorkflowVersion } from '../queries/useVersions'
import { useSaveWorkflow, useUpdateWorkflowName, useWorkflow } from '../queries/useWorkflows'

export const useWorkflowData = (workflowId: string | null) => {
  const { data: workflowData, error: workflowError } = useWorkflow(workflowId)
  const saveMutation = useSaveWorkflow()
  const nameMutation = useUpdateWorkflowName()
  const createVersionMutation = useCreateWorkflowVersion()

  return {
    workflowData,
    workflowError,
    saveMutation,
    nameMutation,
    createVersionMutation,
  }
}
