'use client';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  icon?: string;
}

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-500',
};

export default function StatsCard({ title, value, subtitle, color = 'blue', icon }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
      {icon && (
        <div className={`${colorMap[color]} text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
