import { z } from 'zod';
import { authClient } from '@/lib/server/db';
import { config } from '@/lib/server/config';
import { sameOrigin, limit, failure } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await limit(req, 'auth', 5);
    const b = z.object({ email: z.email().max(254) }).parse(await req.json());
    const client = await authClient();
    const { error } = await client.auth.signInWithOtp({
      email: b.email,
      options: { emailRedirectTo: `${config().url}/auth/confirm` },
    });
    if (error)
      throw new Error('Unable to send sign-in link. Please try again later.');
    return Response.json({
      message: 'Check your email for your secure sign-in link.',
    });
  } catch (e) {
    return failure(e);
  }
}
