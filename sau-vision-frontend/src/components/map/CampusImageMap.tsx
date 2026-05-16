import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import type { CampusEvent, Room, Booking } from '../../types';
import EventFormModal from './EventFormModal';
import api from '../../lib/api';
import { Trash2, Info } from 'lucide-react';

// ── Sakarya University center coordinate ──────────────────────────────────────
const SAU_CENTER: [number, number] = [40.7419, 30.3262];

// ── Category color map ────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<CampusEvent['category'], string> = {
  academic: '#3b82f6',  // blue
  sports: '#10b981',    // emerald
  social: '#a855f7',    // purple
  other: '#f97316',     // orange
};

// ── Inner component that captures click events ────────────────────────────────
function MapClickHandler({ enabled, onMapClick }: { enabled: boolean; onMapClick: (x: number, y: number) => void }) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onMapClick(e.latlng.lng, e.latlng.lat); // real lng=X, lat=Y
    },
  });
  return null;
}

// ── Helper: Occupancy color ───────────────────────────────────────────────────
const getOccupancyColor = (percent: number) => {
  if (percent < 30) return '#10b981'; // Emerald/Green
  if (percent < 70) return '#eab308'; // Yellow
  return '#ef4444'; // Red
};

// ── Helper: Custom Faculty Icon ───────────────────────────────────────────────
const getFacultyIcon = (color: string) => {
  const html = `
    <div style="background-color: ${color};" class="w-10 h-10 rounded-xl shadow-lg border-2 border-white flex items-center justify-center text-white transform transition-transform hover:scale-110">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
        <path d="M9 22v-4h6v4"></path>
        <path d="M8 6h.01"></path>
        <path d="M16 6h.01"></path>
        <path d="M12 6h.01"></path>
        <path d="M12 10h.01"></path>
        <path d="M12 14h.01"></path>
        <path d="M16 10h.01"></path>
        <path d="M16 14h.01"></path>
        <path d="M8 10h.01"></path>
        <path d="M8 14h.01"></path>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'bg-transparent border-none',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -42],
  });
};

// ── Helper: Custom Room Icon (Supports Pulse) ─────────────────────────────────
const getRoomIcon = (color: string, isActive: boolean) => {
  const html = `
    <div class="relative w-5 h-5 flex items-center justify-center">
      ${isActive ? `<span class="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style="background-color: ${color};"></span>` : ''}
      <span class="relative inline-flex rounded-full w-3.5 h-3.5 border-2 border-white shadow-sm" style="background-color: ${color};"></span>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'bg-transparent border-none',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

// ── Main Component ────────────────────────────────────────────────────────────
interface CampusImageMapProps {
  enableEventMode: boolean;
  rooms?: Room[];
  selectedFacultyId?: string | null;
  onFacultySelect?: (facultyId: string) => void;
  onClearFaculty?: () => void;
  onRoomClick?: (room: Room) => void;
}

export default function CampusImageMap({ 
  enableEventMode, 
  rooms = [], 
  selectedFacultyId,
  onFacultySelect,
  onClearFaculty,
  onRoomClick 
}: CampusImageMapProps) {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Group rooms into faculties
  const faculties = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; lat: number; lng: number; rooms: Room[]; avgOccupancy: number }>();
    
    rooms.forEach(room => {
      const fId = room.facultyId || 'unknown';
      const fName = room.facultyName || 'Unknown Faculty';
      if (!map.has(fId)) {
        map.set(fId, {
          id: fId,
          name: fName,
          lat: room.lat || SAU_CENTER[0],
          lng: room.lng || SAU_CENTER[1],
          rooms: [],
          avgOccupancy: 0,
        });
      }
      map.get(fId)!.rooms.push(room);
    });

    return Array.from(map.values()).map(f => {
      const totalOcc = f.rooms.reduce((acc, r) => acc + r.occupancyPercent, 0);
      f.avgOccupancy = f.rooms.length > 0 ? Math.round(totalOcc / f.rooms.length) : 0;
      return f;
    });
  }, [rooms]);

  // Fetch events from backend on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data } = await api.get('/events');
        setEvents(data.map((e: any) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          date: e.date,
          category: e.category,
          mapX: e.mapX,
          mapY: e.mapY,
        })));
      } catch (err) {
        console.error('Failed to fetch campus events', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleMapClick = (x: number, y: number) => {
    setPendingPin({ x, y });
  };

  const handleSubmitEvent = async (data: Omit<CampusEvent, 'id'>) => {
    const { data: created } = await api.post('/events', {
      title: data.title,
      description: data.description,
      date: data.date,
      category: data.category,
      mapX: data.mapX,
      mapY: data.mapY,
    });
    setEvents(prev => [...prev, {
      id: created.id,
      title: created.title,
      description: created.description,
      date: created.date,
      category: created.category,
      mapX: created.mapX,
      mapY: created.mapY,
    }]);
    setPendingPin(null);
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await api.delete(`/events/${id}`);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete event', err);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Hint overlay when event mode is on */}
      {enableEventMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-4 py-2 rounded-full bg-electric-500/20 border border-electric-500/30 text-electric-300 text-xs backdrop-blur-sm pointer-events-none">
          <Info className="w-3.5 h-3.5" />
          Click anywhere on the campus to pin an event
        </div>
      )}

      {/* Back to Faculties Overlay */}
      {selectedFacultyId && (
        <div className="absolute top-3 left-3 z-[1000]">
          <button
            onClick={() => onClearFaculty?.()}
            className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg text-sm font-medium text-gray-700 hover:bg-white border border-gray-200 transition-colors"
          >
            ← Back to Faculties
          </button>
        </div>
      )}

      <MapContainer
        center={SAU_CENTER}
        zoom={15}
        style={{ height: '100%', width: '100%', background: '#ffffff' }}
        scrollWheelZoom
        className={enableEventMode ? 'cursor-crosshair z-0' : 'z-0'}
      >
        {/* Real Map Tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Click handler */}
        <MapClickHandler enabled={enableEventMode} onMapClick={handleMapClick} />

        {/* Event markers from DB */}
        {events.map(event => (
          <CircleMarker
            key={`event-${event.id}`}
            center={[event.mapY, event.mapX]}
            radius={8}
            pathOptions={{
              fillColor: CATEGORY_COLORS[event.category],
              fillOpacity: 0.9,
              color: '#ffffff',
              weight: 2,
            }}
          >
            <Popup>
              <div className="min-w-[180px] p-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 text-base leading-tight">{event.title}</h3>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="ml-2 p-1 text-red-400 hover:text-red-600 transition-colors rounded"
                    title="Remove marker"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {event.description && (
                  <p className="text-xs text-gray-500 mb-2">{event.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">📅 {event.date}</span>
                  <span
                    className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: CATEGORY_COLORS[event.category] }}
                  >
                    {event.category}
                  </span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Faculty markers */}
        {!selectedFacultyId && faculties.map((faculty) => {
          const color = getOccupancyColor(faculty.avgOccupancy);
          return (
            <Marker
              key={`faculty-${faculty.id}`}
              position={[faculty.lat, faculty.lng]}
              icon={getFacultyIcon(color)}
              eventHandlers={{
                click: () => onFacultySelect?.(faculty.id)
              }}
            >
              <Popup>
                <div className="min-w-[150px] p-1 text-center">
                  <h3 className="font-bold text-gray-900 text-base mb-1">{faculty.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{faculty.rooms.length} Labs Available</p>
                  
                  <div className="flex justify-between items-center mb-3 text-xs bg-gray-50 p-1.5 rounded">
                    <span className="text-gray-600 font-medium">Avg Occupancy</span>
                    <span style={{ color }} className="font-bold">{faculty.avgOccupancy}%</span>
                  </div>

                  <button
                    onClick={() => onFacultySelect?.(faculty.id)}
                    className="w-full py-1.5 bg-electric-600 hover:bg-electric-700 text-white text-xs font-medium rounded-md transition-colors"
                  >
                    View Labs
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Room markers for selected faculty */}
        {selectedFacultyId && rooms.filter(r => (r.facultyId || 'unknown') === selectedFacultyId).map((room, i) => {
          // Add a tiny deterministic jitter so rooms in the same faculty don't overlap completely
          const jitterLat = (room.lat || SAU_CENTER[0]) + (Math.sin(i * 100) * 0.0004);
          const jitterLng = (room.lng || SAU_CENTER[1]) + (Math.cos(i * 100) * 0.0004);
          const color = getOccupancyColor(room.occupancyPercent);
          
          const activeBookings = room.bookings?.filter(b => b.status === 'active') || [];
          const upcomingBookings = room.bookings?.filter(b => b.status === 'approved' && new Date(b.scheduledStart) > new Date()) || [];
          const hasActiveBooking = activeBookings.length > 0;
          
          return (
            <Marker
              key={`room-${room.id}`}
              position={[jitterLat, jitterLng]}
              icon={getRoomIcon(color, hasActiveBooking)}
            >
              <Popup>
                <div className="min-w-[200px] p-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1">{room.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{room.location}</p>
                  
                  <div className="flex justify-between items-center mb-3 text-sm border-b pb-2 border-gray-100">
                    <span className="text-gray-600 font-medium">Occupancy</span>
                    <span style={{ color }} className="font-bold">{room.occupancyPercent}%</span>
                  </div>
                  
                  {/* Schedule Section */}
                  <div className="mb-3 space-y-2">
                    {activeBookings.length > 0 && activeBookings.map(b => (
                      <div key={b.id} className="text-xs bg-emerald-50 text-emerald-700 p-1.5 rounded border border-emerald-200">
                        <span className="font-bold">🔴 Live Now:</span> {b.title} <br/>
                        <span className="text-[10px] opacity-80">Ends at {new Date(b.scheduledEnd).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    ))}
                    {upcomingBookings.length > 0 && upcomingBookings.slice(0, 2).map(b => (
                      <div key={b.id} className="text-xs bg-gray-50 text-gray-700 p-1.5 rounded border border-gray-200">
                        <span className="font-bold">⏳ Upcoming:</span> {b.title} <br/>
                        <span className="text-[10px] opacity-80">{new Date(b.scheduledStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    ))}
                    {activeBookings.length === 0 && upcomingBookings.length === 0 && (
                      <div className="text-xs text-gray-400 italic">No scheduled events today.</div>
                    )}
                  </div>
                  
                  {onRoomClick && (
                    <button
                      onClick={() => onRoomClick(room)}
                      className="w-full py-1.5 bg-electric-600 hover:bg-electric-700 text-white text-xs font-medium rounded-md transition-colors"
                    >
                      Book Room
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Pending pin (preview while modal is open) */}
        {pendingPin && (
          <CircleMarker
            center={[pendingPin.y, pendingPin.x]}
            radius={10}
            pathOptions={{
              fillColor: '#ffffff',
              fillOpacity: 0.5,
              color: '#3b82f6',
              weight: 2,
              dashArray: '4',
            }}
          />
        )}
      </MapContainer>

      {/* Event Form Modal */}
      {pendingPin && (
        <EventFormModal
          mapX={pendingPin.x}
          mapY={pendingPin.y}
          onSubmit={handleSubmitEvent}
          onCancel={() => setPendingPin(null)}
        />
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-navy-900/60 backdrop-blur-sm rounded-xl">
          <div className="text-sm text-gray-400">Loading campus events...</div>
        </div>
      )}

      {/* Leaflet popup custom styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-popup-content-wrapper {
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
        }
        .leaflet-popup-content { margin: 12px; }
        .leaflet-container a.leaflet-popup-close-button { padding: 6px; color: #6b7280; }
        .cursor-crosshair { cursor: crosshair !important; }
      `}} />
    </div>
  );
}
