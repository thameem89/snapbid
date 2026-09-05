import { writeFileSync } from 'node:fs';
import { geographyCatalog } from '../lib/domain/geography';

const quote = (value: string | null) =>
  value === null ? 'null' : `'${value.replaceAll("'", "''")}'`;
const locations = geographyCatalog();
const rows = locations.map(
  (location) =>
    `(${quote(location.id)},${quote(location.name)},${quote(location.slug)},${quote(location.type)},${quote(location.parent_id)})`,
);
const chunks: string[] = [];
for (let index = 0; index < rows.length; index += 150) {
  chunks.push(`insert into public.locations(id,name,slug,type,parent_id) values
${rows.slice(index, index + 150).join(',\n')}
on conflict(id) do update set
  name=excluded.name,
  slug=excluded.slug,
  type=excluded.type,
  parent_id=excluded.parent_id,
  enabled=true;`);
}
const sql = `-- Generated from lib/domain/geography.ts. Do not edit by hand.
update public.social_accounts set location_id='london' where location_id='england';
update public.social_accounts set location_id='los-angeles' where location_id='california';
update public.locations set parent_id='uk' where parent_id='england';
update public.locations set parent_id='usa' where parent_id='california';
delete from public.locations where id in ('england','california');

${chunks.join('\n\n')}
`;
writeFileSync(
  new URL('../supabase/migrations/20260905143000_expand_geography_catalog.sql', import.meta.url),
  sql,
);
