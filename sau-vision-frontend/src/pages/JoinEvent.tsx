import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Loader2, CheckCircle2, AlertCircle, MapPin, Calendar, Users, Award, ShieldAlert, UserCheck } from 'lucide-react';

interface EventInfo {
  id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  requiresCertificate: boolean;
  expectedAttendees: number;
  attendeeCount: number;
  labName: string;
  organizerName: string;
}

export default function JoinEvent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [status, setStatus] = useState<'loading' | 'info' | 'checking-in' | 'success' | 'already-attended' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [checkInResult, setCheckInResult] = useState<{ eventTitle: string; labName: string } | null>(null);

  useEffect(() => {
    // Step 1: Fetch public event info
    const fetchEventInfo = async () => {
      try {
        const { data } = await api.get(`/bookings/${bookingId}/join-info`);
        setEventInfo(data);
      } catch (err: any) {
        setErrorMessage(err.response?.data?.error || 'Event not found or invalid QR code.');
        setStatus('error');
      }
    };
    fetchEventInfo();
  }, [bookingId]);

  // Step 2: Once event info is loaded and auth is resolved, decide next step
  useEffect(() => {
    if (!eventInfo || authLoading) return;

    if (isAuthenticated) {
      // Logged in → immediately self-checkin
      handleSelfCheckin();
    } else {
      // Not logged in → show event info + login prompt
      setStatus('info');
    }
  }, [eventInfo, authLoading, isAuthenticated]);

  const handleSelfCheckin = async () => {
    setStatus('checking-in');
    try {
      const { data } = await api.post(`/bookings/${bookingId}/self-checkin`);
      setCheckInResult({ eventTitle: data.eventTitle || eventInfo?.title || '', labName: data.labName || eventInfo?.labName || '' });
      setStatus(data.alreadyAttended ? 'already-attended' : 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to check in.';
      setErrorMessage(msg);
      setStatus('error');
    }
  };

  const handleLoginRedirect = () => {
    navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
  };

  // ── Loading states ───────────────────────────────────────────────────────────
  if (status === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-[#060d18] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-electric-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Connecting to Event...</h2>
        <p className="text-gray-400 text-sm">Please wait while we verify the QR code.</p>
      </div>
    );
  }

  if (status === 'checking-in') {
    return (
      <div className="min-h-screen bg-[#060d18] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-electric-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Recording your attendance...</h2>
        <p className="text-gray-400 text-sm">Welcome, {user?.name}!</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#060d18] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Check-In Failed</h2>
        <p className="text-gray-400 text-base max-w-sm mb-8">{errorMessage}</p>
        <button onClick={() => navigate('/')} className="btn-primary w-full max-w-xs py-3.5">
          Return to Home
        </button>
      </div>
    );
  }

  // ── Already attended ─────────────────────────────────────────────────────────
  if (status === 'already-attended') {
    return (
      <div className="min-h-screen bg-[#060d18] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500 blur-[40px] opacity-20 rounded-full" />
          <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center relative border border-blue-500/30">
            <UserCheck className="w-12 h-12 text-blue-400" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Already Checked In!</h2>
        <p className="text-blue-400 font-medium mb-6">Your attendance was already recorded.</p>
        <div className="bg-[#0d1829] border border-white/10 rounded-2xl p-5 w-full max-w-sm text-left mb-8">
          <p className="text-sm font-medium text-white">{checkInResult?.eventTitle}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-electric-400" />{checkInResult?.labName}
          </p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
          Go to my Dashboard
        </button>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#060d18] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500 blur-[40px] opacity-20 rounded-full" />
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center relative border border-emerald-500/30">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Attendance Recorded!</h2>
        <p className="text-emerald-400 font-medium mb-2">Welcome, {user?.name}! 🎉</p>
        <p className="text-gray-500 text-sm mb-8">You have been successfully checked into this event.</p>

        <div className="bg-[#0d1829] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-left mb-8 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-4 line-clamp-2">{checkInResult?.eventTitle || eventInfo?.title}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <MapPin className="w-4 h-4 text-electric-400 shrink-0" />
              <span>{checkInResult?.labName || eventInfo?.labName}</span>
            </div>
            {eventInfo?.requiresCertificate && (
              <div className="flex items-center gap-3 text-sm font-medium text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 mt-2">
                <Award className="w-4 h-4 shrink-0" />
                <span>Certificate will be issued after the event</span>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
          Go to my Dashboard
        </button>
      </div>
    );
  }

  // ── Info — Not logged in, show event details + login CTA ─────────────────────
  if (status === 'info' && eventInfo) {
    const isFull = eventInfo.attendeeCount >= eventInfo.expectedAttendees;
    const start = new Date(eventInfo.scheduledStart);
    const end = new Date(eventInfo.scheduledEnd);

    return (
      <div className="min-h-screen bg-[#060d18] flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-electric-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#0d1829]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative z-10 shadow-2xl">
          {/* Icon */}
          <div className="w-16 h-16 bg-electric-500/10 rounded-2xl flex items-center justify-center mb-6 border border-electric-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <UserCheck className="w-8 h-8 text-electric-400" />
          </div>

          {eventInfo.requiresCertificate && (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-900 bg-amber-400 px-3 py-1.5 rounded-full mb-4 shadow-[0_0_10px_rgba(251,191,36,0.3)]">
              <Award className="w-3.5 h-3.5" />
              CERTIFIED EVENT
            </div>
          )}

          <p className="text-xs text-electric-400 font-semibold uppercase tracking-widest mb-2">You've been invited to</p>
          <h1 className="text-3xl font-extrabold text-white mb-1 leading-tight">{eventInfo.title}</h1>
          <p className="text-gray-400 text-sm mb-6">
            Hosted by <span className="text-white font-medium">{eventInfo.organizerName}</span>
          </p>

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
              <MapPin className="w-5 h-5 text-electric-400 shrink-0" />
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Location</div>
                <div className="text-sm font-medium text-white">{eventInfo.labName}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
              <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Scheduled Time</div>
                <div className="text-sm font-medium text-white">
                  {start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
              <Users className="w-5 h-5 text-gray-400 shrink-0" />
              <div className="w-full">
                <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
                  <span>Capacity</span>
                  <span className="font-medium text-white">{eventInfo.attendeeCount} / {eventInfo.expectedAttendees}</span>
                </div>
                <div className="h-1.5 w-full bg-navy-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min((eventInfo.attendeeCount / eventInfo.expectedAttendees) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {isFull ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-center py-4 rounded-xl font-bold text-sm">
              This event has reached its maximum capacity.
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleLoginRedirect}
                className="w-full py-4 bg-white text-navy-900 rounded-xl font-bold text-sm hover:bg-electric-400 transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              >
                Sign in to record attendance
              </button>
              <p className="text-xs text-center text-gray-500">
                Scanning this QR will mark you as <span className="text-emerald-400 font-medium">attended</span> automatically after login.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-[#060d18] flex flex-col items-center justify-center p-6 text-center">
      <Loader2 className="w-12 h-12 text-electric-500 animate-spin mb-4" />
    </div>
  );
}
