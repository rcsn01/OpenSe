import { NodeProcessor } from '../../registry.types';
import { CodeNodeData, Row } from '../../types';

/**
 * Sandboxed JavaScript execution for the Code Node.
 *
 * Security strategy:
 * 1. Rejects common escape hatches before compiling user code.
 * 2. The function receives only `rows` and a safe `console` proxy — no access
 *    to window, document, fetch, localStorage, globalThis, process, require, etc.
 * 3. All execution is wrapped in try/catch so errors are reported, not swallowed.
 *
 * Limitation: This still runs in the main thread. It is a restricted convenience
 * feature, not a hardened isolation boundary. Worker/server isolation is the
 * right next step for untrusted or shared workflow execution.
 */

const BLOCKED_GLOBALS = [
  'window', 'self', 'globalThis', 'document', 'location', 'navigator',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker', 'SharedWorker',
  'localStorage', 'sessionStorage', 'indexedDB',
  'eval', 'Function', 'importScripts', 'require', 'process', 'module', 'exports',
];

const SHADOWED_GLOBALS = BLOCKED_GLOBALS.filter((name) => name !== 'eval');

const BLOCKED_SOURCE_PATTERNS = [
  /\b(?:constructor|__proto__|prototype)\s*(?:\.|\[)/,
  /\bimport\s*\(/,
  /\bwhile\s*\(\s*true\s*\)/,
  /\bfor\s*\(\s*;\s*;\s*\)/,
];

const validateCodeSource = (code: string) => {
  for (const globalName of BLOCKED_GLOBALS) {
    const pattern = new RegExp(`\\b${globalName}\\b`);
    if (pattern.test(code)) {
      throw new Error(`Code cannot reference ${globalName}`);
    }
  }

  if (BLOCKED_SOURCE_PATTERNS.some((pattern) => pattern.test(code))) {
    throw new Error('Code contains a blocked sandbox escape or non-terminating loop pattern');
  }
};

const isRowObject = (value: unknown): value is Row =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const runSandboxed = (code: string, rows: Row[]): Row[] => {
  validateCodeSource(code);

  // Build a scope that shadows dangerous globals with undefined
  const shadowParams = SHADOWED_GLOBALS.join(', ');
  const shadowArgs = SHADOWED_GLOBALS.map(() => 'undefined').join(', ');

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

  let result: any;

  try {
    result = fn(structuredClone(rows), safeConsole);
  } catch (e: any) {
    throw new Error(`Code execution error: ${e.message}`);
  }

  // Validate output
  if (!Array.isArray(result)) {
    throw new Error('Code must return an array of row objects. Got: ' + typeof result);
  }

  if (!result.every(isRowObject)) {
    throw new Error('Code must return an array containing only row objects.');
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
