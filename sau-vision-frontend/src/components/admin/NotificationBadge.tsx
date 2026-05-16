import React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export default function NotificationBadge({ count, className }: NotificationBadgeProps) {
  return (
    <div className={cn("relative inline-flex", className)}>
      <div className="p-2 bg-white dark:bg-navy-800 rounded-full border border-border text-slate-500 dark:text-gray-400 hover:text-foreground transition-colors cursor-pointer">
        <Bell className="w-5 h-5" />
      </div>
      
      {count > 0 && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-foreground border-2 border-navy-900 animate-slide-up shadow-[0_0_10px_rgba(239,68,68,0.5)]">
          {count > 99 ? '99+' : count}
        </div>
      )}
    </div>
  );
}

