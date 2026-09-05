import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUsername,
  amountCents,
  ancestors,
  rank,
  opportunity,
  safeReturnPath,
} from '../lib/domain/ranking';
import { demoAccounts, locations } from '../lib/domain/demo';
import { StripeProvider } from '../lib/server/payment';
void test('username normalization collapses case, @, whitespace and profile URLs', () => {
  for (const s of [
    ' @MIRA.SOL ',
    'https://www.snapchat.com/add/Mira.Sol/',
    'mira.sol',
  ])
    assert.equal(normalizeUsername(s), 'mira.sol');
  for (const s of [
    'https://evil.test/add/foo',
    'https://snapchat.com.evil.test/add/foo',
    'https://snapchat.com/add/foo/bar',
    'ab',
    'a space',
    'https://user@www.snapchat.com/add/foo',
  ])
    assert.throws(() => normalizeUsername(s));
});
void test('integer cents reject floats, scientific notation, negative, unsafe, minimum and maximum', () => {
  assert.equal(amountCents('1', 5000), 100);
  assert.equal(amountCents('12.34', 5000), 1234);
  for (const s of [
    '0.99',
    '1.001',
    '1e3',
    'NaN',
    '-5',
    '51',
    '999999999999999999999',
  ])
    assert.throws(() => amountCents(s, 5000));
  assert.throws(() => amountCents('1', 0));
});
void test('location ancestors include optional levels; cycles fail', () => {
  assert.deepEqual(ancestors('dubai', locations), [
    'dubai',
    'dubai-emirate',
    'uae',
    'gcc',
    'middle-east',
    'asia',
    'world',
  ]);
  assert(ancestors('london', locations).includes('europe'));
  assert.throws(() =>
    ancestors('a', [
      { id: 'a', name: 'a', slug: 'a', parent_id: 'b', type: 'city' },
      { id: 'b', name: 'b', slug: 'b', parent_id: 'a', type: 'country' },
    ]),
  );
});
void test('ordering uses descending cents, earliest first promotion, stable id; suspended excluded', () => {
  const a = {
    ...demoAccounts[0],
    id: 'a',
    total_verified_promotion_cents: 100,
    first_verified_promotion_at: '2026-01-01',
  };
  const b = { ...a, id: 'b' };
  assert.deepEqual(
    rank([b, a, { ...a, id: 'c', account_status: 'suspended' }]).map(
      (x) => x.id,
    ),
    ['a', 'b'],
  );
  assert.equal(
    rank([{ ...a, id: 'd', first_verified_promotion_at: '2026-01-02' }, a])[0]
      .id,
    'a',
  );
});
void test('target calculator exceeds tie when needed and respects minimum', () => {
  const a = {
    ...demoAccounts[0],
    id: 'a',
    total_verified_promotion_cents: 1700,
    first_verified_promotion_at: '2026-02-01',
  };
  const b = {
    ...a,
    id: 'b',
    total_verified_promotion_cents: 2100,
    first_verified_promotion_at: '2026-01-01',
  };
  assert.equal(opportunity(a, [a, b], 1), 401);
  assert.equal(
    opportunity(
      { ...a, first_verified_promotion_at: '2025' },
      [{ ...a, first_verified_promotion_at: '2025' }, b],
      1,
    ),
    400,
  );
  assert.equal(opportunity(b, [a, b], 1), 0);
});
void test('open redirects blocked', () => {
  for (const p of [
    '//evil.test',
    '/\\evil.test',
    'https://evil.test',
    '/\r\nevil',
  ])
    assert.equal(safeReturnPath(p), '/dashboard');
  assert.equal(safeReturnPath('/account/mira.sol'), '/account/mira.sol');
});
void test('Stripe refuses live secret and invalid signature without network access', async () => {
  assert.throws(() => new StripeProvider('sk_live_fake', 'whsec_test'));
  const adapter = new StripeProvider('sk_test_example', 'whsec_example');
  await assert.rejects(adapter.verifyWebhook('{}', 'invalid'));
  await assert.rejects(adapter.verifyWebhook('{}', 't=1,v1=0000'));
});
