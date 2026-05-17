import React, { useState, useEffect } from 'react';
import DensityGrid from '../components/map/DensityGrid';
import OccupancyLegend from '../components/map/OccupancyLegend';
import CampusImageMap from '../components/map/CampusImageMap';
import BookingFormModal from '../components/map/BookingFormModal';
import AppSidebar from '../components/shared/AppSidebar';
import type { Room } from '../types';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, MapPin, Grid, PlusCircle, X, Lock } from 'lucide-react';

export default function MapPage() {
  const { isAuthenticated } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'grid'>('both');
  const [isLoading, setIsLoading] = useState(true);
  const [eventMode, setEventMode] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);

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
          facultyName: lab.faculty?.name || 'Unknown Faculty',
          facultyId: lab.faculty?.id,
          bookings: lab.bookings || [],
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

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.hardware.some(hw => hw.toLowerCase().includes(searchQuery.toLowerCase())) ||
      room.location.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesFaculty = selectedFacultyId ? (room.facultyId || 'unknown') === selectedFacultyId : true;
    
    return matchesSearch && matchesFaculty;
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-navy-900 flex flex-col md:flex-row">
      <AppSidebar activeView="map" />

      <main className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-8 py-8">

          {/* Header Controls */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Campus Map</h1>
              <p className="text-slate-500 dark:text-gray-400 text-sm">Live occupancy &amp; campus events — click to explore</p>
            </div>

            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-navy-800 border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-electric-500 transition-all"
                />
              </div>
              <button className="btn-ghost flex items-center justify-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </div>
          </div>

          {/* Active Faculty Filter Indicator */}
          {selectedFacultyId && (
            <div className="mb-6 flex items-center justify-between bg-electric-500/10 border border-electric-500/20 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-electric-500/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-electric-400" />
                </div>
                <div>
                  <p className="text-sm text-electric-300 font-medium">Viewing labs for selected faculty</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">{filteredRooms.length} labs found</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFacultyId(null)}
                className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-foreground rounded-md transition-colors"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* Content Area */}
          <div className="space-y-8">
            {(viewMode === 'both' || viewMode === 'map') && (
              <div className="h-[480px] lg:h-[560px] w-full animate-fade-in relative z-0 rounded-xl overflow-hidden border border-border shadow-2xl">
                <CampusImageMap
                  enableEventMode={eventMode}
                  rooms={rooms}
                  searchQuery={searchQuery}
                  selectedFacultyId={selectedFacultyId}
                  onFacultySelect={(fid) => {
                    setSelectedFacultyId(fid);
                    if (viewMode === 'map') setViewMode('both');
                    setTimeout(() => window.scrollBy({ top: 400, behavior: 'smooth' }), 100);
                  }}
                  onRoomClick={isAuthenticated ? (room) => setSelectedRoom(room) : undefined}
                  onClearFaculty={() => setSelectedFacultyId(null)}
                />
              </div>
            )}

            {(viewMode === 'both' || viewMode === 'grid') && (
              <div className="animate-fade-in">
                {viewMode === 'both' && (
                  <h2 className="text-xl font-bold text-foreground mb-4 border-b border-border pb-2">Room Details</h2>
                )}
                <DensityGrid
                  rooms={filteredRooms}
                  onBook={isAuthenticated ? (room) => setSelectedRoom(room) : undefined}
                />
              </div>
            )}
          </div>

        </div>
      </main>

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

