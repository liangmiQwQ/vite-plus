# Programmatic TypeScript importer (POC)

This experiment for [#3380](https://github.com/voidzero-dev/vite-plus/issues/3380) exposes the existing oxc-node module runner through `vite-plus/importer`. It does not change Vite's default config loader.

```ts
import { createImporter } from 'vite-plus/importer';

const importer = createImporter(import.meta.url, { moduleCache: false });
const config = await importer.import('./vite.config.ts', { default: true });
```

The importer resolves and transforms the config and its local dependencies without installing Node loader hooks or patching `require.extensions`. It supports TypeScript enums, JSX, tsconfig paths, top-level await, and CommonJS globals such as `__dirname` inside ESM files. Config functions and plugin functions remain callable in the same process. This is a module runner, not a sandbox.

The API follows upstream `@oxc-node/core/importer`:

- `createImporter(parentId, options?)` accepts a file path or URL. End a directory path with `/`.
- `importer.import(id, options?)` returns a module. `{ default: true }` returns `mod.default ?? mod`.
- `importer.resolve(id, options?)` returns a file URL or a built-in module ID.
- `moduleCache` defaults to `true`, sharing upstream's module map across importers. With `false`, each import evaluates a fresh importer-managed graph.
- `interopDefault` defaults to `true`, exposing default-export properties on the returned module as jiti does.

Published JavaScript dependencies and built-ins normally use Node's own loader and cache. TypeScript dependencies use the importer. Disabling `moduleCache` does not invalidate Node's cache. Imports created inside `eval` or `new Function` also use Node's loader. The returned namespace is a plain object, and the API has no synchronous top-level import or dependency-list export.

For Vite integration, dependency tracking and reload semantics still need evaluation. The POC deliberately exposes the importer independently so config loading can be benchmarked against Vite's Rolldown-backed bundle loader, plain `import()`, and jiti before changing default behavior.
