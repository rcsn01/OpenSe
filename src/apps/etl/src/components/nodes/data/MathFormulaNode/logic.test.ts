import { describe, expect, it, vi } from 'vitest';
import { evaluateExpression, processMathFormula } from './logic';
import type { Row } from '../../types';

describe('MathFormulaNode logic', () => {
  it('evaluates arithmetic with row columns and operator precedence', () => {
    expect(evaluateExpression('price * qty + 2', { price: '4.5', qty: 3 })).toBe(15.5);
  });

  it('supports parentheses and unary operators', () => {
    expect(evaluateExpression('-(price - discount) * 2', { price: 10, discount: 3 })).toBe(-14);
  });

  it('rejects unknown, non-numeric, and executable-looking expressions', () => {
    expect(evaluateExpression('missing + 1', { value: 1 })).toBeNull();
    expect(evaluateExpression('value + note', { value: 1, note: 'n/a' })).toBeNull();
    expect(evaluateExpression('constructor.constructor("return 1")()', { value: 1 })).toBeNull();
    expect(evaluateExpression('value / 0', { value: 1 })).toBeNull();
  });

  it('persists rows with the calculated column', async () => {
    const persistRows = vi.fn(async (rows: Row[]) => ({ preview: rows, count: rows.length }));

    const result = await processMathFormula({
      data: { label: 'Math', expression: 'price * qty', newColumn: 'total' },
      inputs: { in: { rows: [{ price: 5, qty: 2 }] } },
      node: {} as any,
      helpers: {
        persistRows,
        loadRows: vi.fn(),
        toCsv: vi.fn(),
        workflowName: 'Test workflow',
      },
    });

    expect(persistRows).toHaveBeenCalledWith([{ price: 5, qty: 2, total: 10 }]);
    expect(result.outputs.out).toEqual({ preview: [{ price: 5, qty: 2, total: 10 }], count: 1 });
  });
});
