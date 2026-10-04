import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// A missing config stops doctor after its diagnostic banner, before benchmarking.
const doctor = spawnSync('vp', ['test', 'doctor', '--config', 'missing.config.mjs'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
assert.ifError(doctor.error);
assert.notEqual(doctor.status, 0);
assert.match(doctor.stdout, /DOCTOR/);
console.log('vp test doctor enters Vitest diagnostics');

const complete = spawnSync('vp', ['test', 'complete', 'zsh'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
assert.ifError(complete.error);
assert.equal(complete.status, 0, complete.stdout + complete.stderr);
assert.match(complete.stdout, /#compdef vitest/);
console.log('vp test complete zsh prints the completion script');
