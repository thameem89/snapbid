import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
const pg = new PGlite({ extensions: { pg_trgm } });
const user1 = '00000000-0000-4000-8000-000000000001',
  user2 = '00000000-0000-4000-8000-000000000002';
const a = '10000000-0000-4000-8000-000000000001',
  b = '10000000-0000-4000-8000-000000000002';
async function scalar(sql: string, params: unknown[] = []) {
  return Object.values(
    (await pg.query<Record<string, unknown>>(sql, params)).rows[0],
  )[0];
}
async function purchase(
  id: string,
  account = a,
  amount = 500,
  payer: string | null = null,
) {
  await pg.query(
    "insert into promotion_purchases(id,social_account_id,payer_user_id,amount_cents,payment_provider,status_token_hash) values($1,$2,$3,$4,'stripe','private')",
    [id, account, payer, amount],
  );
}
async function event(
  id: string,
  purchaseId: string,
  amount = 500,
  refund = 0,
  dispute = false,
  verified = true,
) {
  return scalar(
    "select apply_payment_event('stripe',$1,$2,$3,$4,'USD',$5,$6,$7,'test')",
    [id, purchaseId, `pi_${purchaseId}`, amount, verified, refund, dispute],
  );
}
before(async () => {
  await pg.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;",
  );
  await pg.exec(
    readFileSync(
      'supabase/migrations/20260905072810_initial_rally.sql',
      'utf8',
    ),
  );
  await pg.exec(
    `insert into auth.users values('${user1}'),('${user2}');insert into platforms values('snapchat','Snapchat','https://www.snapchat.com/add/{username}',true);insert into locations(id,name,slug,type,parent_id) values('world','World','world','world',null),('asia','Asia','asia','continent','world'),('uae','UAE','uae','country','asia'),('dubai','Dubai','dubai','city','uae'),('europe','Europe','europe','continent','world');insert into social_accounts(id,platform_id,username,display_name,slug,profile_url,location_id,account_status) values('${a}','snapchat','alpha.demo','Alpha','alpha','https://www.snapchat.com/add/alpha.demo','dubai','approved'),('${b}','snapchat','beta.demo','Beta','beta','https://www.snapchat.com/add/beta.demo','dubai','approved');`,
  );
});
after(async () => {
  await pg.close();
});
void test('migration creates protected tables and geographic functions', async () => {
  assert.deepEqual(
    (
      await pg.query<{ id: string }>(
        "select id from location_ancestors('dubai')",
      )
    ).rows.map((x) => x.id),
    ['dubai', 'uae', 'asia', 'world'],
  );
  assert.equal(
    await scalar("select count(*) from location_descendants('uae')"),
    2,
  );
  await assert.rejects(
    pg.exec("update locations set parent_id='dubai' where id='world'"),
  );
});
void test('duplicate normalized accounts prevented by database', async () => {
  await assert.rejects(
    pg.exec(
      "insert into social_accounts(platform_id,username,display_name,slug,profile_url,location_id) values('snapchat','alpha.demo','Duplicate','another','https://www.snapchat.com/add/alpha.demo','dubai')",
    ),
  );
});
void test('guest credit is idempotent and never grants ownership', async () => {
  const p = '20000000-0000-4000-8000-000000000001';
  await purchase(p);
  assert.equal(await event('evt_1', p), 'processed');
  assert.equal(await event('evt_1', p), 'duplicate');
  await event('evt_2_same_payment', p);
  assert.equal(
    await scalar(
      'select total_verified_promotion_cents from social_accounts where id=$1',
      [a],
    ),
    500,
  );
  assert.equal(await scalar('select count(*) from social_account_owners'), 0);
  assert.equal(await scalar('select count(*) from promotion_adjustments'), 1);
  assert.equal(
    await scalar('select payer_user_id from promotion_purchases where id=$1', [
      p,
    ]),
    null,
  );
});
void test('partial refund, stale success, full refund and immutable ledger', async () => {
  const p = '20000000-0000-4000-8000-000000000001';
  await event('partial', p, 500, 200);
  assert.equal(
    await scalar(
      'select total_verified_promotion_cents from social_accounts where id=$1',
      [a],
    ),
    300,
  );
  await event('stale_success', p);
  assert.equal(
    await scalar(
      'select total_verified_promotion_cents from social_accounts where id=$1',
      [a],
    ),
    300,
  );
  await event('full', p, 500, 500);
  assert.equal(
    await scalar(
      'select total_verified_promotion_cents from social_accounts where id=$1',
      [a],
    ),
    0,
  );
  await assert.rejects(
    pg.exec('update promotion_adjustments set delta_cents=999'),
  );
});
void test('dispute arriving before payment success cannot recredit', async () => {
  const p = '20000000-0000-4000-8000-000000000002';
  await purchase(p);
  await event('early_dispute', p, 500, 0, true, false);
  await event('late_verified', p);
  assert.equal(
    await scalar('select credited_cents from promotion_purchases where id=$1', [
      p,
    ]),
    0,
  );
  assert.equal(
    await scalar('select status from promotion_purchases where id=$1', [p]),
    'disputed',
  );
});
void test('queued concurrent purchase calls retain every atomic increment', async () => {
  const ids = Array.from(
    { length: 8 },
    (_, i) => `20000000-0000-4000-8000-0000000000${10 + i}`,
  );
  for (const id of ids) await purchase(id, b);
  await Promise.all(ids.map((id, i) => event(`concurrent_${i}`, id)));
  assert.equal(
    await scalar(
      'select total_verified_promotion_cents from social_accounts where id=$1',
      [b],
    ),
    4000,
  );
  assert.equal(
    Number(
      await scalar(
        'select sum(delta_cents) from promotion_adjustments where social_account_id=$1',
        [b],
      ),
    ),
    4000,
  );
});
void test('amount/currency mismatch transaction rolls back event and credit', async () => {
  const p = '20000000-0000-4000-8000-000000000030';
  await purchase(p);
  await assert.rejects(event('bad_amount', p, 600));
  assert.equal(
    await scalar(
      "select count(*) from payment_events where provider_event_id='bad_amount'",
    ),
    0,
  );
  await assert.rejects(
    pg.query(
      "select apply_payment_event('stripe','bad_currency',$1,'pi_bad',500,'AED',true,0,false,'test')",
      [p],
    ),
  );
});
void test('database target estimate, geography isolation and suspension', async () => {
  const target = Number(
    await scalar('select rank_opportunity($1,$2,1)', [a, 'dubai']),
  );
  assert.equal(
    await scalar('select rank_estimate($1,$2,$3)', [a, 'dubai', target]),
    1,
  );
  assert.equal(
    await scalar("select jsonb_array_length(leaderboard('europe'))"),
    0,
  );
  await pg.query(
    "update social_accounts set account_status='suspended' where id=$1",
    [b],
  );
  assert.equal(
    await scalar("select jsonb_array_length(leaderboard('dubai'))"),
    1,
  );
  await pg.query(
    "update social_accounts set account_status='approved' where id=$1",
    [b],
  );
});
void test('anon and authenticated cannot mutate ranking, ledger or privileged RPC', async () => {
  for (const role of ['anon', 'authenticated']) {
    await pg.exec(`set role ${role}`);
    try {
      assert.equal(await scalar('select count(*) from social_accounts'), 2);
      await assert.rejects(
        pg.exec(
          'update social_accounts set total_verified_promotion_cents=100000000',
        ),
      );
      await assert.rejects(pg.exec('select * from payment_events'));
      await assert.rejects(pg.exec("select consume_rate('attack',10,60)"));
      await assert.rejects(
        pg.query(
          "select apply_payment_event('stripe','attack',$1,'pi_attack',500,'USD',true,0,false,'test')",
          ['20000000-0000-4000-8000-000000000030'],
        ),
      );
    } finally {
      await pg.exec('reset role');
    }
  }
});
void test('RLS isolates payer history and private ownership evidence', async () => {
  const p = '20000000-0000-4000-8000-000000000031';
  await purchase(p, a, 500, user1);
  await pg.query(
    'insert into account_claims(social_account_id,user_id,evidence) values($1,$2,$3)',
    [a, user1, 'Private ownership evidence'],
  );
  await pg.exec(`set role authenticated;set request.jwt.claim.sub='${user2}';`);
  assert.equal(await scalar('select count(*) from promotion_purchases'), 0);
  assert.equal(await scalar('select count(*) from account_claims'), 0);
  await pg.exec(`set request.jwt.claim.sub='${user1}';`);
  assert.equal(await scalar('select count(*) from promotion_purchases'), 1);
  assert.equal(await scalar('select count(*) from account_claims'), 1);
  await pg.exec('reset role');
});
void test('admin authorization enforced by database and decisions audited atomically', async () => {
  await assert.rejects(
    pg.query("select moderate($1,$2,'suspend','test reason')", [user1, a]),
  );
  await pg.query('insert into admin_members values($1)', [user1]);
  const claim = await scalar('select id from account_claims where user_id=$1', [
    user1,
  ]);
  await pg.query(
    "select moderate($1,$2,'approve_claim','reviewed evidence',$3)",
    [user1, a, claim],
  );
  assert.equal(await scalar('select count(*) from social_account_owners'), 1);
  assert.equal(await scalar('select count(*) from admin_audit_log'), 1);
});
void test('database rate limiting is shared and enforces limits', async () => {
  assert.equal(await scalar("select consume_rate('shared',2,60)"), true);
  assert.equal(await scalar("select consume_rate('shared',2,60)"), true);
  assert.equal(await scalar("select consume_rate('shared',2,60)"), false);
});

void test('suspended accounts reject new purchases, while existing settlement remains auditable', async () => {
  await pg.query(
    "update social_accounts set account_status='suspended' where id=$1",
    [a],
  );
  await assert.rejects(purchase('20000000-0000-4000-8000-000000000099'));
  await pg.query(
    "update social_accounts set account_status='approved' where id=$1",
    [a],
  );
});
