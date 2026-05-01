import { describe, expect, it } from 'vitest';
import { runSandboxed } from './logic';

describe('CodeNode logic', () => {
  it('runs row transforms against a cloned input array', () => {
    const rows = [{ value: 2 }];
    const result = runSandboxed('return rows.map((row) => ({ ...row, doubled: row.value * 2 }));', rows);

    expect(result).toEqual([{ value: 2, doubled: 4 }]);
    expect(rows).toEqual([{ value: 2 }]);
  });

  it('rejects direct access to blocked browser and runtime globals', () => {
    expect(() => runSandboxed('return fetch("/api");', [])).toThrow('Code cannot reference fetch');
    expect(() => runSandboxed('return globalThis.location;', [])).toThrow('Code cannot reference globalThis');
  });

  it('rejects common escape hatches and obvious non-terminating loops', () => {
    expect(() => runSandboxed('return ({}).constructor.constructor("return 1")();', [])).toThrow(
      'blocked sandbox escape',
    );
    expect(() => runSandboxed('while (true) {}', [])).toThrow('blocked sandbox escape');
  });

  it('requires an array of row objects', () => {
    expect(() => runSandboxed('return "nope";', [])).toThrow('Code must return an array');
    expect(() => runSandboxed('return [1];', [])).toThrow('array containing only row objects');
  });
});
