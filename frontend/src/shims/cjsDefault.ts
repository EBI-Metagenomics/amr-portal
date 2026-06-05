/** Unwrap nested CJS `module.exports` / `default` interop from `import * as ns`. */
export function cjsDefaultExport(exported: unknown): unknown {
  let current: unknown = exported;
  for (let i = 0; i < 6; i++) {
    if (typeof current === 'function') return current;
    if (current != null && typeof current === 'object') {
      const record = current as Record<string, unknown>;
      if ('default' in record) {
        const next = record.default;
        if (next === undefined || next === current) return current;
        current = next;
        continue;
      }
      return current;
    }
    break;
  }
  throw new Error('Failed to resolve CJS default export');
}
