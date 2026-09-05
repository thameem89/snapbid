import { authClient } from '@/lib/server/db';
import { sameOrigin, failure } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const client = await authClient();
    await client.auth.signOut();
    return Response.json({ message: 'Signed out.' });
  } catch (e) {
    return failure(e);
  }
}
