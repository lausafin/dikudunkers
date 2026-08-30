import { timingSafeEqual } from 'crypto';

function unauthorized(): Response {
  return new Response('Unauthorized', { status: 401 });
}

/**
 * Require `Authorization: Bearer <secret>`.
 * Fails closed when the secret is missing (never matches `Bearer undefined`).
 */
export function requireBearerSecret(
  request: Request,
  secret: string | undefined,
): Response | null {
  if (!secret) {
    console.error('Required bearer secret is not configured.');
    return unauthorized();
  }

  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;

  const provided = Buffer.from(header);
  const required = Buffer.from(expected);

  if (provided.length !== required.length || !timingSafeEqual(provided, required)) {
    return unauthorized();
  }

  return null;
}
