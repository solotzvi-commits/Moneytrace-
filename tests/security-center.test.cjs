const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../moneytrace-security-center.js'),'utf8');

test('security recheck button is rebound idempotently when Settings is reopened',()=>{
 assert.match(source,/button\.onclick=event=>\{event\.preventDefault\(\);run\(\)\}/);
 assert.match(source,/function bindButton\(\)/);
});

test('security recheck listens in capture phase and restores after page lifecycle changes',()=>{
 assert.match(source,/document\.addEventListener\('click',[\s\S]*?\},true\)/);
 assert.match(source,/window\.addEventListener\('pageshow',add\)/);
 assert.match(source,/window\.addEventListener\('mt:user-ready',add\)/);
});
