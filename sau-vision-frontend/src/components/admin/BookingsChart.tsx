import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Booking } from '../../types';

interface ChartProps {
  bookings: Booking[];
}

export default function BookingsChart({ bookings }: ChartProps) {
  const data = useMemo(() => {
    // Group last 7 days of bookings
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayBookings = bookings.filter(b => b.date === date);
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        completed: dayBookings.filter(b => b.status === 'completed').length,
        ghosted: dayBookings.filter(b => b.status === 'ghosted' || b.status === 'cancelled').length,
        pending: dayBookings.filter(b => b.status === 'pending').length,
      };
    });
  }, [bookings]);

  return (
    <div className="glass-card p-6 h-80">
      <h3 className="text-lg font-semibold text-white mb-6">Booking Activity (Last 7 Days)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '8px' }}
            itemStyle={{ fontSize: '12px' }}
            labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="ghosted" name="Ghosted/Cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
