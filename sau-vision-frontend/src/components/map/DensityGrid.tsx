import React from 'react';
import type { Room } from '../../types';
import RoomTile from './RoomTile';

interface DensityGridProps {
  rooms: Room[];
  onBook?: (room: Room) => void;
}

export default function DensityGrid({ rooms, onBook }: DensityGridProps) {
  if (rooms.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No rooms found matching your criteria.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
      {rooms.map((room) => (
        <RoomTile key={room.id} room={room} onBook={onBook} />
      ))}
    </div>
  );
}
