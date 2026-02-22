'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/members', label: 'Members', icon: '👥' },
  { href: '/admin/members/register', label: 'Register Member', icon: '➕' },
  { href: '/admin/walkins', label: 'Walk-ins', icon: '🚶' },
  { href: '/admin/revenue', label: 'Revenue', icon: '💰' },
  { href: '/admin/logs', label: 'Attendance Logs', icon: '📋' },
  { href: '/admin/scan', label: 'Scanner Check', icon: '🔍' },
  { href: '/kiosk', label: 'Kiosk View', icon: '🖥️' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-yellow-400">CJO GYM</h1>
        <p className="text-gray-400 text-sm mt-1">Admin Panel</p>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin/dashboard' && item.href !== '/kiosk' && pathname.startsWith(item.href) && 
               !(item.href === '/admin/members' && pathname.startsWith('/admin/members/register')));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-yellow-500 text-gray-900 font-semibold'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-gray-500 text-xs text-center">CJO Gym v1.0</p>
      </div>
    </aside>
  );
}
