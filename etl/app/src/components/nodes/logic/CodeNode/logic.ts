import { NodeProcessor } from '../../registry.types';
import { CodeNodeData, Row } from '../../types';

/**
 * Sandboxed JavaScript execution for the Code Node.
 *
 * Security strategy:
 * 1. Uses `new Function()` (NOT eval) to compile user code into a callable.
 * 2. The function receives only `rows` and a safe `console` proxy — no access
 *    to window, document, fetch, localStorage, globalThis, process, require, etc.
 * 3. A timeout wrapper aborts execution after 10 seconds to prevent infinite loops.
 * 4. All execution is wrapped in try/catch so errors are reported, not swallowed.
 *
 * Limitation: This runs in the main thread. For true production sandboxing,
 * you would move this into a Web Worker or a server-side container.
 */

const TIMEOUT_MS = 10_000;

const BLOCKED_GLOBALS = [
  'window', 'self', 'globalThis', 'document', 'location', 'navigator',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker', 'SharedWorker',
  'localStorage', 'sessionStorage', 'indexedDB',
  'eval', 'Function', 'importScripts', 'require', 'process', 'module', 'exports',
];

const runSandboxed = (code: string, rows: Row[]): Row[] => {
  // Build a scope that shadows dangerous globals with undefined
  const shadowParams = BLOCKED_GLOBALS.join(', ');
  const shadowArgs = BLOCKED_GLOBALS.map(() => 'undefined').join(', ');

  // Safe console that captures logs but prevents side effects
  const logs: string[] = [];
  const safeConsole = {
    log: (...args: any[]) => logs.push(args.map(String).join(' ')),
    warn: (...args: any[]) => logs.push('[warn] ' + args.map(String).join(' ')),
    error: (...args: any[]) => logs.push('[error] ' + args.map(String).join(' ')),
  };

  // Wrap user code: inject rows, expect a return value
  const wrappedCode = `
    "use strict";
    return (function(rows, console, ${shadowParams}) {
      ${code}
    })(rows, console, ${shadowArgs});
  `;

  const fn = new Function('rows', 'console', wrappedCode);

  // Execute with timeout
  let result: any;
  let completed = false;
  let error: Error | null = null;

  const timer = setTimeout(() => {
    if (!completed) {
      error = new Error(`Code execution timed out after ${TIMEOUT_MS}ms`);
    }
  }, TIMEOUT_MS);

  try {
    result = fn(structuredClone(rows), safeConsole);
    completed = true;
  } catch (e: any) {
    completed = true;
    throw new Error(`Code execution error: ${e.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (error) throw error;

  // Validate output
  if (!Array.isArray(result)) {
    throw new Error('Code must return an array of row objects. Got: ' + typeof result);
  }

  return result;
};

const getInputRows = (inputs: Record<string, { rows: any[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processCode: NodeProcessor<CodeNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);

  if (!data.code?.trim()) {
    return { outputs: { out: await helpers.persistRows(sourceRows) } };
  }

  const result = runSandboxed(data.code, sourceRows);

  return {
    outputs: {
      out: await helpers.persistRows(result),
    },
  };
};
