import React from 'react';
import { ShieldCheck, Users, Activity, CheckCircle2 } from 'lucide-react';
import type { Booking } from '../../types';

interface StatsProps {
  bookings: Booking[];
}

export default function AdminStatsCards({ bookings }: StatsProps) {
  const pending = bookings.filter(b => b.status === 'pending').length;
  const active = bookings.filter(b => b.status === 'active' || b.status === 'approved').length;
  const completed = bookings.filter(b => b.status === 'completed').length;
  const ghosted = bookings.filter(b => b.status === 'ghosted' || b.status === 'cancelled').length;
  
  const totalFinished = completed + ghosted;
  const efficiency = totalFinished > 0 ? Math.round((completed / totalFinished) * 100) : 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="glass-card p-6 border-l-4 border-l-amber-500 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-400 font-medium">Pending Requests</div>
          <Users className="w-5 h-5 text-amber-500 opacity-50" />
        </div>
        <div className="text-3xl font-bold text-white">{pending}</div>
      </div>
      
      <div className="glass-card p-6 border-l-4 border-l-emerald-500 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-400 font-medium">Active/Approved</div>
          <Activity className="w-5 h-5 text-emerald-500 opacity-50" />
        </div>
        <div className="text-3xl font-bold text-white">{active}</div>
      </div>

      <div className="glass-card p-6 border-l-4 border-l-blue-500 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-400 font-medium">Completed Events</div>
          <CheckCircle2 className="w-5 h-5 text-blue-500 opacity-50" />
        </div>
        <div className="text-3xl font-bold text-white">{completed}</div>
      </div>

      <div className="glass-card p-6 border-l-4 border-l-electric-500 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-400 font-medium">System Efficiency</div>
          <ShieldCheck className="w-5 h-5 text-electric-500 opacity-50" />
        </div>
        <div className="text-3xl font-bold text-white">{efficiency}%</div>
        <div className="text-xs text-gray-500 mt-1">Completion rate vs Ghosted</div>
      </div>
    </div>
  );
}
