const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const business = read('business-mode.js');
const selectMigration = read('supabase/migrations/202611090001_business_workspace_cloud_sync.sql');
const writeMigration = read('supabase/migrations/202611090002_business_workspace_rls_writes.sql');

test('Business dashboard exposes accessible cloud-sync states', () => {
  assert.match(business, /function renderSyncStatus\(\)/);
  assert.match(business, /aria-live="polite"/);
  for (const state of ['conflict', 'synced', 'syncing', 'paused', 'local']) {
    assert.match(business, new RegExp("\\b" + state + "\\b"));
  }
  assert.match(business, /if\(currentModule==='dashboard'\)render\(\)/);
});

test('conflict recovery preserves a backup and only loads the authenticated account cloud row', () => {
  assert.match(business, /moneytrace-business-unsynced-backup\.json/);
  const restore = business.slice(business.indexOf('async function useCloudVersion()'), business.indexOf('function renderDashboard()'));
  assert.match(restore, /\.eq\('user_id',userId\)/);
  assert.match(restore, /if\(!row\?\.payload\)throw/);
  assert.match(restore, /generation!==cloudGeneration\|\|window\.mtUser\?\.id!==userId/);
  assert.ok(restore.indexOf('localStorage.removeItem(PENDING(userId))') > restore.indexOf('if(!row?.payload)throw'));
  assert.match(restore, /הורד תחילה גיבוי/);
  assert.match(restore, /cloudConflict=true/);
});

test('workspace RLS policies constrain reads and writes to the authenticated owner', () => {
  assert.match(selectMigration, /for select to authenticated[\s\S]*?using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(writeMigration, /for insert to authenticated[\s\S]*?with check \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(writeMigration, /for update to authenticated[\s\S]*?using \(\(select auth\.uid\(\)\) = user_id\)[\s\S]*?with check \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(writeMigration, /grant select, insert, update on public\.mt_business_workspace_data to authenticated/i);
  assert.doesNotMatch(writeMigration, /grant [^;]*delete[^;]*mt_business_workspace_data/i);
});
