import assert from 'node:assert/strict';
const origin = 'http://localhost:3000';
for (const route of [
  '/',
  '/snapchat/uae/dubai',
  '/account/mira.sol',
  '/account/mira.sol/share',
  '/search',
  '/rankings',
  '/add-account',
  '/dashboard',
  '/admin',
  '/payment?success=true',
  '/ranking-rules',
  '/privacy',
]) {
  const r = await fetch(origin + route);
  assert.equal(r.status, 200, route);
  const body = await r.text();
  assert(!body.includes('This page couldn’t load'), route);
  console.log('PASS', route);
}
const estimate = await fetch(
  origin + '/api/estimate?account=mira.sol&amount=114',
).then((r) => r.json());
assert.equal(estimate.rank, 1);
console.log('PASS server estimate');
const invalid = await fetch(
  origin + '/api/estimate?account=mira.sol&amount=0.99',
);
assert.equal(invalid.status, 400);
console.log('PASS minimum rejected');
const checkout = await fetch(origin + '/api/checkout', {
  method: 'POST',
  headers: { origin, 'Content-Type': 'application/json' },
  body: JSON.stringify({ slug: 'mira.sol', amount: '5', verified: true }),
});
assert.equal(checkout.status, 503);
console.log('PASS demo checkout cannot credit');
const webhook = await fetch(origin + '/api/webhooks/stripe', {
  method: 'POST',
  body: '{}',
});
assert.equal(webhook.status, 400);
console.log('PASS unsigned webhook rejected');
const search = await fetch(origin + '/api/search?q=mira').then((r) => r.json());
assert.equal(search.length, 1);
assert.equal(search[0].username, 'mira.sol');
console.log('PASS server search');
