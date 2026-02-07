import { useCallback, useRef } from 'react';
import { Edge, Node } from 'reactflow';
import { WorkflowNodeData } from '../components/nodes/types';

/**
 * Undo/Redo history stack for the workflow editor.
 *
 * Uses a past/present/future model:
 * - `past`: array of previous states (undo stack)
 * - `present`: the current state
 * - `future`: array of states after undo (redo stack)
 *
 * The hook operates imperatively (via refs) to avoid circular re-renders
 * with ReactFlow's state management. Call `takeSnapshot()` before any
 * state-changing action to push the current state onto the past stack.
 */

type EditorState = {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
};

type UndoRedoOptions = {
  maxHistory?: number;
};

export const useUndoRedo = (options: UndoRedoOptions = {}) => {
  const { maxHistory = 50 } = options;

  const pastRef = useRef<EditorState[]>([]);
  const futureRef = useRef<EditorState[]>([]);

  /**
   * Strips non-serializable data (setData functions) from nodes
   * so that snapshots are clean and comparable.
   */
  const cleanState = useCallback((nodes: Node<WorkflowNodeData>[], edges: Edge[]): EditorState => {
    const cleanNodes = nodes.map((n) => {
      const { data, ...rest } = n;
      const cleanData = { ...data };
      if ('setData' in cleanData) {
        delete (cleanData as any).setData;
      }
      return { ...rest, data: cleanData };
    });
    return {
      nodes: JSON.parse(JSON.stringify(cleanNodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
  }, []);

  /**
   * Takes a snapshot of the current state and pushes it onto the past stack.
   * Should be called BEFORE any mutation (node add, delete, move, connect, etc.).
   */
  const takeSnapshot = useCallback(
    (nodes: Node<WorkflowNodeData>[], edges: Edge[]) => {
      const state = cleanState(nodes, edges);
      pastRef.current = [...pastRef.current.slice(-(maxHistory - 1)), state];
      // Any new action clears the future (no redo after a new action)
      futureRef.current = [];
    },
    [cleanState, maxHistory]
  );

  /**
   * Undo: pops from past, pushes current onto future, returns the previous state.
   */
  const undo = useCallback(
    (currentNodes: Node<WorkflowNodeData>[], currentEdges: Edge[]): EditorState | null => {
      if (pastRef.current.length === 0) return null;

      const current = cleanState(currentNodes, currentEdges);
      const previous = pastRef.current[pastRef.current.length - 1];

      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [...futureRef.current, current];

      return previous;
    },
    [cleanState]
  );

  /**
   * Redo: pops from future, pushes current onto past, returns the next state.
   */
  const redo = useCallback(
    (currentNodes: Node<WorkflowNodeData>[], currentEdges: Edge[]): EditorState | null => {
      if (futureRef.current.length === 0) return null;

      const current = cleanState(currentNodes, currentEdges);
      const next = futureRef.current[futureRef.current.length - 1];

      futureRef.current = futureRef.current.slice(0, -1);
      pastRef.current = [...pastRef.current, current];

      return next;
    },
    [cleanState]
  );

  /**
   * Resets the entire history (e.g., when loading a new workflow).
   */
  const resetHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
  }, []);

  const canUndo = () => pastRef.current.length > 0;
  const canRedo = () => futureRef.current.length > 0;

  return {
    takeSnapshot,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
  };
};
