// src/app/api/warmup/route.ts
import { NextResponse } from 'next/server';

// Fortæller Vercel at denne funktion altid skal køre dynamisk og aldrig caches.
export const dynamic = 'force-dynamic';

export async function GET() {
  // Denne funktion gør intet andet end at bekræfte, at den blev kaldt.
  // Selve kaldet er det, der vækker containeren.
  return NextResponse.json({ status: 'warm' });
}