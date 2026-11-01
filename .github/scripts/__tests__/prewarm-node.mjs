// Run with node --test; exercise the real shell entry point without downloads.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../prewarm-node.sh', import.meta.url));

for (const [failVersion, runnerOs] of [
  ['', 'Linux'],
  ['20', 'Linux'],
  ['', 'Windows'],
]) {
  await test(`prewarm waits for downloads and propagates failures (${runnerOs}, ${failVersion || 'success'})`, async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'prewarm-node-'));
    try {
      const fixtures = join(cwd, 'crates/vp_cli_snapshots/tests/cli_snapshots');
      await mkdir(fixtures, { recursive: true });
      await writeFile(join(cwd, '.node-version'), '24.22.1\n');
      await writeFile(join(fixtures, 'node-versions.txt'), '20\n22\n24\n26\n28\n');
      const vp = join(cwd, 'vp');
      await writeFile(
        vp,
        `#!/usr/bin/env bash
set -eu
if [[ "$VP_NODE_VERSION" == "$FAIL_VERSION" ]]; then
  exit 1
fi
sleep 0.05
echo "$VP_NODE_VERSION" >> completed
`,
        { mode: 0o755 },
      );
      const result = spawnSync('bash', [script, vp], {
        cwd,
        env: { ...process.env, FAIL_VERSION: failVersion, RUNNER_OS: runnerOs },
        encoding: 'utf8',
        timeout: 10_000,
      });
      assert.equal(result.status, failVersion ? 1 : 0, result.stderr);
      const completed = (await readFile(join(cwd, 'completed'), 'utf8')).trim().split('\n');
      // Even an early worker failure must not leave the other workers running.
      const expected = failVersion
        ? ['24.22.1', 'lts', 'latest', '22', '24', '26']
        : ['24.22.1', 'lts', 'latest', '20', '22', '24', '26', '28'];
      assert.deepEqual(completed.toSorted(), expected.toSorted());
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
}
