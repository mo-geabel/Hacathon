import React, { useState, useEffect } from 'react';
import DensityGrid from '../components/map/DensityGrid';
import OccupancyLegend from '../components/map/OccupancyLegend';
import CampusImageMap from '../components/map/CampusImageMap';
import BookingFormModal from '../components/map/BookingFormModal';
import type { Room } from '../types';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, Grid, PlusCircle, X, Lock } from 'lucide-react';

export default function MapPage() {
  const { isAuthenticated } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'grid'>('both');
  const [isLoading, setIsLoading] = useState(true);
  const [eventMode, setEventMode] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // If user logs out while event mode is active, turn it off
  useEffect(() => {
    if (!isAuthenticated) setEventMode(false);
  }, [isAuthenticated]);

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

    fetchRooms();
    const pollInterval = setInterval(fetchRooms, 5000);
    return () => clearInterval(pollInterval);
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
            <h1 className="text-3xl font-bold text-white mb-2">Campus Map</h1>
            <p className="text-gray-400">Live occupancy & campus events — click to explore</p>
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

            {/* Pin Event — only visible to authenticated users */}
            {isAuthenticated ? (
              <button
                id="pin-event-btn"
                onClick={() => setEventMode(prev => !prev)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  eventMode
                    ? 'bg-electric-500/20 text-electric-300 border-electric-500/30 ring-1 ring-electric-500/40'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                {eventMode ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                {eventMode ? 'Cancel Pin' : 'Pin Event'}
              </button>
            ) : (
              /* Unauthenticated users see a disabled button prompting sign-in */
              <Link
                to="/login?returnTo=/map"
                id="pin-event-login-prompt"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-white/5 text-gray-500 border-white/10 hover:bg-electric-500/10 hover:text-electric-400 hover:border-electric-500/30 transition-all"
                title="Sign in to pin events"
              >
                <Lock className="w-4 h-4" />
                Sign in to Pin
              </Link>
            )}

            {/* Search */}
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

        {/* Legend Row */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <OccupancyLegend />
          <div className="flex items-center gap-3 ml-auto">
            {[
              { cat: 'Academic', color: '#3b82f6' },
              { cat: 'Sports', color: '#10b981' },
              { cat: 'Social', color: '#a855f7' },
              { cat: 'Other', color: '#f97316' },
            ].map(({ cat, color }) => (
              <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {cat}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {(viewMode === 'both' || viewMode === 'map') && (
            <div className="h-[500px] lg:h-[600px] w-full animate-fade-in relative z-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
              {/* enableEventMode is always false for unauthenticated users (enforced above) */}
              <CampusImageMap enableEventMode={eventMode} />
            </div>
          )}

          {(viewMode === 'both' || viewMode === 'grid') && (
            <div className="animate-fade-in">
              {viewMode === 'both' && (
                <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">Room Details</h2>
              )}
              <DensityGrid
                rooms={filteredRooms}
                onBook={isAuthenticated ? (room) => setSelectedRoom(room) : undefined}
              />
            </div>
          )}
        </div>

      </div>

      {/* Booking Modal */}
      {selectedRoom && isAuthenticated && (
        <BookingFormModal
          lab={{
            id: selectedRoom.id,
            name: selectedRoom.name,
            capacity: selectedRoom.capacity,
            location: selectedRoom.location,
            hardware: selectedRoom.hardware,
          }}
          onClose={() => setSelectedRoom(null)}
          onSuccess={() => setSelectedRoom(null)}
        />
      )}
    </div>
  );
}
