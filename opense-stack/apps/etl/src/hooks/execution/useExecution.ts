import { useCallback } from 'react'
import { useEdges } from 'reactflow'
import { useWorkflowData } from '../../context/WorkflowContext'

export const useExecution = () => {
  const edges = useEdges()
  const { dataMap } = useWorkflowData()

  const propagate = useCallback((sourceNodeId: string) => {
    const outgoingEdges = edges.filter((edge) => edge.source === sourceNodeId)

    const sourceData = dataMap[sourceNodeId]
    if (!sourceData) return

    outgoingEdges.forEach((edge) => {
      console.log(`Propagating data from ${sourceNodeId} to ${edge.target}`)
    })
  }, [edges, dataMap])

  return { propagate }
}
