import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Users, MapPin, Calendar, QrCode } from 'lucide-react';

interface Props {
  bookingId: string;
  eventTitle: string;
  labName?: string;
  scheduledStart?: string;
  onClose: () => void;
}

export default function EventQrModal({ bookingId, eventTitle, labName, scheduledStart, onClose }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // The QR encodes the public join URL — guests scan this with any camera app
  const joinUrl = `${window.location.origin}/join/${bookingId}`;

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `sau-event-qr-${bookingId.slice(0, 8)}.png`;
    link.href = url;
    link.click();
  };

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
            <p className="text-xs text-electric-400 font-semibold uppercase tracking-widest mb-1">
              Event Check-In QR
            </p>
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
          {/* Event details */}
          {(labName || scheduledStart) && (
            <div className="w-full space-y-2 mb-5">
              {labName && (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
                  <MapPin className="w-4 h-4 text-electric-400 shrink-0" />
                  <span>{labName}</span>
                </div>
              )}
              {scheduledStart && (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4 text-slate-400 dark:text-gray-500 shrink-0" />
                  <span>
                    {new Date(scheduledStart).toLocaleString([], {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Instruction banner */}
          <div className="w-full bg-electric-500/10 border border-electric-500/20 rounded-xl px-4 py-3 mb-5 text-center">
            <p className="text-electric-400 text-xs font-semibold">
              📷 Display this QR code at the venue entrance
            </p>
            <p className="text-slate-500 dark:text-gray-400 text-xs mt-1">
              Guests scan with their phone camera to self-register &amp; mark attendance
            </p>
          </div>

          {/* QR Code */}
          <div ref={canvasRef} className="p-4 bg-white rounded-2xl shadow-inner">
            <QRCodeCanvas
              value={joinUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#0a0f1a"
              level="H"
              includeMargin={false}
            />
          </div>

          {/* URL preview */}
          <p className="text-[10px] text-gray-600 mt-3 font-mono break-all text-center max-w-[260px]">
            {joinUrl}
          </p>

          {/* Actions */}
          <div className="w-full mt-5 space-y-3">
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 py-3 bg-electric-500/10 border border-electric-500/20 text-electric-400 rounded-xl font-semibold text-sm hover:bg-electric-500/20 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download QR as Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
