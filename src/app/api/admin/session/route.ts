import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('app_session')?.value;
    if (!token) return NextResponse.json({ authenticated: false });

    const secret = process.env.JWT_SECRET || 'dev-secret';
      try {
        jwt.verify(token, secret);
        return NextResponse.json({ authenticated: true });
      } catch {
        return NextResponse.json({ authenticated: false });
      }
  } catch {
      return NextResponse.json({ authenticated: false });
  }
}
