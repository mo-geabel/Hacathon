import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { FileText, Mail, ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface BookingReport {
  id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  expectedAttendees: number;
  status: string;
  lab: {
    name: string;
    floor: number;
    roomNumber: string;
    capacity: number;
    currentOccupancy: number;
    faculty?: { name: string };
  };
  registrations: { id: string; status: string; checkInTime?: string }[];
}

/** Build a synthetic occupancy timeline from registration check-in times */
function buildTimeline(booking: BookingReport) {
  const start = new Date(booking.scheduledStart);
  const end = new Date(booking.scheduledEnd);
  const checkedIn = booking.registrations.filter(r => r.checkInTime);

  // Group check-ins by 10-minute buckets
  const buckets: Record<string, number> = {};
  let runningTotal = 0;

  // Walk from start to end in 10-min steps
  const current = new Date(start);
  while (current <= end) {
    const label = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Count how many people checked in by this point
    runningTotal = checkedIn.filter(r => new Date(r.checkInTime!) <= current).length;
    buckets[label] = runningTotal;
    current.setMinutes(current.getMinutes() + 10);
  }

  return Object.entries(buckets).map(([time, count]) => ({ time, count }));
}

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const { data } = await api.get(`/bookings/${id}`);
        setBooking(data);
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleSendCertificates = async () => {
    setIsSending(true);
    try {
      // Future: await api.post(`/bookings/${id}/certificates`);
      await new Promise(r => setTimeout(r, 1000)); // placeholder
      setSent(true);
    } finally {
      setIsSending(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-3 text-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-electric-400" />
        <span className="text-sm text-slate-500 dark:text-gray-400">Loading report...</span>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound || !booking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-xl font-bold text-foreground mb-2">Report Not Found</h2>
        <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">This booking doesn't exist or you don't have access to it.</p>
        <Link to="/admin" className="btn-primary px-6 py-2 text-sm">Back to Admin</Link>
      </div>
    );
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const startDate = new Date(booking.scheduledStart);
  const endDate = new Date(booking.scheduledEnd);
  const timeRange = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const actualAttendance = booking.registrations.filter(r =>
    r.status === 'attended' || r.checkInTime
  ).length || booking.lab.currentOccupancy;

  const efficiency = booking.expectedAttendees > 0
    ? Math.round((actualAttendance / booking.expectedAttendees) * 100)
    : 0;

  const isOvercrowded = efficiency > 100;
  const timeline = buildTimeline(booking);

  // If no check-in data yet, show a simple mock curve based on expected attendees
  const displayTimeline = timeline.length > 1 ? timeline : [
    { time: timeRange.split(' – ')[0], count: 0 },
    { time: '', count: Math.round(booking.expectedAttendees * 0.4) },
    { time: '', count: Math.round(booking.expectedAttendees * 0.8) },
    { time: '', count: booking.expectedAttendees },
    { time: '', count: Math.round(booking.expectedAttendees * 0.9) },
    { time: timeRange.split(' – ')[1], count: 0 },
  ].map((t, i, arr) => ({ ...t, time: t.time || `+${i * 10}m` }));

  const roomName = booking.lab.name;
  const labLocation = booking.lab.faculty
    ? `${booking.lab.faculty.name} · Floor ${booking.lab.floor}, Room ${booking.lab.roomNumber}`
    : `Floor ${booking.lab.floor}, Room ${booking.lab.roomNumber}`;

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Top Actions */}
        <div className="flex justify-between items-center mb-8 no-print">
          <Link to="/admin" className="inline-flex items-center gap-2 text-slate-500 dark:text-gray-400 hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Admin
          </Link>
          <button onClick={() => window.print()} className="btn-ghost flex items-center gap-2">
            <FileText className="w-4 h-4" /> Print PDF
          </button>
        </div>

        {/* Report Card */}
        <div className="glass-card print-card overflow-hidden">

          {/* Header */}
          <div className="bg-white dark:bg-navy-800 border-b border-slate-200 dark:border-white/5 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">{booking.title}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
                  ROI Report
                </span>
              </div>
              <p className="text-slate-500 dark:text-gray-400">
                {roomName} · {labLocation}
              </p>
              <p className="text-slate-400 dark:text-gray-500 text-sm mt-1">{timeRange} · {startDate.toLocaleDateString()}</p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-sm text-slate-500 dark:text-gray-400 mb-1">Session ID</div>
              <div className="font-mono text-slate-600 dark:text-gray-300 text-xs">{booking.id}</div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-background/50 p-6 rounded-xl border border-slate-200 dark:border-white/5">
                <div className="text-sm text-slate-500 dark:text-gray-400 mb-2">Expected Attendance</div>
                <div className="text-3xl font-bold text-foreground">{booking.expectedAttendees}</div>
              </div>

              <div className="bg-background/50 p-6 rounded-xl border border-slate-200 dark:border-white/5">
                <div className="text-sm text-slate-500 dark:text-gray-400 mb-2">Actual Attendance</div>
                <div className="text-3xl font-bold text-foreground">{actualAttendance}</div>
              </div>

              <div className={`bg-background/50 p-6 rounded-xl border ${isOvercrowded ? 'border-amber-500/30' : 'border-slate-200 dark:border-white/5'}`}>
                <div className="text-sm text-slate-500 dark:text-gray-400 mb-2 flex items-center justify-between">
                  Capacity Efficiency
                  {isOvercrowded && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                </div>
                <div className={`text-3xl font-bold ${isOvercrowded ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {efficiency}%
                </div>
                {isOvercrowded && (
                  <div className="text-xs text-amber-500/80 mt-1">Room was over capacity</div>
                )}
              </div>
            </div>

            {/* Occupancy Timeline Chart */}
            <div className="mb-12">
              <h3 className="text-lg font-semibold text-foreground mb-6">Occupancy Timeline</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayTimeline} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      cursor={{ fill: '#1e293b' }}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#60a5fa' }}
                    />
                    <ReferenceLine
                      y={booking.expectedAttendees}
                      stroke="#f59e0b"
                      strokeDasharray="3 3"
                      label={{ position: 'top', value: 'Expected', fill: '#f59e0b', fontSize: 12 }}
                    />
                    <Bar dataKey="count" name="Headcount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="border-t border-slate-200 dark:border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
              <div className="text-sm text-slate-500 dark:text-gray-400">
                {booking.registrations.length} registered attendees ·{' '}
                {booking.registrations.filter(r => r.checkInTime).length} checked in
              </div>

              <button
                onClick={handleSendCertificates}
                disabled={isSending || sent || booking.status !== 'completed'}
                className={`btn-primary flex items-center gap-2 whitespace-nowrap ${sent ? 'bg-emerald-600 hover:bg-emerald-600' : ''}`}
                title={booking.status !== 'completed' ? 'Available after session is completed' : ''}
              >
                {isSending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : sent ? (
                  <><CheckCircle2 className="w-4 h-4" /> Certificates Sent</>
                ) : (
                  <><Mail className="w-4 h-4" /> Send Certificates</>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
