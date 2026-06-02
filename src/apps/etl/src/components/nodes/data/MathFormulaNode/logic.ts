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
type Token =
  | { type: 'number'; value: number }
  | { type: 'identifier'; value: string }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' }
  | { type: 'paren'; value: '(' | ')' }

const tokenizeExpression = (expr: string): Token[] | null => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expr.length) {
    const char = expr[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      const match = expr.slice(index).match(/^(?:\d+\.?\d*|\.\d+)/);
      if (!match) return null;
      const value = Number(match[0]);
      if (!Number.isFinite(value)) return null;
      tokens.push({ type: 'number', value });
      index += match[0].length;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const match = expr.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (!match) return null;
      tokens.push({ type: 'identifier', value: match[0] });
      index += match[0].length;
      continue;
    }

    if (char === '+' || char === '-' || char === '*' || char === '/') {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      index += 1;
      continue;
    }

    return null;
  }

  return tokens;
};

export const evaluateExpression = (expr: string, row: Row): number | null => {
  const tokens = tokenizeExpression(expr);
  if (!tokens?.length) return null;

  let position = 0;
  const current = () => tokens[position];

  const parseFactor = (): number | null => {
    const token = current();
    if (!token) return null;

    if (token.type === 'operator' && (token.value === '+' || token.value === '-')) {
      position += 1;
      const value = parseFactor();
      return value === null ? null : token.value === '-' ? -value : value;
    }

    if (token.type === 'number') {
      position += 1;
      return token.value;
    }

    if (token.type === 'identifier') {
      position += 1;
      if (!Object.prototype.hasOwnProperty.call(row, token.value)) return null;
      const value = Number(row[token.value]);
      return Number.isFinite(value) ? value : null;
    }

    if (token.type === 'paren' && token.value === '(') {
      position += 1;
      const value = parseExpression();
      const closing = current();
      if (!closing || closing.type !== 'paren' || closing.value !== ')') return null;
      position += 1;
      return value;
    }

    return null;
  };

  const parseTerm = (): number | null => {
    let value = parseFactor();
    if (value === null) return null;

    while (current()?.type === 'operator' && (current()?.value === '*' || current()?.value === '/')) {
      const operator = current() as Extract<Token, { type: 'operator' }>;
      position += 1;
      const next = parseFactor();
      if (next === null) return null;
      if (operator.value === '/' && next === 0) return null;
      value = operator.value === '*' ? value * next : value / next;
    }

    return value;
  };

  const parseExpression = (): number | null => {
    let value = parseTerm();
    if (value === null) return null;

    while (current()?.type === 'operator' && (current()?.value === '+' || current()?.value === '-')) {
      const operator = current() as Extract<Token, { type: 'operator' }>;
      position += 1;
      const next = parseTerm();
      if (next === null) return null;
      value = operator.value === '+' ? value + next : value - next;
    }

    return value;
  };

  const result = parseExpression();
  return result !== null && position === tokens.length && Number.isFinite(result) ? result : null;
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
