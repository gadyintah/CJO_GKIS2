import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;
    if (!username || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });

    const user = await prisma.adminUser.findUnique({ where: { username } });
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const expiresInSec = 8 * 3600; // 8 hours
    const token = jwt.sign({ sub: String(user.admin_id), username: user.username }, secret, { expiresIn: expiresInSec });

    const res = NextResponse.json({ ok: true });
    const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
    res.headers.set('Set-Cookie', `app_session=${token}; Path=/; HttpOnly; Max-Age=${expiresInSec}; SameSite=Lax; ${secure}`);
    return res;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
