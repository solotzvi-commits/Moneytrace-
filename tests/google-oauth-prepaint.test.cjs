const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const app=fs.readFileSync(require.resolve('../app.js'),'utf8');
test('auth controls are hidden before scripts execute',()=>{
 const initial=html.slice(0,html.indexOf('<script src="https://cdn.jsdelivr.net/npm/@supabase'));
 assert.match(initial,/<form id="loginGateForm" hidden/);
 assert.match(initial,/<button id="gateGoogle" hidden/);
 assert.match(initial,/#loginGate \[hidden\]\{display:none!important\}/);
 assert.match(initial,/בודק התחברות…/);
});
test('auth form is restored when session is absent',()=>{
 assert.match(app,/function showGate\(message\)\{[^}]*gateForm\.hidden=false/);
 assert.match(app,/if\(gateGoogle\)gateGoogle\.hidden=false/);
 assert.match(app,/else setSignedIn\(null\)/);
});
