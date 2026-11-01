import assert from 'node:assert/strict';
import { test } from 'node:test';

import { supersededRustCaches } from '../cleanup-rust-caches.mjs';

await test('retires obsolete Rust caches without evicting active or unrelated entries', () => {
  const now = Date.parse('2026-11-01T00:00:00Z');
  const old = '2026-10-28T00:00:00Z';
  const recent = '2026-10-31T23:00:00Z';
  const cache = {
    ref: 'refs/heads/main',
    key: 'v1-rust-test-Linux-x64-01234567-89abcdef',
    version: 'archive-version',
    created_at: old,
    last_accessed_at: old,
  };
  const caches = [
    { ...cache, id: 'obsolete' },
    { ...cache, id: 'recently-used', last_accessed_at: recent },
    { ...cache, id: 'recently-created', created_at: recent },
    { ...cache, id: 'pull-request', ref: 'refs/pull/123/merge' },
    { ...cache, id: 'other-cache', key: 'pnpm-store' },
    { ...cache, id: 'superseded', key: 'v2-rust-test-Linux-x64-01234567-00000000' },
    {
      ...cache,
      id: 'current',
      key: 'v2-rust-test-Linux-x64-01234567-11111111',
      created_at: recent,
    },
  ];
  assert.deepEqual(
    supersededRustCaches(caches, now).map((entry) => entry.id),
    ['obsolete', 'superseded'],
  );
});
