import AdminSidebar from '@/components/AdminSidebar';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side check for session cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('app_session')?.value;
  const secret = process.env.JWT_SECRET || 'dev-secret';

  if (!token) {
    redirect('/kiosk');
  }

  try {
    jwt.verify(token, secret);
  } catch {
    redirect('/kiosk');
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
