import { useEffect } from 'react'
import { Edge, Node } from 'reactflow'
import { WorkflowNodeData } from '../components/nodes/types'

type SetNodes = React.Dispatch<React.SetStateAction<Node<WorkflowNodeData>[]>>

const schemasEqual = (a?: string[], b?: string[]) => {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every((val, idx) => val === b[idx])
}

const deriveSchema = (node?: Node<WorkflowNodeData>) => {
  if (!node) return undefined
  const data = node.data as any
  if (Array.isArray(data?.schema) && data.schema.length) return data.schema as string[]
  if (Array.isArray(data?.rows) && data.rows.length && typeof data.rows[0] === 'object') {
    return Object.keys(data.rows[0] as Record<string, unknown>)
  }
  return undefined
}

export const useSchemaPropagation = (
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  setNodes: SetNodes
) => {
  useEffect(() => {
    if (!edges.length) return

    setNodes((prev) => {
      const nodeMap = new Map(prev.map((n) => [n.id, n]))
      let changed = false

      const nextNodes = prev.map((node) => {
        const incoming = edges.filter((e) => e.target === node.id)
        if (!incoming.length) return node

        const incomingSchema = incoming
          .map((e) => deriveSchema(nodeMap.get(e.source)))
          .find((s) => s && s.length)

        if (!incomingSchema) return node

        const data = node.data as any
        const shouldAssign = 'availableFields' in data || node.type === 'filter' || node.type === 'remove'

        if (shouldAssign && !schemasEqual(data.availableFields, incomingSchema)) {
          changed = true
          return { ...node, data: { ...data, availableFields: incomingSchema } }
        }

        return node
      })

      return changed ? nextNodes : prev
    })
  }, [edges, nodes, setNodes])
}
