import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Calendar, MapPin, Users, Award, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EventData {
  id: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  requiresCertificate: boolean;
  expectedAttendees: number;
  attendeeCount: number;
  isRegistered: boolean;
  lab: {
    id: string;
    name: string;
    faculty: string;
  };
  organizer: string;
}

export default function EventsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'certified' | 'joined'>('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await api.get('/bookings/events');
      setEvents(data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (eventId: string) => {
    setJoiningId(eventId);
    try {
      await api.post(`/registrations/${eventId}`);
      // Optimistic update
      setEvents(events.map(e => e.id === eventId ? { ...e, isRegistered: true, attendeeCount: e.attendeeCount + 1 } : e));
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to join event");
    } finally {
      setJoiningId(null);
    }
  };

  const filteredEvents = events.filter(e => {
    if (filter === 'certified') return e.requiresCertificate;
    if (filter === 'joined') return e.isRegistered;
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="flex items-center gap-3 text-electric-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Loading events...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 min-h-screen animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Approved Events</h1>
          <p className="text-gray-400 max-w-xl text-lg">
            Discover and join academic workshops, study groups, and certified laboratory sessions across the university.
          </p>
        </div>

        <div className="flex bg-[#0d1829] border border-white/10 p-1 rounded-xl">
          {(['all', 'certified', 'joined'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                filter === f 
                  ? f === 'certified' 
                    ? 'bg-amber-500/20 text-amber-400' 
                    : 'bg-electric-500/20 text-electric-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-20 bg-[#0d1829] border border-white/5 rounded-3xl">
          <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">No events found</h3>
          <p className="text-gray-500 mt-2">Try changing your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => {
            const start = new Date(event.scheduledStart);
            const end = new Date(event.scheduledEnd);
            const isFull = event.attendeeCount >= event.expectedAttendees;

            return (
              <div key={event.id} className="group flex flex-col bg-[#0d1829] border border-white/10 rounded-2xl overflow-hidden hover:border-electric-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] relative">
                
                {/* Certified Badge */}
                {event.requiresCertificate && (
                  <div className="absolute top-4 right-4 z-10 bg-amber-500/90 text-navy-900 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
                    <Award className="w-3.5 h-3.5" />
                    CERTIFIED
                  </div>
                )}

                <div className="p-6 flex-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-electric-400 mb-4 bg-electric-500/10 w-fit px-3 py-1 rounded-full border border-electric-500/20">
                    <MapPin className="w-3 h-3" />
                    {event.lab.name} ({event.lab.faculty})
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-electric-400 transition-colors">
                    {event.title}
                  </h3>
                  
                  <p className="text-gray-400 text-sm mb-6 line-clamp-2 min-h-[40px]">
                    {event.description || "Join this academic session hosted by " + event.organizer + "."}
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                        <Calendar className="w-4 h-4 text-electric-400" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Date & Time</div>
                        <div className="font-medium">
                          {start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} • {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                        <Users className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Attendees</span>
                          <span className="font-medium">{event.attendeeCount} / {event.expectedAttendees}</span>
                        </div>
                        <div className="h-1.5 w-full bg-navy-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min((event.attendeeCount / event.expectedAttendees) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 mt-auto">
                  {event.isRegistered ? (
                    <div className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      You're Attending
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleJoin(event.id)}
                      disabled={isFull || joiningId === event.id}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                        isFull 
                          ? 'bg-navy-800 text-gray-500 cursor-not-allowed border border-white/5' 
                          : 'bg-white text-navy-900 hover:bg-electric-400 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                      }`}
                    >
                      {joiningId === event.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : isFull ? (
                        'Event Full'
                      ) : (
                        <>Join Event <ChevronRight className="w-4 h-4" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
