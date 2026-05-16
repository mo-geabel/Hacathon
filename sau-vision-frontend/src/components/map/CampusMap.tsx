import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Users, Monitor, ArrowRight } from 'lucide-react';
import type { Room } from '../../types';

// Sakarya University Esentepe Campus approximate center
const CAMPUS_CENTER: [number, number] = [40.7432, 30.3336];

interface CampusMapProps {
  rooms: Room[];
}

export default function CampusMap({ rooms }: CampusMapProps) {
  // Determine color based on occupancy and status
  const getMarkerColor = (room: Room) => {
    if (room.status === 'maintenance') return '#6b7280'; // gray-500
    if (room.occupancyPercent > 70) return '#ef4444'; // red-500
    if (room.occupancyPercent > 40) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  return (
    <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-border shadow-2xl z-0 relative">
      <MapContainer 
        center={CAMPUS_CENTER} 
        zoom={16} 
        style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
        className="z-0"
      >
        {/* Dark mode friendly map tiles from CartoDB */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {rooms.map((room) => {
          if (!room.lat || !room.lng) return null;

          const color = getMarkerColor(room);

          return (
            <CircleMarker
              key={room.id}
              center={[room.lat, room.lng]}
              radius={12}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.8,
                color: '#ffffff', // white border
                weight: 2,
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[200px]">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{room.name}</h3>
                    <div 
                      className="px-2 py-0.5 rounded-full text-xs font-bold text-foreground"
                      style={{ backgroundColor: color }}
                    >
                      {room.status === 'maintenance' ? 'Maintenance' : `${room.occupancyPercent}%`}
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-400 dark:text-gray-500 mb-3">{room.location}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Cap: {room.capacity}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Monitor className="w-4 h-4 text-blue-600" />
                      <span className="truncate">{room.hardware[0] || 'Standard'}</span>
                    </div>
                  </div>

                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-foreground font-medium py-1.5 px-3 rounded text-sm transition-colors flex items-center justify-center gap-1">
                    Book Now <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      
      {/* Custom styles for Leaflet popups to match our dark theme slightly better */}
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper {
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        .leaflet-container a.leaflet-popup-close-button {
          padding: 6px;
          color: #6b7280;
        }
      `}} />
    </div>
  );
}
