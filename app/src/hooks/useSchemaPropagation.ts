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

const unionSchemas = (schemas: (string[] | undefined)[]) => {
  const set = new Set<string>()
  schemas.forEach((s) => s?.forEach((c) => set.add(c)))
  return set.size ? Array.from(set) : undefined
}

const computeOutputSchema = (
  node: Node<WorkflowNodeData>,
  incomingSchemas: (string[] | undefined)[],
): string[] | undefined => {
  const primary = incomingSchemas.find((s) => s && s.length)
  const base = primary || deriveSchema(node)

  switch (node.type) {
    case 'rename': {
      const data: any = node.data
      if (!base || !data?.field || !data?.newName) return base
      return base.map((c) => (c === data.field ? data.newName : c))
    }
    case 'renameMap': {
      const data: any = node.data
      if (!base || !Array.isArray(data?.mappings)) return base
      const map: Record<string, string> = {}
      data.mappings.forEach((m: any) => {
        if (m?.oldColumn && m?.newColumn) map[m.oldColumn] = m.newColumn
      })
      return base.map((c) => map[c] || c)
    }
    case 'remove': {
      const data: any = node.data
      if (!base) return base
      const targets: string[] = data?.selectedFields?.length
        ? data.selectedFields
        : data?.field
          ? [data.field]
          : []
      if (!targets.length) return base
      return base.filter((c) => targets.includes(c))
    }
    case 'unpivot': {
      const data: any = node.data
      if (!Array.isArray(data?.pivotColumns) || !data.pivotColumns.length) return base
      const keeps: string[] = data.keepColumns || []
      return [...keeps, 'Variable', 'Value']
    }
    case 'pivot': {
      const data: any = node.data
      if (!data?.indexColumn) return base
      // We cannot know pivoted column names without data; preserve index and keep rest if available.
      if (base) {
        return Array.from(new Set([data.indexColumn, ...base.filter((c) => c !== data.pivotColumn && c !== data.valueColumn)]))
      }
      return [data.indexColumn]
    }
    case 'lookup':
    case 'typeCast':
    case 'findReplace':
    case 'fillMissing':
    case 'sort':
    case 'deduplicate':
    case 'filter':
    case 'router':
    case 'sampler':
    case 'split':
    case 'join':
    case 'joinVertical':
    case 'preview':
    case 'save':
      return base
    default:
      return base
  }
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
      const outgoing = edges.reduce<Record<string, Edge[]>>((acc, e) => {
        if (!acc[e.source]) acc[e.source] = []
        acc[e.source].push(e)
        return acc
      }, {})

      // Seed schemas from current node data
      const schemaMap = new Map<string, string[] | undefined>()
      prev.forEach((n) => {
        const schema = deriveSchema(n)
        if (schema && schema.length) schemaMap.set(n.id, schema)
      })

      const incomingMap = new Map<string, string[] | undefined>()
      let progressed = true
      while (progressed) {
        progressed = false
        prev.forEach((node) => {
          const incoming = edges.filter((e) => e.target === node.id)
          const incomingSchemas = incoming.map((e) => schemaMap.get(e.source)).filter((s) => s && s.length)
          const mergedIncoming = node.type === 'join' || node.type === 'joinVertical'
            ? unionSchemas(incomingSchemas)
            : incomingSchemas[0]
          if (mergedIncoming && mergedIncoming.length) {
            incomingMap.set(node.id, mergedIncoming)
          }
          const outputSchema = computeOutputSchema(node, [mergedIncoming])
          const existing = schemaMap.get(node.id)
          if (outputSchema && (!existing || !schemasEqual(existing, outputSchema))) {
            schemaMap.set(node.id, outputSchema)
            progressed = true
          }
        })
      }

      let changed = false
      const nextNodes = prev.map((node) => {
        const incomingSchema = incomingMap.get(node.id)
        if (!incomingSchema || !incomingSchema.length) return node

        const data = node.data as any
        const shouldAssign = 'availableFields' in data || ['filter', 'remove', 'deduplicate', 'findReplace', 'fillMissing', 'router', 'rename', 'renameMap', 'unpivot', 'pivot', 'sort', 'lookup', 'typeCast', 'join', 'joinVertical'].includes(node.type)

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
