import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { cn } from '../../lib/utils';
import CountdownTimer from './CountdownTimer';

interface UrgentModalProps {
  isOpen: boolean;
  minutesLeft: number;
  bookingId: string;
}

export default function UrgentModal({ isOpen, minutesLeft, bookingId }: UrgentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/90 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0 bg-red-500/10 animate-pulse-slow pointer-events-none" />
      
      <div className="bg-navy-800 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center relative z-10 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-slide-up">
        
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <AlertOctagon className="w-10 h-10 text-red-500" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Room is Empty!</h2>
        <p className="text-gray-300 mb-8">
          Our vision system detects no one in the room. Scan your QR code at the door within the next:
        </p>

        <div className="text-red-400 mb-8">
          <CountdownTimer minutes={minutesLeft} />
        </div>

        <p className="text-sm text-gray-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
          If you do not check in, booking <strong>{bookingId}</strong> will be automatically released so others can use the room.
        </p>

      </div>
    </div>
  );
}

