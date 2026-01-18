import { NodeProcessor } from '../../registry.types';
import { Row } from '../../types';

export const processJoinVertical: NodeProcessor = async ({ inputs, helpers }) => {
  const top = inputs['input-top']?.rows || [];
  const bottom = inputs['input-bottom']?.rows || [];
  const fields = new Set<string>();
  top.forEach((r) => Object.keys(r).forEach((k) => fields.add(k)));
  bottom.forEach((r) => Object.keys(r).forEach((k) => fields.add(k)));
  const cols = Array.from(fields);
  const normalize = (rows: Row[]) => rows.map((r) => {
    const next: Row = {};
    cols.forEach((c) => { next[c] = r[c]; });
    return next;
  });
  const out = [...normalize(top), ...normalize(bottom)];

  return {
    outputs: {
      'output-stacked': await helpers.persistRows(out),
    },
  };
};
