import { useCallback, useEffect, useRef } from 'react'
import { Edge, Node } from 'reactflow'
import { focusManager } from '@tanstack/react-query'
import { WorkflowNodeData } from '../../components/nodes/types'
import { validateWorkflowImport, sanitizeText } from '../../lib/validation'

type UseWorkflowImportExportParams = {
  workflowName: string
  setWorkflowName: (name: string) => void
  edges: Edge[]
  nodes: Node<WorkflowNodeData>[]
  sanitizeNodes: () => Node<WorkflowNodeData>[]
  withSetters: (nodes: Node<WorkflowNodeData>[]) => Node<WorkflowNodeData>[]
  setNodes: (updater: Node<WorkflowNodeData>[] | ((nodes: Node<WorkflowNodeData>[]) => Node<WorkflowNodeData>[])) => void
  setEdges: (updater: Edge[] | ((edges: Edge[]) => Edge[])) => void
  setRunMessage: (message: string) => void
  takeSnapshot: (nodes: Node<WorkflowNodeData>[], edges: Edge[]) => void
}

export const useWorkflowImportExport = ({
  workflowName,
  setWorkflowName,
  edges,
  nodes,
  sanitizeNodes,
  withSetters,
  setNodes,
  setEdges,
  setRunMessage,
  takeSnapshot,
}: UseWorkflowImportExportParams) => {
  const importInputRef = useRef<HTMLInputElement | null>(null)

  // Keep mutable refs so the import handler stays stable across renders.
  // This prevents the <input> onChange from being swapped out during the
  // file-dialog open/close cycle (which races with window focus events).
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

  // Timer used to restore React Query focus tracking when the user
  // cancels the file dialog (no `change` event fires).
  const focusRestoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleExport = useCallback(() => {
    const sanitizedNodes = sanitizeNodes()
    const payload = {
      name: workflowName?.trim() || 'workflow',
      graph_data: { nodes: sanitizedNodes, edges },
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${(workflowName || 'workflow').replace(/\s+/g, '_')}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setRunMessage('Workflow exported')
  }, [edges, sanitizeNodes, setRunMessage, workflowName])

  const handleImportClick = useCallback(() => {
    // Lock React Query's focus state so that the blur/focus cycle caused by
    // the native file dialog does NOT trigger refetchOnWindowFocus cascades.
    focusManager.setFocused(true)

    importInputRef.current?.click()

    // Safety net: if the user cancels the dialog (no `change` event), restore
    // focus tracking after a short delay following the next window focus event.
    if (focusRestoreTimer.current) clearTimeout(focusRestoreTimer.current)
    const onFocusRestore = () => {
      focusRestoreTimer.current = setTimeout(() => {
        focusManager.setFocused(undefined)
        focusRestoreTimer.current = null
      }, 500)
    }
    window.addEventListener('focus', onFocusRestore, { once: true })
  }, [])

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Restore React Query focus tracking now that we have the file.
    if (focusRestoreTimer.current) {
      clearTimeout(focusRestoreTimer.current)
      focusRestoreTimer.current = null
    }
    focusManager.setFocused(undefined)

    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = reader.result as string
        const parsed = JSON.parse(raw)

        const validation = validateWorkflowImport(parsed)
        if (!validation.valid) {
          setRunMessage(`Import failed: ${validation.error}`)
          return
        }

        takeSnapshot(nodesRef.current, edgesRef.current)

        const graph = (parsed.graph_data || parsed) as { nodes?: Node<WorkflowNodeData>[]; edges?: Edge[] }
        const incomingNodes = withSetters((graph.nodes || []) as Node<WorkflowNodeData>[])
        const incomingEdges = (graph.edges || []) as Edge[]
        setNodes(incomingNodes)
        setEdges(incomingEdges)

        if (parsed.name) {
          setWorkflowName(sanitizeText(parsed.name, 100))
        }

        setRunMessage('Workflow imported')
      } catch (err: any) {
        setRunMessage(err?.message || 'Failed to import workflow')
      } finally {
        e.target.value = ''
      }
    }

    reader.readAsText(file)
  }, [setEdges, setNodes, setRunMessage, setWorkflowName, takeSnapshot, withSetters])

  return {
    importInputRef,
    handleExport,
    handleImportClick,
    handleImportFile,
  }
}
