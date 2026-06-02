import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
  useOnSelectionChange,
} from 'reactflow'
import { NODE_REGISTRY } from '../../components/nodes/registry'
import { WorkflowNodeData } from '../../components/nodes/types'
import { useUndoRedo } from './useUndoRedo'

type UseWorkflowEditorParams = {
  setRunMessage: (message: string) => void
}

export const useWorkflowEditor = ({ setRunMessage }: UseWorkflowEditorParams) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[])
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [, forceRender] = useState(0)

  const { takeSnapshot, undo, redo, resetHistory, canUndo, canRedo } = useUndoRedo()

  const defaultEdgeOptions = useMemo(() => ({
    type: 'smoothstep',
    animated: true,
    style: {
      strokeWidth: 3,
      stroke: 'var(--color-muted-foreground)',
    },
  }), [])

  const withSetters = useCallback((list: Node<WorkflowNodeData>[]) => (
    list.map((node) => ({
      ...node,
      data: {
        ...node.data,
        setData: node.data?.setData || ((updater: any) => setNodes((nds) => nds.map((n) => (
          n.id === node.id ? { ...n, data: typeof updater === 'function' ? updater(n.data) : updater } : n
        )))),
      },
    }))
  ), [setNodes])

  const handleUndo = useCallback(() => {
    const prev = undo(nodes, edges)
    if (prev) {
      setNodes(withSetters(prev.nodes))
      setEdges(prev.edges)
      forceRender((v) => v + 1)
    }
  }, [undo, nodes, edges, setNodes, setEdges, withSetters])

  const handleRedo = useCallback(() => {
    const next = redo(nodes, edges)
    if (next) {
      setNodes(withSetters(next.nodes))
      setEdges(next.edges)
      forceRender((v) => v + 1)
    }
  }, [redo, nodes, edges, setNodes, setEdges, withSetters])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return

      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleRedo, handleUndo])

  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes }) => {
      setSelectedNodeId(selectedNodes.length > 0 ? selectedNodes[0].id : null)
    },
  })

  const handleNodesChange = useCallback((changes: any) => {
    const hasStructuralChange = changes.some(
      (c: any) => c.type === 'remove' || c.type === 'add' ||
                   (c.type === 'position' && c.dragging === false),
    )
    if (hasStructuralChange) {
      takeSnapshot(nodes, edges)
      forceRender((v) => v + 1)
    }
    onNodesChange(changes)
  }, [onNodesChange, takeSnapshot, nodes, edges])

  const handleEdgesChange = useCallback((changes: any) => {
    const hasStructuralChange = changes.some(
      (c: any) => c.type === 'remove' || c.type === 'add',
    )
    if (hasStructuralChange) {
      takeSnapshot(nodes, edges)
      forceRender((v) => v + 1)
    }
    onEdgesChange(changes)
  }, [onEdgesChange, takeSnapshot, nodes, edges])

  const onConnect = useCallback((connection: Edge | Connection) => {
    takeSnapshot(nodes, edges)
    setEdges((eds) => addEdge(connection, eds))
    forceRender((v) => v + 1)
  }, [setEdges, takeSnapshot, nodes, edges])

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/reactflow')
    if (!type) return

    const config = NODE_REGISTRY[type as keyof typeof NODE_REGISTRY]
    if (!config) {
      setRunMessage('Unknown node type')
      return
    }

    takeSnapshot(nodes, edges)

    const position = rfInstance?.project({ x: event.clientX - 288, y: event.clientY - 64 }) || { x: 100, y: 100 }
    const id = `${type}-${Date.now()}`

    const baseData = { ...config.initialData } as WorkflowNodeData
    const dataWithSetter = {
      ...baseData,
      setData: (updater: any) => setNodes((nds) => nds.map((n) => (
        n.id === id ? { ...n, data: typeof updater === 'function' ? updater(n.data) : updater } : n
      ))),
    }

    const newNode = { id, type: config.type as any, position, data: dataWithSetter }
    setNodes((nds) => nds.concat(newNode))
    setSelectedNodeId(id)
    forceRender((v) => v + 1)
  }, [rfInstance, setNodes, setRunMessage, takeSnapshot, nodes, edges])

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === nodeId) {
        return { ...node, data: newData }
      }
      return node
    }))
  }

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) || null, [nodes, selectedNodeId])

  const sanitizeNodes = useCallback(() => nodes.map((node) => {
    const { data, ...rest } = node
    const cleanedData = data && typeof data === 'object'
      ? JSON.parse(JSON.stringify(data, (_key, val) => (typeof val === 'function' ? undefined : val)))
      : data

    if (cleanedData && typeof cleanedData === 'object' && 'setData' in (cleanedData as Record<string, unknown>)) {
      delete (cleanedData as Record<string, unknown>).setData
    }
    if (cleanedData && 'previewRows' in (cleanedData as Record<string, unknown>)) {
      delete (cleanedData as Record<string, unknown>).previewRows
    }
    if (node.type === 'file' && cleanedData) {
      delete (cleanedData as Record<string, unknown>).rows
      delete (cleanedData as Record<string, unknown>).datasetId
      delete (cleanedData as Record<string, unknown>).count
      delete (cleanedData as Record<string, unknown>).chunkCount
      delete (cleanedData as Record<string, unknown>).fileName
      delete (cleanedData as Record<string, unknown>).schema
    }

    return { ...rest, data: cleanedData }
  }), [nodes])

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    rfInstance,
    setRfInstance,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    defaultEdgeOptions,
    withSetters,
    sanitizeNodes,
    takeSnapshot,
    resetHistory,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleNodesChange,
    handleEdgesChange,
    onConnect,
    onDragStart,
    onDrop,
    onDragOver,
    updateNodeData,
  }
}
