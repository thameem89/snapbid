export type Account = {
  id: string;
  slug: string;
  username: string;
  display_name: string;
  location_id: string;
  city: string;
  country: string;
  bio: string;
  total_verified_promotion_cents: number;
  first_verified_promotion_at: string | null;
  ownership_status: string;
  account_status: string;
  color: string;
  platform_id: string;
  location_verification_status?: string;
};
export type Location = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  type: string;
};
export function ancestors(id: string, locations: Location[]): string[] {
  const result: string[] = [];
  let current: string | null = id;
  while (current) {
    if (result.includes(current)) throw new Error('Location cycle');
    const loc = locations.find((x) => x.id === current);
    if (!loc) throw new Error('Unknown location');
    result.push(current);
    current = loc.parent_id;
  }
  return result;
}
export function compare(a: Account, b: Account) {
  return (
    b.total_verified_promotion_cents - a.total_verified_promotion_cents ||
    (a.first_verified_promotion_at ?? '9999').localeCompare(
      b.first_verified_promotion_at ?? '9999',
    ) ||
    a.id.localeCompare(b.id)
  );
}
export function rank(accounts: Account[]) {
  return accounts
    .filter((a) => a.account_status === 'approved')
    .sort(compare)
    .map((a, i) => ({ ...a, rank: i + 1 }));
}
export function opportunity(
  account: Account,
  accounts: Account[],
  target: number,
  min = 100,
) {
  const ordered = rank(accounts);
  const current = ordered.find((x) => x.id === account.id);
  if (!current || target < 1 || !Number.isInteger(target))
    throw new Error('Invalid target');
  if (current.rank <= target) return 0;
  const rival = ordered[target - 1];
  const tied = {
    ...account,
    total_verified_promotion_cents: rival.total_verified_promotion_cents,
  };
  return Math.max(
    min,
    rival.total_verified_promotion_cents -
      account.total_verified_promotion_cents +
      (compare(tied, rival) < 0 ? 0 : 1),
  );
}
export function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
}
export function amountCents(value: string, max: number) {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error('Enter an amount with up to two decimal places.');
  const [whole, part = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(part.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < 100)
    throw new Error('Promotion starts at $1.');
  if (!Number.isSafeInteger(max) || max < 100)
    throw new Error('Payments are not configured.');
  if (cents > max) throw new Error(`Maximum purchase is ${money(max)}.`);
  return cents;
}
export function normalizeUsername(input: string) {
  let value = input.trim();
  if (/^https?:/i.test(value)) {
    const u = new URL(value);
    if (
      u.protocol !== 'https:' ||
      !['snapchat.com', 'www.snapchat.com'].includes(u.hostname) ||
      u.username ||
      u.password
    )
      throw new Error('Use a Snapchat profile URL.');
    const match = u.pathname.match(/^\/add\/([^/]+)\/?$/);
    if (!match) throw new Error('Use a Snapchat /add/ profile URL.');
    value = match[1];
  }
  value = value.replace(/^@/, '').toLowerCase();
  if (!/^[a-z][a-z0-9._-]{1,13}[a-z0-9]$/.test(value))
    throw new Error('Enter a valid Snapchat username (3–15 characters).');
  return value;
}
export function safeReturnPath(path: string) {
  return path.startsWith('/') &&
    !path.startsWith('//') &&
    !/[\\\r\n]/.test(path)
    ? path
    : '/dashboard';
}
