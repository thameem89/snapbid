import { config, requireConfig } from './config';
import { db, checked } from './db';
export async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
export function sameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(config().url).origin)
    throw new Error('Invalid request origin.');
}
export async function limit(
  request: Request,
  action: string,
  max = 30,
  identity?: string,
) {
  requireConfig();
  const address = request.headers.get('cf-connecting-ip') || 'local';
  const key = await hash(
    `${action}:${identity || address}:${process.env.RATE_LIMIT_SALT || 'local-only'}`,
  );
  if (
    !checked(
      await db().rpc('consume_rate', {
        p_key: key,
        p_limit: max,
        p_seconds: 60,
      }),
    )
  )
    throw new Error('Rate limit reached. Please wait a minute.');
}
export function failure(error: unknown, status = 400) {
  const message =
    error instanceof Error ? error.message : 'Service unavailable';
  return Response.json(
    { error: message },
    {
      status: message.includes('not configured')
        ? 503
        : message.includes('Rate limit')
          ? 429
          : status,
    },
  );
}
