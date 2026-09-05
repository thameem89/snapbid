import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { config, requireConfig } from './config';
export function db() {
  const c = requireConfig();
  return createClient(c.supabaseUrl!, c.serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function authClient() {
  const c = config();
  if (!c.supabaseUrl || !c.supabaseKey)
    throw new Error('Sign-in is not configured yet.');
  const jar = await cookies();
  return createServerClient(c.supabaseUrl, c.supabaseKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => {
        for (const { name, value, options } of items)
          jar.set(name, value, options);
      },
    },
  });
}
export async function user() {
  const client = await authClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Sign in to continue.');
  return data.user;
}
export async function admin() {
  const u = await user();
  const { data, error } = await db()
    .from('admin_members')
    .select('user_id')
    .eq('user_id', u.id)
    .maybeSingle();
  if (error || !data) throw new Error('Administrator access required.');
  return u;
}
export function checked<T>(result: {
  data: T;
  error: { message: string } | null;
}): T {
  if (result.error) {
    console.error('Database operation failed', result.error.message);
    throw new Error('The service is temporarily unavailable.');
  }
  return result.data;
}
