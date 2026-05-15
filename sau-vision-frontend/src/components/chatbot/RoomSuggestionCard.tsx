import React, { useState } from 'react';
import type { Room } from '../../types';
import { Users, Monitor, Calendar, Clock, ArrowRight, Loader2 } from 'lucide-react';

interface RoomSuggestionCardProps {
  room: Room;
  date: string;
  time: string;
  onBook: (roomId: string) => Promise<void>;
}

export default function RoomSuggestionCard({ room, date, time, onBook }: RoomSuggestionCardProps) {
  const [isBooking, setIsBooking] = useState(false);

  const handleBook = async () => {
    setIsBooking(true);
    await onBook(room.id);
    setIsBooking(false);
  };

  return (
    <div className="w-full max-w-sm bg-navy-800/80 border border-white/10 rounded-xl overflow-hidden mt-2">
      <div className="p-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-white text-lg leading-tight">{room.name}</h4>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Available
          </span>
        </div>
        <p className="text-xs text-gray-400">{room.location}</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Intent details matched */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
          <div className="flex items-center gap-2 bg-navy-900 px-2 py-1.5 rounded-md">
            <Calendar className="w-3.5 h-3.5 text-electric-400" /> {date}
          </div>
          <div className="flex items-center gap-2 bg-navy-900 px-2 py-1.5 rounded-md">
            <Clock className="w-3.5 h-3.5 text-electric-400" /> {time}
          </div>
          <div className="flex items-center gap-2 bg-navy-900 px-2 py-1.5 rounded-md">
            <Users className="w-3.5 h-3.5 text-electric-400" /> Up to {room.capacity}
          </div>
          <div className="flex items-center gap-2 bg-navy-900 px-2 py-1.5 rounded-md truncate">
            <Monitor className="w-3.5 h-3.5 text-electric-400" /> {room.hardware[0] || 'Standard'}
          </div>
        </div>

        <button
          onClick={handleBook}
          disabled={isBooking}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-electric-600 hover:bg-electric-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBooking ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
          ) : (
            <>Book This Room <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}

