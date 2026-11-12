const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync(require.resolve('../app.js'), 'utf8');

test('restored OAuth session does not briefly expose the sign-in form', () => {
  assert.match(app, /showGateLoading\('בודק התחברות…'\)/);
  assert.match(app, /gateForm\.hidden=true/);
  assert.match(app, /if\(gateGoogle\)gateGoogle\.hidden=true/);
  assert.match(app, /function showGate\(message\)\{[^}]*gateForm\.hidden=false/);
  assert.match(app, /function showApp\(\)\{gate\.style\.display='none'/);
});

test('an unauthenticated visitor still gets the normal sign-in options', () => {
  assert.match(app, /if\(gateGoogle\)gateGoogle\.hidden=false/);
  assert.match(app, /if\(gateDivider\)gateDivider\.hidden=false/);
});
