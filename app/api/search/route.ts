import { leaderboard } from '@/lib/server/ranking';
import { config } from '@/lib/server/config';
import { limit, failure } from '@/lib/server/http';
export async function GET(req: Request) {
  try {
    if (!config().demo) await limit(req, 'search', 30);
    const u = new URL(req.url);
    return Response.json(
      await leaderboard(
        u.searchParams.get('location') || 'world',
        (u.searchParams.get('q') || '').slice(0, 80),
        Math.max(0, Number(u.searchParams.get('after') || 0)),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
