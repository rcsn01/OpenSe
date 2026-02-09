import { NodeProcessor } from '../../registry.types';
import { MathFormulaNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

/**
 * Evaluate a simple math expression with column references.
 * Supports: +, -, *, /, parentheses, and numbers.
 * Column names are referenced directly (e.g., `col1 + col2 * 2`).
 */
const evaluateExpression = (expr: string, row: Row): number | null => {
  try {
    // Replace column references with their numeric values
    let resolved = expr;
    // Sort column names by length (longest first) to avoid partial replacements
    const cols = Object.keys(row).sort((a, b) => b.length - a.length);
    for (const col of cols) {
      const val = Number(row[col]);
      if (Number.isNaN(val)) continue;
      // Use word boundary-aware replacement
      resolved = resolved.replace(new RegExp(`\\b${col.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), String(val));
    }

    // Safety: only allow numbers, operators, parentheses, spaces, and decimal points
    if (!/^[\d\s+\-*/().]+$/.test(resolved)) {
      return null;
    }

    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${resolved})`)();
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

export const processMathFormula: NodeProcessor<MathFormulaNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);

  if (!data.expression || !data.newColumn) {
    return { outputs: { out: inputs.in?.ref || Object.values(inputs)[0]?.ref || await helpers.persistRows(sourceRows) } };
  }

  const out = sourceRows.map((row) => {
    const result = evaluateExpression(data.expression, row);
    return { ...row, [data.newColumn]: result };
  });

  return {
    outputs: {
      out: await helpers.persistRows(out),
    },
  };
};
