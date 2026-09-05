import { writeFileSync } from 'node:fs';
import { locations, demoAccounts } from '../lib/domain/demo';
const quote = (s: string) => `'${s.replaceAll("'", "''")}'`;
const geography =
  `-- Safe production reference data. Fictional profiles live in demo-seed.sql only.\ninsert into public.platforms(id,name,profile_url_pattern,enabled) values\n('snapchat','Snapchat','https://www.snapchat.com/add/{username}',true),\n('instagram','Instagram','https://www.instagram.com/{username}',false),\n('tiktok','TikTok','https://www.tiktok.com/@{username}',false),\n('youtube','YouTube','https://www.youtube.com/@{username}',false),\n('x','X','https://x.com/{username}',false) on conflict do nothing;\n` +
  locations
    .map(
      (l) =>
        `insert into public.locations(id,name,slug,type,parent_id) values(${quote(l.id)},${quote(l.name)},${quote(l.slug)},${quote(l.type)},${l.parent_id ? quote(l.parent_id) : 'null'}) on conflict do nothing;`,
    )
    .join('\n');
writeFileSync('supabase/seed.sql', geography + '\n');
writeFileSync(
  'supabase/demo-seed.sql',
  `-- DEVELOPMENT ONLY. Never run on a production database.\n-- Fictional values are seeded through the same transactional ledger as purchases.\nbegin;\n` +
    demoAccounts
      .map((a, i) => {
        const id = `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
        const p = `20000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
        return `insert into public.social_accounts(id,platform_id,username,display_name,slug,profile_url,bio,location_id,account_status) values('${id}','snapchat',${quote(a.username)},${quote(a.display_name)},${quote(a.slug)},${quote('https://www.snapchat.com/add/' + a.username)},'Fictional development profile',${quote(a.location_id)},'approved');\ninsert into public.promotion_purchases(id,social_account_id,amount_cents,payment_provider,status_token_hash) values('${p}','${id}',${a.total_verified_promotion_cents},'development','disabled');\nselect public.apply_payment_event('development','seed-${i}','${p}','seed-payment-${i}',${a.total_verified_promotion_cents},'USD',true,0,false,'development-seed');`;
      })
      .join('\n') +
    '\ncommit;\n',
);
