import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  ImageOverlay,
  CircleMarker,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import { CRS, type LatLngBoundsExpression } from 'leaflet';
import type { CampusEvent } from '../../types';
import EventFormModal from './EventFormModal';
import api from '../../lib/api';
import { Trash2, Info } from 'lucide-react';

// ── Campus image dimensions (adjust if your image is different) ──────────────
const IMAGE_WIDTH = 1040;
const IMAGE_HEIGHT = 530;
const BOUNDS: LatLngBoundsExpression = [[0, 0], [IMAGE_HEIGHT, IMAGE_WIDTH]];

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
      onMapClick(e.latlng.lng, e.latlng.lat); // CRS.Simple: lng=X, lat=Y
    },
  });
  return null;
}

// ── Main Component ────────────────────────────────────────────────────────────
interface CampusImageMapProps {
  enableEventMode: boolean;
}

export default function CampusImageMap({ enableEventMode }: CampusImageMapProps) {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

      <MapContainer
        crs={CRS.Simple}
        bounds={BOUNDS}
        style={{ height: '100%', width: '100%', background: '#0a1628' }}
        maxBounds={BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={-1}
        maxZoom={2}
        scrollWheelZoom
        className={enableEventMode ? 'cursor-crosshair' : ''}
      >
        {/* Campus image as base layer */}
        <ImageOverlay
          url="/images/campus-map.jpg"
          bounds={BOUNDS}
          opacity={1}
        />

        {/* Click handler */}
        <MapClickHandler enabled={enableEventMode} onMapClick={handleMapClick} />

        {/* Event markers from DB */}
        {events.map(event => (
          <CircleMarker
            key={event.id}
            center={[event.mapY, event.mapX]}
            radius={10}
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
