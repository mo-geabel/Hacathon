import React, { useState, useEffect } from 'react';
import type { Booking } from '../../types';
import { Activity, Clock, Info, CheckCircle2, Video } from 'lucide-react';
import BookingDetailsModal from './BookingDetailsModal';
import LiveTrackingModal from './LiveTrackingModal';

interface LiveSessionsProps {
  bookings: Booking[];
}

export default function LiveSessionsTable({ bookings }: LiveSessionsProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedLiveBooking, setSelectedLiveBooking] = useState<Booking | null>(null);
  const [now, setNow] = useState(Date.now());

  // Update current time every minute to keep statuses real-time
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (bookings.length === 0) {
    return (
      <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Active Sessions</h3>
        <p className="text-gray-400">There are no currently active or approved bookings.</p>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary text-white border-b border-white/5 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Session Info</th>
                <th className="px-6 py-4 font-medium">Room</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map((booking) => {
                const start = booking.scheduledStart ? new Date(booking.scheduledStart).getTime() : 0;
                const end = booking.scheduledEnd ? new Date(booking.scheduledEnd).getTime() : 0;
                let realTimeStatus = 'waiting';

                if (start && end) {
                  if (now < start) realTimeStatus = 'waiting';
                  else if (now >= start && now <= end) realTimeStatus = 'active';
                  else realTimeStatus = 'ended';
                } else {
                  realTimeStatus = booking.status === 'active' ? 'active' : 'waiting';
                }

                return (
                  <tr key={booking.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{booking.title || booking.studentName || booking.studentId}</div>
                      <div className="text-slate/200 flex items-center gap-1.5 mt-1 text-xs">
                        <Clock className="w-3 h-3" />
                        {booking.date} at {booking.time} ({booking.duration}m)
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate/400 font-medium">
                      {booking.roomName || 'Unknown Room'}
                      <div className="text-xs text-gray-500 font-normal">{booking.roomLocation}</div>
                    </td>
                    <td className="px-6 py-4">
                      {realTimeStatus === 'active' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Live / Active
                        </span>
                      )}
                      {realTimeStatus === 'waiting' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Clock className="w-3 h-3" /> Waiting to Start
                        </span>
                      )}
                      {realTimeStatus === 'ended' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Ended / Done
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity gap-2">
                        {realTimeStatus === 'active' && (
                          <button
                            onClick={() => setSelectedLiveBooking(booking)}
                            className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 rounded-lg transition-colors border border-emerald-500/20 flex items-center gap-2"
                            title="Live Monitoring"
                          >
                            <Video className="w-4 h-4 animate-pulse" />
                            <span className="text-xs font-medium">Live Feed</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="p-2 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors border border-white/10 flex items-center gap-2"
                          title="View Details"
                        >
                          <Info className="w-4 h-4" />
                          <span className="text-xs font-medium">Details</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}

      {selectedLiveBooking && (
        <LiveTrackingModal
          booking={selectedLiveBooking}
          onClose={() => setSelectedLiveBooking(null)}
        />
      )}
    </>
  );
}
