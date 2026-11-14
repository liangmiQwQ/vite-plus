import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { it } from 'vitest';

// A fresh process observes Node's loaders without Vitest's own module runner.
it('loads and reloads a TypeScript config graph without installing global hooks', () => {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'vp-importer-')));
  try {
    writeFileSync(path.join(dir, 'dep.ts'), 'export enum Value { Current = 42 }');
    writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { experimentalDecorators: true } }),
    );
    writeFileSync(
      path.join(dir, 'plugin.ts'),
      `
      function label(_target, _key, descriptor) { descriptor.value = () => 'plugin'; }
      export class Plugin { @label run() { return 'original'; } }
    `,
    );
    writeFileSync(
      path.join(dir, 'config.ts'),
      `
      import { Value } from './dep.ts';
      import { Plugin } from './plugin.ts';
      export default { value: Value.Current, dir: __dirname, plugin: () => new Plugin().run() };
    `,
    );
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      import assert from 'node:assert/strict';
      import { createRequire } from 'node:module';
      import { writeFileSync } from 'node:fs';
      import { fileURLToPath, pathToFileURL } from 'node:url';
      const require = createRequire(import.meta.url);
      const extensions = { ...require.extensions };
      const sourceMaps = process.sourceMapsEnabled;
      const { createImporter } = await import('vite-plus/importer');
      const root = pathToFileURL(${JSON.stringify(dir)} + '/');
      const importer = createImporter(root, { moduleCache: false });
      const first = await importer.import('./config.ts', { default: true });
      assert.equal(first.value, 42);
      assert.equal(first.dir, ${JSON.stringify(dir)});
      assert.equal(first.plugin(), 'plugin');
      writeFileSync(new URL('dep.ts', root), 'export enum Value { Current = 43 }');
      assert.equal((await importer.import('./config.ts', { default: true })).value, 43);
      assert.deepEqual({ ...require.extensions }, extensions);
      assert.equal(process.sourceMapsEnabled, sourceMaps);
      assert.equal(require.cache[fileURLToPath(new URL('dep.ts', root))], undefined);
      await assert.rejects(import(new URL('dep.ts', root).href), { code: 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX' });
      process.stdout.write('ok');
    `,
      ],
      { cwd: path.resolve(import.meta.dirname, '../..'), encoding: 'utf8' },
    );
    assert.equal(output, 'ok');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
