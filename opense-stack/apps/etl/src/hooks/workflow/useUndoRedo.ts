import { useCallback, useRef } from 'react'
import { Edge, Node } from 'reactflow'
import { WorkflowNodeData } from '../../components/nodes/types'

type EditorState = {
  nodes: Node<WorkflowNodeData>[]
  edges: Edge[]
}

type UndoRedoOptions = {
  maxHistory?: number
}

export const useUndoRedo = (options: UndoRedoOptions = {}) => {
  const { maxHistory = 50 } = options

  const pastRef = useRef<EditorState[]>([])
  const futureRef = useRef<EditorState[]>([])

  const cleanState = useCallback((nodes: Node<WorkflowNodeData>[], edges: Edge[]): EditorState => {
    const cleanNodes = nodes.map((node) => {
      const { data, ...rest } = node
      const cleanData = { ...data }
      if ('setData' in cleanData) {
        delete (cleanData as any).setData
      }
      return { ...rest, data: cleanData }
    })
    return {
      nodes: JSON.parse(JSON.stringify(cleanNodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    }
  }, [])

  const takeSnapshot = useCallback(
    (nodes: Node<WorkflowNodeData>[], edges: Edge[]) => {
      const state = cleanState(nodes, edges)
      pastRef.current = [...pastRef.current.slice(-(maxHistory - 1)), state]
      futureRef.current = []
    },
    [cleanState, maxHistory],
  )

  const undo = useCallback(
    (currentNodes: Node<WorkflowNodeData>[], currentEdges: Edge[]): EditorState | null => {
      if (pastRef.current.length === 0) return null

      const current = cleanState(currentNodes, currentEdges)
      const previous = pastRef.current[pastRef.current.length - 1]

      pastRef.current = pastRef.current.slice(0, -1)
      futureRef.current = [...futureRef.current, current]

      return previous
    },
    [cleanState],
  )

  const redo = useCallback(
    (currentNodes: Node<WorkflowNodeData>[], currentEdges: Edge[]): EditorState | null => {
      if (futureRef.current.length === 0) return null

      const current = cleanState(currentNodes, currentEdges)
      const next = futureRef.current[futureRef.current.length - 1]

      futureRef.current = futureRef.current.slice(0, -1)
      pastRef.current = [...pastRef.current, current]

      return next
    },
    [cleanState],
  )

  const resetHistory = useCallback(() => {
    pastRef.current = []
    futureRef.current = []
  }, [])

  const canUndo = () => pastRef.current.length > 0
  const canRedo = () => futureRef.current.length > 0

  return {
    takeSnapshot,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
  }
}
