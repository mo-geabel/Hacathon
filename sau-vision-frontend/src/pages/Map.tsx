import React, { useState, useEffect } from 'react';
import DensityGrid from '../components/map/DensityGrid';
import OccupancyLegend from '../components/map/OccupancyLegend';
import { mockRooms } from '../lib/mockData';
import type { Room } from '../types';
import { socketService } from '../lib/socket';
import { Search, Filter } from 'lucide-react';

export default function MapPage() {
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // In a real app, we would fetch initial state from API here
    // const fetchRooms = async () => { ... }

    const socket = socketService.connect();

    // Listen for real-time occupancy updates
    socket.on('occupancy_update', (event: { roomId: string, percent: number }) => {
      setRooms(prevRooms => 
        prevRooms.map(room => 
          room.id === event.roomId 
            ? { 
                ...room, 
                occupancyPercent: event.percent,
                status: event.percent > 0 ? 'occupied' : 'available'
              } 
            : room
        )
      );
    });

    // Simulate random real-time updates for demonstration purposes
    const simInterval = setInterval(() => {
      const randomRoomIndex = Math.floor(Math.random() * mockRooms.length);
      const roomId = mockRooms[randomRoomIndex].id;
      // Skip maintenance rooms
      if (mockRooms[randomRoomIndex].status === 'maintenance') return;
      
      const newPercent = Math.floor(Math.random() * 100);
      
      // Simulate receiving an event from the backend
      socket.emit('occupancy_update', { roomId, percent: newPercent });
      // In local dev without backend, we just update state directly
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, occupancyPercent: newPercent } : r));
      
    }, 3000);

    return () => {
      socket.off('occupancy_update');
      clearInterval(simInterval);
    };
  }, []);

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.hardware.some(hw => hw.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-navy-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Campus Density Map</h1>
            <p className="text-gray-400">Real-time occupancy tracking via IoT vision</p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search rooms or hardware..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 bg-navy-800 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric-500 transition-all"
              />
            </div>
            <button className="btn-ghost flex items-center justify-center gap-2">
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
        </div>

        <div className="mb-8">
          <OccupancyLegend />
        </div>

        <DensityGrid rooms={filteredRooms} />
        
      </div>
    </div>
  );
}

