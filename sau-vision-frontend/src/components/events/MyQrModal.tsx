import React, { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Loader2, ShieldAlert, Download, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';

interface Props {
  bookingId: string;
  eventTitle: string;
  onClose: () => void;
}

interface QrData {
  registrationId: string;
  qrPayload: string;
  status: 'registered' | 'attended' | 'no_show';
}

export default function MyQrModal({ bookingId, eventTitle, onClose }: Props) {
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchQr = async () => {
      try {
        const { data } = await api.get(`/bookings/${bookingId}/my-qr`);
        setQrData(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load QR code.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQr();
  }, [bookingId]);

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `sau-checkin-${bookingId.slice(0, 8)}.png`;
    link.href = url;
    link.click();
  };

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-200 dark:border-white/5">
          <div>
            <p className="text-xs text-electric-400 font-semibold uppercase tracking-widest mb-1">Check-In QR Code</p>
            <h2 className="text-lg font-bold text-foreground leading-tight line-clamp-2">{eventTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-gray-400 hover:text-foreground shrink-0 ml-3"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center">
          {isLoading && (
            <div className="flex flex-col items-center py-10 gap-4">
              <Loader2 className="w-10 h-10 text-electric-400 animate-spin" />
              <p className="text-slate-500 dark:text-gray-400 text-sm">Loading your QR code...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center py-10 gap-4 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                <ShieldAlert className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-400 font-semibold">QR Unavailable</p>
              <p className="text-slate-500 dark:text-gray-400 text-sm">{error}</p>
            </div>
          )}

          {!isLoading && qrData && (
            <>
              {/* Already Attended Banner */}
              {qrData.status === 'attended' && (
                <div className="w-full flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-emerald-400 text-sm font-semibold">You have already been checked in!</p>
                </div>
              )}

              {/* QR Code */}
              <div
                ref={canvasRef}
                className={`p-4 bg-white rounded-2xl shadow-inner ${qrData.status === 'attended' ? 'opacity-50' : ''}`}
              >
                <QRCodeCanvas
                  value={qrData.qrPayload}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#0a0f1a"
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: '/sau-logo.png',
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>

              <p className="text-xs text-slate-400 dark:text-gray-500 mt-4 text-center max-w-[220px]">
                Show this QR code to the organizer at the door to register your attendance.
              </p>

              {/* Payload debug (small) */}
              <p className="text-[10px] text-gray-700 mt-2 font-mono break-all text-center max-w-[260px]">
                {qrData.qrPayload}
              </p>

              {/* Download button */}
              {qrData.status !== 'attended' && (
                <button
                  onClick={handleDownload}
                  className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-electric-500/10 border border-electric-500/20 text-electric-400 rounded-xl font-semibold text-sm hover:bg-electric-500/20 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Save QR as Image
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
