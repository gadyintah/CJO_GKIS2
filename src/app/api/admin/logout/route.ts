import { NextResponse } from 'next/server';

export async function POST() {
  // Clear a common session cookie if present. Adjust cookie name to match your auth implementation.
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', 'app_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure');
  return res;
}
