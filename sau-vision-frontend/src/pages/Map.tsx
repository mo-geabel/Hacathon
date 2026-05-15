import React, { useState, useEffect } from 'react';
import DensityGrid from '../components/map/DensityGrid';
import OccupancyLegend from '../components/map/OccupancyLegend';
import CampusMap from '../components/map/CampusMap';
import type { Room } from '../types';
import api from '../lib/api';
import { Search, Filter, MapPin, Grid } from 'lucide-react';

export default function MapPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'grid'>('both');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await api.get('/labs');
        const labs = response.data;
        const mappedRooms: Room[] = labs.map((lab: any) => ({
          id: lab.id,
          name: lab.name,
          capacity: lab.capacity,
          hardware: lab.aiTags || [],
          status: lab.status,
          occupancyPercent: lab.capacity > 0 ? Math.round((lab.currentOccupancy / lab.capacity) * 100) : 0,
          location: `${lab.faculty?.name || 'Unknown Faculty'}, Floor ${lab.floor}, Room ${lab.roomNumber}`,
          lat: lab.faculty?.latitude || 40.7437,
          lng: lab.faculty?.longitude || 30.3330,
        }));
        setRooms(mappedRooms);
      } catch (error) {
        console.error('Failed to fetch labs occupancy:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchRooms();

    // Poll every 5 seconds for real-time updates
    const pollInterval = setInterval(fetchRooms, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.hardware.some(hw => hw.toLowerCase().includes(searchQuery.toLowerCase())) ||
    room.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-navy-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Campus Density Map</h1>
            <p className="text-gray-400">Real-time occupancy tracking via IoT vision</p>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-4">
            
            {/* View Toggle */}
            <div className="flex bg-navy-800 p-1 rounded-lg border border-white/5 w-full sm:w-auto">
              <button 
                onClick={() => setViewMode('both')}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'both' ? 'bg-electric-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Split
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'map' ? 'bg-electric-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <MapPin className="w-3.5 h-3.5" /> Map
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'grid' ? 'bg-electric-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Grid className="w-3.5 h-3.5" /> Grid
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search rooms..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-navy-800 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric-500 transition-all"
              />
            </div>
            <button className="btn-ghost flex items-center justify-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
        </div>

        <div className="mb-6">
          <OccupancyLegend />
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {(viewMode === 'both' || viewMode === 'map') && (
            <div className="h-[500px] lg:h-[600px] w-full animate-fade-in relative z-0">
              <CampusMap rooms={filteredRooms} />
            </div>
          )}

          {(viewMode === 'both' || viewMode === 'grid') && (
            <div className="animate-fade-in">
              {viewMode === 'both' && (
                <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">Room Details</h2>
              )}
              <DensityGrid rooms={filteredRooms} />
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}

