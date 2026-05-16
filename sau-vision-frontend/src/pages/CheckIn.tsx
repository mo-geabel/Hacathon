import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { socketService } from '../lib/socket';
import api from '../lib/api';
import UrgentModal from '../components/shared/UrgentModal';
import { ShieldCheck, ArrowLeft, ScanLine, Loader2 } from 'lucide-react';

interface BookingDetail {
  id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  lab: {
    name: string;
    floor: number;
    roomNumber: string;
    faculty?: { name: string };
  };
}

export default function CheckIn() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState<'waiting' | 'confirmed' | 'released'>('waiting');
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(5);

  // Fetch the real booking from the API
  useEffect(() => {
    if (!id) return;
    const fetchBooking = async () => {
      try {
        const { data } = await api.get(`/bookings/${id}`);
        // Only allow the check-in page for approved bookings
        if (data.status !== 'approved' && data.status !== 'active') {
          setNotFound(true);
          return;
        }
        setBooking(data);
      } catch (err: any) {
        // 403 → student trying to access someone else's booking
        // 404 → booking doesn't exist
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  // Socket listeners for anti-ghosting events
  useEffect(() => {
    if (!id || !booking) return;

    const socket = socketService.connect();

    socket.on('RECLAMATION_ALERT', (data: { bookingId: string; minutesLeft: number }) => {
      if (data.bookingId === id) {
        setMinutesLeft(data.minutesLeft);
        setShowUrgentModal(true);
      }
    });

    socket.on('BOOKING_SECURED', (data: { bookingId: string }) => {
      if (data.bookingId === id) {
        setStatus('confirmed');
        setShowUrgentModal(false);
      }
    });

    // Demo only: fire the anti-ghosting alert 10 seconds after load
    const demoTimeout = setTimeout(() => {
      if (status === 'waiting') {
        socket.emit('RECLAMATION_ALERT', { bookingId: id, minutesLeft: 5 });
      }
    }, 10000);

    return () => {
      socket.off('RECLAMATION_ALERT');
      socket.off('BOOKING_SECURED');
      clearTimeout(demoTimeout);
    };
  }, [id, booking, status]);

  // Demo helper: simulate the physical door scanner confirming presence
  const simulateScan = () => {
    const socket = socketService.connect();
    socket.emit('BOOKING_SECURED', { bookingId: id });
    setStatus('confirmed');
    setShowUrgentModal(false);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-electric-400" />
        <span className="text-sm text-gray-400">Loading booking...</span>
      </div>
    );
  }

  // ── Not found / unauthorized / wrong status ──────────────────────────────────
  if (notFound || !booking) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Booking Not Available</h2>
        <p className="text-gray-400 text-sm max-w-xs mb-6">
          This booking doesn't exist, belongs to another student, or isn't in an approved state yet.
        </p>
        <Link to="/dashboard" className="btn-primary px-6 py-2 text-sm">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const startDate = new Date(booking.scheduledStart);
  const dateStr = startDate.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const roomLabel = `Floor ${booking.lab.floor}, Room ${booking.lab.roomNumber}`;

  return (
    <div className="min-h-screen bg-navy-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      <UrgentModal
        isOpen={showUrgentModal}
        minutesLeft={minutesLeft}
        bookingId={id || ''}
      />

      <div className="max-w-md mx-auto relative z-10">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="glass-card overflow-hidden">
          {/* Header */}
          <div className="bg-electric-600 p-6 text-center text-white">
            <h2 className="text-2xl font-bold mb-1">{booking.lab.name}</h2>
            <p className="text-blue-100 text-sm">{roomLabel}</p>
            <p className="text-blue-200 text-xs mt-1">{dateStr} at {timeStr}</p>
          </div>

          <div className="p-8 flex flex-col items-center text-center">

            {status === 'waiting' && (
              <>
                {/* QR Code */}
                <div className="relative p-4 bg-white rounded-xl mb-6">
                  {/* Decorative scanner corners */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-electric-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-electric-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-electric-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-electric-500 rounded-br-lg" />

                  <QRCodeSVG
                    value={`sau-vision://checkin/${id}`}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />

                  {/* Scanning animation */}
                  <div className="absolute left-4 right-4 h-0.5 bg-electric-500 shadow-[0_0_10px_#3b82f6] animate-shimmer top-1/2 -translate-y-1/2 opacity-50" />
                </div>

                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2 justify-center">
                  <ScanLine className="w-5 h-5 text-electric-400 animate-pulse" />
                  Waiting for scan...
                </h3>
                <p className="text-sm text-gray-400">
                  Hold this QR code up to the scanner at the door of <span className="text-white font-medium">{booking.lab.name}</span> to confirm your attendance.
                </p>

                {/* Demo trigger */}
                <button
                  onClick={simulateScan}
                  className="mt-8 text-xs text-gray-500 hover:text-white border border-gray-700 px-3 py-1 rounded transition-colors"
                >
                  [Demo] Simulate Physical Scan
                </button>
              </>
            )}

            {status === 'confirmed' && (
              <div className="py-12 flex flex-col items-center animate-fade-in">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <ShieldCheck className="w-12 h-12 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Checked In ✓</h3>
                <p className="text-gray-400">Your attendance has been verified. The door is unlocked.</p>
              </div>
            )}

            {status === 'released' && (
              <div className="py-12 flex flex-col items-center animate-fade-in">
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                  <ShieldCheck className="w-12 h-12 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Booking Released</h3>
                <p className="text-gray-400">This booking was cancelled because no one checked in.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
