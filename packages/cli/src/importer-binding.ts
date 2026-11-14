import { createRequire } from 'node:module';

// Avoid translating the entire CommonJS binding into an ESM namespace at startup.
const { oxcNode } = createRequire(import.meta.url)(
  '../binding/index.cjs',
) as typeof import('../binding/index.js');

export const { transformModuleRunner, transformsDep } = oxcNode;

// Upstream takes a WASI-only options argument; the embedded native addon omits it.
export function createResolve(
  _options: unknown,
  ...args: Parameters<typeof oxcNode.createResolve>
) {
  return oxcNode.createResolve(...args);
}
