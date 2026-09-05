export function config() {
  const e = process.env;
  return {
    demo:
      e.DEMO_MODE === 'true' ||
      (!e.NEXT_PUBLIC_SUPABASE_URL && e.NODE_ENV !== 'production'),
    url: e.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    supabaseUrl: e.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey:
      e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || e.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: e.SUPABASE_SERVICE_ROLE_KEY,
    max: Number(e.MAX_PROMOTION_AMOUNT_CENTS || 0),
    review: e.NEW_ACCOUNT_REVIEW_MODE === 'automatic' ? 'approved' : 'pending',
    indexThreshold: Number(e.MIN_INDEXED_ACCOUNTS || 10),
  };
}
export function requireConfig() {
  const c = config();
  if (c.demo || !c.supabaseUrl || !c.supabaseKey || !c.serviceKey)
    throw new Error('Service is not configured. Please try again later.');
  return c;
}
