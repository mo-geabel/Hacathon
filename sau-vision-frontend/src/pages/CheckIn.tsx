import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { socketService } from '../lib/socket';
import { mockBookings, mockRooms } from '../lib/mockData';
import UrgentModal from '../components/shared/UrgentModal';
import { ShieldCheck, ArrowLeft, ScanLine } from 'lucide-react';

export default function CheckIn() {
  const { id } = useParams();
  const [status, setStatus] = useState<'waiting' | 'confirmed' | 'released'>('waiting');
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(5);

  const booking = mockBookings.find(b => b.id === id);
  const room = booking ? mockRooms.find(r => r.id === booking.roomId) : null;

  useEffect(() => {
    const socket = socketService.connect();

    // Listen for anti-ghosting alert from backend
    socket.on('RECLAMATION_ALERT', (data: { bookingId: string, minutesLeft: number }) => {
      if (data.bookingId === id) {
        setMinutesLeft(data.minutesLeft);
        setShowUrgentModal(true);
      }
    });

    // Listen for successful physical scan confirmation
    socket.on('BOOKING_SECURED', (data: { bookingId: string }) => {
      if (data.bookingId === id) {
        setStatus('confirmed');
        setShowUrgentModal(false);
      }
    });

    // Simulate the anti-ghosting event firing 10 seconds after page load for demo purposes
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
  }, [id, status]);

  // Demo helper: simulate scanning the QR code physically
  const simulateScan = () => {
    const socket = socketService.connect();
    socket.emit('BOOKING_SECURED', { bookingId: id });
    setStatus('confirmed');
    setShowUrgentModal(false);
  };

  if (!booking || !room) {
    return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Booking not found.</div>;
  }

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
          <div className="bg-electric-600 p-6 text-center text-white">
            <h2 className="text-2xl font-bold mb-1">{room.name}</h2>
            <p className="text-blue-100">{booking.date} at {booking.time}</p>
          </div>

          <div className="p-8 flex flex-col items-center text-center">
            
            {status === 'waiting' && (
              <>
                <div className="relative p-4 bg-white rounded-xl mb-6">
                  {/* Decorative scanner corners */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-electric-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-electric-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-electric-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-electric-500 rounded-br-lg" />
                  
                  <QRCodeSVG 
                    value={`sau-vision://checkin/${id}?token=${booking.qrToken}`}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                  
                  {/* Scanning line animation */}
                  <div className="absolute left-4 right-4 h-0.5 bg-electric-500 shadow-[0_0_10px_#3b82f6] animate-shimmer top-1/2 -translate-y-1/2 opacity-50" />
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2 justify-center">
                  <ScanLine className="w-5 h-5 text-electric-400 animate-pulse" />
                  Waiting for scan...
                </h3>
                <p className="text-sm text-gray-400">
                  Hold this QR code up to the scanner at the door of {room.name} to confirm your attendance.
                </p>

                {/* For demo purposes only */}
                <button onClick={simulateScan} className="mt-8 text-xs text-gray-500 hover:text-white border border-gray-700 px-3 py-1 rounded">
                  [Demo] Simulate Physical Scan
                </button>
              </>
            )}

            {status === 'confirmed' && (
              <div className="py-12 flex flex-col items-center animate-fade-in">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 glow-blue">
                  <ShieldCheck className="w-12 h-12 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Checked In ✓</h3>
                <p className="text-gray-400">
                  Your attendance has been verified. The door is unlocked.
                </p>
              </div>
            )}

            {status === 'released' && (
              <div className="py-12 flex flex-col items-center animate-fade-in">
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                  <ShieldCheck className="w-12 h-12 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Booking Released</h3>
                <p className="text-gray-400">
                  This booking was cancelled because no one checked in.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

