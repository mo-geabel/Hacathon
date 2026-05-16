import React from 'react';
import type { Room } from '../../types';
import { Users, Monitor, ShieldAlert, CalendarPlus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RoomTileProps {
  room: Room;
  /** If provided, shows a "Book" button — only shown when user is authenticated */
  onBook?: (room: Room) => void;
}

export default function RoomTile({ room, onBook }: RoomTileProps) {
  const isMaintenance = room.status === 'maintenance';
  const isOccupied    = room.status === 'occupied';
  const isBookable    = !isMaintenance && !isOccupied && !!onBook;

  let statusClass = 'status-green';
  if (isMaintenance) {
    statusClass = 'bg-gray-500/20 text-slate-500 dark:text-gray-400 border-gray-500/30';
  } else if (room.occupancyPercent > 70 || isOccupied) {
    statusClass = 'status-red';
  } else if (room.occupancyPercent > 40) {
    statusClass = 'status-yellow';
  }

  const statusLabel = isMaintenance
    ? 'Maintenance'
    : isOccupied
    ? 'Occupied'
    : `${room.occupancyPercent}%`;

  return (
    <div className={cn(
      'glass-card p-5 transition-all duration-300 hover:scale-[1.02] flex flex-col',
      isMaintenance && 'opacity-60 grayscale'
    )}>
      {/* Top Row */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-lg font-bold text-foreground leading-tight">{room.name}</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 truncate mt-0.5">{room.location}</p>
        </div>
        <div className={cn('px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0', statusClass)}>
          {statusLabel}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
          <Users className="w-4 h-4 text-electric-400 shrink-0" />
          <span>Capacity: <span className="text-foreground font-medium">{room.capacity}</span></span>
        </div>

        <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-gray-300">
          <Monitor className="w-4 h-4 text-electric-400 mt-0.5 shrink-0" />
          <div className="flex flex-wrap gap-1">
            {room.hardware.length > 0
              ? room.hardware.slice(0, 3).map((hw, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-xs border border-border">
                    {hw}
                  </span>
                ))
              : <span className="text-slate-400 dark:text-gray-500 text-xs">No tags</span>
            }
            {room.hardware.length > 3 && (
              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-xs border border-border text-slate-500 dark:text-gray-400">
                +{room.hardware.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {!isMaintenance && (
        <div className="mt-4 mb-3 relative h-1.5 w-full bg-white dark:bg-navy-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'absolute top-0 left-0 h-full transition-all duration-1000',
              room.occupancyPercent > 70 ? 'bg-red-500' :
              room.occupancyPercent > 40 ? 'bg-amber-500' : 'bg-emerald-500'
            )}
            style={{ width: `${room.occupancyPercent}%` }}
          />
        </div>
      )}

      {/* Bottom — Book button or Unavailable notice */}
      {isMaintenance ? (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-gray-400 bg-gray-900/50 py-2 rounded-lg border border-gray-700/50">
          <ShieldAlert className="w-4 h-4" /> Unavailable
        </div>
      ) : isOccupied ? (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-red-400 bg-red-500/10 py-2 rounded-lg border border-red-500/20">
          Currently Occupied
        </div>
      ) : onBook ? (
        <button
          id={`book-room-${room.id}`}
          onClick={() => onBook(room)}
          className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-electric-600/20 hover:bg-electric-600/40 text-electric-300 hover:text-foreground border border-electric-500/30 hover:border-electric-500/60 text-sm font-medium transition-all"
        >
          <CalendarPlus className="w-4 h-4" /> Book This Room
        </button>
      ) : null}
    </div>
  );
}
