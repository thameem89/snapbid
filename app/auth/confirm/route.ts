import { authClient } from '@/lib/server/db';
import { config } from '@/lib/server/config';
export async function GET(req: Request) {
  const u = new URL(req.url);
  try {
    const client = await authClient();
    const code = u.searchParams.get('code');
    if (!code) throw new Error('Missing code');
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return Response.redirect(`${config().url}/dashboard`);
  } catch {
    return Response.redirect(`${config().url}/dashboard?error=expired`);
  }
}
