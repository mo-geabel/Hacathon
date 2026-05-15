import React from 'react';
import type { Booking, Room } from '../../types';
import { Check, X, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ApprovalTableProps {
  bookings: Booking[];
  rooms: Room[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function ApprovalTable({ bookings, rooms, onApprove, onReject }: ApprovalTableProps) {
  const getRoomName = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.name || 'Unknown Room';
  };

  const getReliabilityBadge = (score: number) => {
    if (score >= 90) return <span className="status-green px-2 py-0.5 rounded-md text-xs border">High ({score}%)</span>;
    if (score >= 70) return <span className="status-yellow px-2 py-0.5 rounded-md text-xs border">Medium ({score}%)</span>;
    return <span className="status-red px-2 py-0.5 rounded-md text-xs border">Low ({score}%)</span>;
  };

  if (bookings.length === 0) {
    return (
      <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
        <p className="text-gray-400">There are no pending booking requests right now.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy-800/50 text-gray-400 border-b border-white/5 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Student / Time</th>
              <th className="px-6 py-4 font-medium">Room</th>
              <th className="px-6 py-4 font-medium">Reliability Score</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-medium text-white">{booking.studentId}</div>
                  <div className="text-gray-400 flex items-center gap-1.5 mt-1 text-xs">
                    <Clock className="w-3 h-3" />
                    {booking.date} at {booking.time} ({booking.duration}m)
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300 font-medium">
                  {getRoomName(booking.roomId)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getReliabilityBadge(booking.reliabilityScore)}
                    {booking.reliabilityScore < 70 && (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onReject(booking.id)}
                      className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                      title="Reject Booking"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onApprove(booking.id)}
                      className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/20"
                      title="Approve Booking"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

