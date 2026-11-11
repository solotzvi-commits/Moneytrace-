const test=require('node:test');
const assert=require('node:assert/strict');
const guards=require('../business-cloud-sync-guards.js');

test('pending snapshots always use the account captured when the save was queued',()=>{
 const originalUser='account-a';
 const pendingKey=guards.pendingKey(originalUser);
 const activeUser='account-b';
 assert.equal(pendingKey,'moneytrace_business_pending_sync_v1_user_account-a');
 assert.notEqual(pendingKey,guards.pendingKey(activeUser));
});

test('a save from a previous account generation is stale after switching accounts',()=>{
 const operation={userId:'account-a',generation:4};
 const active={userId:'account-b',generation:5};
 assert.equal(guards.isCurrent(operation,active),false);
});

test('a completed save may update state only for its own current account generation',()=>{
 const operation={userId:'account-a',generation:7};
 assert.equal(guards.isCurrent(operation,{userId:'account-a',generation:7}),true);
 assert.equal(guards.isCurrent(operation,{userId:'account-a',generation:8}),false);
 assert.equal(guards.isCurrent(operation,{userId:'account-b',generation:7}),false);
});
