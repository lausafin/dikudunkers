// src/app/api/auth/magic-login/[token]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 1. Verify the token exists in DB
  const result = await pool.query(
    'SELECT id FROM subscriptions WHERE access_token = $1',
    [token]
  );

  if (result.rows.length === 0) {
    // If invalid token, redirect to generic page
    return NextResponse.redirect(new URL('/mit-abonnement', request.url));
  }

  // 2. Set an HttpOnly Cookie
  // This cookie is invisible to JavaScript (safe from XSS) and works over HTTPS.
  // We set it to expire in 1 hour (or 30 days, up to you).
  const cookieStore = await cookies();
  cookieStore.set('member_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 Days
  });

  // 3. Redirect to the Clean Page
  return NextResponse.redirect(new URL('/mit-abonnement', request.url));
}