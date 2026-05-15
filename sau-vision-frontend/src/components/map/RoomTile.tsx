import React from 'react';
import type { Room } from '../../types';
import { Users, Monitor, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RoomTileProps {
  room: Room;
}

export default function RoomTile({ room }: RoomTileProps) {
  // Determine status color based on occupancy
  let statusClass = 'status-green';
  if (room.status === 'maintenance') {
    statusClass = 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  } else if (room.occupancyPercent > 70) {
    statusClass = 'status-red';
  } else if (room.occupancyPercent > 40) {
    statusClass = 'status-yellow';
  }

  return (
    <div className={cn(
      "glass-card p-5 transition-all duration-300 hover:scale-[1.02]",
      room.status === 'maintenance' && "opacity-60 grayscale"
    )}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{room.name}</h3>
          <p className="text-xs text-gray-400">{room.location}</p>
        </div>
        <div className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", statusClass)}>
          {room.status === 'maintenance' ? 'Maintenance' : `${room.occupancyPercent}%`}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Users className="w-4 h-4 text-electric-400" />
          <span>Capacity: {room.capacity}</span>
        </div>
        
        <div className="flex items-start gap-2 text-sm text-gray-300">
          <Monitor className="w-4 h-4 text-electric-400 mt-0.5 shrink-0" />
          <div className="flex flex-wrap gap-1">
            {room.hardware.map((hw, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-white/5 rounded text-xs border border-white/10">
                {hw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {room.status !== 'maintenance' && (
        <div className="mt-5 relative h-1.5 w-full bg-navy-800 rounded-full overflow-hidden">
          <div 
            className={cn(
              "absolute top-0 left-0 h-full transition-all duration-1000",
              room.occupancyPercent > 70 ? "bg-red-500" :
              room.occupancyPercent > 40 ? "bg-amber-500" : "bg-emerald-500"
            )}
            style={{ width: `${room.occupancyPercent}%` }}
          />
        </div>
      )}

      {room.status === 'maintenance' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 bg-gray-900/50 py-2 rounded-lg border border-gray-700/50">
          <ShieldAlert className="w-4 h-4" /> Unavailable
        </div>
      )}
    </div>
  );
}

