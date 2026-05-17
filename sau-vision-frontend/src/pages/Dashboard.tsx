import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatWindow from '../components/chatbot/ChatWindow';
import DensityGrid from '../components/map/DensityGrid';
import EventQrModal from '../components/events/EventQrModal';
import BookingFormModal from '../components/map/BookingFormModal';
import AppSidebar from '../components/shared/AppSidebar';
import {
  Clock, QrCode, CheckCircle2, MapPin, ChevronRight,
  CalendarCheck, ShieldCheck, Zap, Bell, HelpCircle,
  Download, BookOpen, Grid, Search, LayoutDashboard, UserCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { Booking, Room } from '../types';
import api from '../lib/api';

type ActiveView = 'booking' | 'browse' | 'profile' | 'history' | 'my-events';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ActiveView>('booking');
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [commentingBookingId, setCommentingBookingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [qrModalEvent, setQrModalEvent] = useState<{ bookingId: string; title: string; labName?: string; scheduledStart?: string } | null>(null);

  // Function to refresh bookings
  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings');
      // Backend now scopes GET /bookings to the authenticated student's own bookings
      const mapped: Booking[] = response.data.map((b: any) => {
        const startDate = new Date(b.scheduledStart);
        const endDate = new Date(b.scheduledEnd);
        const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
        return {
          id: b.id,
          roomId: b.labId,
          studentId: b.student?.universityId || b.studentId,
          studentName: b.student?.fullName,
          roomName: b.lab?.name || 'Unknown Room',
          roomLocation: b.lab ? `Floor ${b.lab.floor}, Room ${b.lab.roomNumber}` : 'Unknown Location',
          date: startDate.toISOString().split('T')[0],
          time: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration,
          status: b.status,
          title: b.title,
          description: b.description,
          expectedAttendees: b.expectedAttendees,
          studentComment: b.studentComment,
          lab: b.lab ? {
            id: b.lab.id,
            name: b.lab.name,
            capacity: b.lab.capacity,
            hardware: b.lab.aiTags || [],
            status: b.lab.status,
            occupancyPercent: b.lab.capacity > 0 ? Math.round((b.lab.currentOccupancy / b.lab.capacity) * 100) : 0,
            location: `Floor ${b.lab.floor}, Room ${b.lab.roomNumber}`
          } : undefined,
          reliabilityScore: 95,
          qrToken: b.status === 'approved' ? `live-qr-${b.id}` : undefined
        };
      });
      setMyBookings(mapped);
    } catch (error) {
      console.error('Failed to fetch bookings', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveComment = async (bookingId: string) => {
    try {
      await api.patch(`/bookings/${bookingId}`, { studentComment: commentText });
      setCommentingBookingId(null);
      setCommentText('');
      fetchBookings();
    } catch (err) {
      console.error('Failed to save comment', err);
      alert('Failed to save comment. Please try again.');
    }
  };

  const fetchRegistrations = async () => {
    try {
      const response = await api.get('/registrations/my');
      setMyRegistrations(response.data);
    } catch (err) {
      console.error('Failed to fetch registrations', err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchBookings();
      fetchRegistrations();
    }
  }, [user]);

  // Fetch rooms for manual browsing when the 'browse' tab is active
  useEffect(() => {
    if (activeView !== 'browse' || rooms.length > 0) return;
    const fetchRooms = async () => {
      setIsLoadingRooms(true);
      try {
        const response = await api.get('/labs');
        const mappedRooms: Room[] = response.data.map((lab: any) => ({
          id: lab.id,
          name: lab.name,
          capacity: lab.capacity,
          hardware: lab.aiTags || [],
          status: lab.status,
          occupancyPercent: lab.capacity > 0 ? Math.round((lab.currentOccupancy / lab.capacity) * 100) : 0,
          location: `${lab.faculty?.name || 'Unknown Faculty'}, Floor ${lab.floor}, Room ${lab.roomNumber}`,
        }));
        setRooms(mappedRooms);
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      } finally {
        setIsLoadingRooms(false);
      }
    };
    fetchRooms();
  }, [activeView, rooms.length]);

  const handleLogout = () => {
    logout();
  };

  // Computed stats
  const totalBookings = myBookings.length;
  const reliabilityScore = 95;
  const hoursSaved = Math.round(myBookings.reduce((acc, b) => acc + b.duration, 0) / 60);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'ST';

  const navItems = [
    { id: 'booking' as ActiveView, label: 'AI Booking', icon: LayoutDashboard },
    { id: 'browse' as ActiveView, label: 'Browse Rooms', icon: Grid },
    { id: 'profile' as ActiveView, label: 'Profile & Settings', icon: UserCircle },
    { id: 'history' as ActiveView, label: 'My History', icon: BookOpen },
    { id: 'my-events' as ActiveView, label: 'My Events', icon: CalendarCheck },
  ];

  const statusStyle = (status: string) => {
    if (status === 'approved') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (status === 'pending') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (status === 'completed') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (status === 'rejected') return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-gray-500/20 text-slate-500 dark:text-gray-400 border-gray-500/30';
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-navy-900 flex flex-col md:flex-row">

      {/* ─── SHARED SIDEBAR ─── */}
      <AppSidebar
        activeView={activeView}
        onNavClick={(id) => setActiveView(id as ActiveView)}
      />

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 overflow-y-auto">

        {/* AI BOOKING VIEW */}
        {activeView === 'booking' && (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
              </h1>
              <p className="text-slate-500 dark:text-gray-400 mt-1">Where would you like to study today?</p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2">
                <ChatWindow />
              </div>
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Recent Bookings
                </h2>
                {isLoading ? (
                  <div className="glass-card p-6 text-center text-slate-500 dark:text-gray-400 text-sm">Loading...</div>
                ) : myBookings.length === 0 ? (
                  <div className="glass-card p-6 text-center text-slate-500 dark:text-gray-400 text-sm">
                    No bookings yet. Use the chat!
                  </div>
                ) : (
                  myBookings.slice(0, 3).map((booking) => (
                    <div key={booking.id} className="glass-card p-4 relative overflow-hidden">
                      {booking.status === 'approved' && (
                        <div className="absolute top-0 left-0 w-0.5 h-full bg-emerald-500" />
                      )}
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-foreground text-sm">{booking.roomName}</h4>
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${statusStyle(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {booking.roomLocation}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">{booking.date} · {booking.time} ({booking.duration}m)</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* PROFILE & SETTINGS VIEW */}
        {activeView === 'profile' && (
          <div className="p-8 w-full">
            <div className="mb-2 text-xs text-slate-400 dark:text-gray-500 uppercase tracking-widest">Overview</div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-foreground">Dashboard at a Glance</h1>
              <span className="text-xs text-slate-400 dark:text-gray-500">Last synced: Just now</span>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <div className="glass-card p-5 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <CalendarCheck className="w-4 h-4 text-gray-600" />
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Semester</p>
                <p className="text-4xl font-bold text-foreground">{totalBookings}</p>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Total Bookings</p>
              </div>

              <div className="glass-card p-5 relative overflow-hidden border-electric-500/20">
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-emerald-400">Optimal</span>
                </div>
                <ShieldCheck className="w-5 h-5 text-electric-400 mb-2" />
                <p className="text-4xl font-bold text-foreground">{reliabilityScore}%</p>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Reliability Score</p>
              </div>

              <div className="glass-card p-5 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <Zap className="w-4 h-4 text-gray-600" />
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Efficiency</p>
                <p className="text-4xl font-bold text-foreground">{hoursSaved}h</p>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Hours Saved</p>
              </div>
            </div>

            {/* Account Management */}
            <div className="mb-3 text-xs text-slate-400 dark:text-gray-500 uppercase tracking-widest">Preferences</div>
            <h2 className="text-xl font-bold text-foreground mb-4">Account Management</h2>

            <div className="glass-card overflow-hidden divide-y divide-white/5">
              {[
                { icon: Clock, label: 'Booking History', desc: 'Review and manage your past and upcoming facility reservations.', action: () => setActiveView('history'), color: 'text-electric-400' },
                { icon: MapPin, label: 'Saved Places', desc: 'Quick access to your favorite study zones and laboratory stations.', color: 'text-amber-400' },
                { icon: Bell, label: 'Notification Settings', desc: 'Customize how and when you receive real-time density alerts.', color: 'text-emerald-400' },
                { icon: HelpCircle, label: 'Help & Support', desc: 'Get technical assistance or report facility issues directly to administrators.', color: 'text-purple-400' },
              ].map(({ icon: Icon, label, desc, action, color }) => (
                <button
                  key={label}
                  onClick={action}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors text-left group"
                >
                  <div className={`w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-slate-200 dark:hover:bg-white/10 transition-colors`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-slate-500 dark:text-gray-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>

            {/* Download button */}
            <div className="mt-6 flex justify-end">
              <button className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 hover:text-foreground transition-colors py-2 px-3 rounded-lg hover:bg-slate-100 dark:bg-white/5">
                <Download className="w-3.5 h-3.5" />
                Download Account Data
              </button>
            </div>
          </div>
        )}

        {/* BROWSE ROOMS VIEW */}
        {activeView === 'browse' && (
          <div className="p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">Browse Rooms</h1>
                <p className="text-slate-500 dark:text-gray-400 text-sm">Find and book laboratories manually</p>
              </div>
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
            </div>

            {isLoadingRooms ? (
              <div className="text-center py-12 text-slate-500 dark:text-gray-400">Loading rooms...</div>
            ) : (
              <DensityGrid
                rooms={rooms.filter(r =>
                  r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.hardware.some(hw => hw.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  r.location.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                onBook={(room) => setSelectedRoom(room)}
              />
            )}
          </div>
        )}

        {/* BOOKING HISTORY VIEW */}
        {activeView === 'history' && (
          <div className="p-8 w-full">
            <button
              onClick={() => setActiveView('profile')}
              className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400 hover:text-foreground transition-colors mb-6"
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Settings
            </button>
            <h1 className="text-2xl font-bold text-foreground mb-6">Booking History</h1>

            {isLoading ? (
              <div className="glass-card p-10 text-center text-slate-500 dark:text-gray-400">Loading bookings...</div>
            ) : myBookings.length === 0 ? (
              <div className="glass-card p-10 text-center text-slate-500 dark:text-gray-400">
                No bookings found. Use the AI assistant to book a room!
              </div>
            ) : (
              <div className="space-y-3">
                {myBookings.map((booking) => {
                  const isApproved = booking.status === 'approved';
                  return (
                    <div key={booking.id} className="glass-card p-5 relative overflow-hidden group">
                      {isApproved && <div className="absolute top-0 left-0 w-0.5 h-full bg-emerald-500" />}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">{booking.roomName}</h4>
                          <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {booking.roomLocation}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${statusStyle(booking.status)}`}>
                            {booking.status}
                          </span>
                          {booking.status === 'pending' && booking.lab && (
                            <button
                              onClick={() => {
                                setSelectedRoom(booking.lab || null);
                                setEditingBooking(booking);
                              }}
                              className="text-xs text-electric-400 hover:text-electric-300 hover:underline"
                            >
                              Edit Request
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-gray-300 mb-3 bg-slate-100 dark:bg-navy-900/50 px-3 py-2 rounded-lg">
                        {booking.date} at {booking.time} — {booking.duration} min session
                      </div>
                      {isApproved && (
                        <div className="flex flex-col gap-2 mb-3">
                          {(() => {
                            const [hours, minutes] = booking.time.split(':').map(Number);
                            const start = new Date(booking.date);
                            start.setHours(hours, minutes, 0, 0);
                            const end = new Date(start.getTime() + booking.duration * 60000);
                            const now = new Date();
                            const isExpired = now.getTime() > end.getTime() + 3 * 60 * 60 * 1000;

                            return isExpired ? (
                              <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 py-2 px-4 text-sm text-center rounded-lg">
                                Attendance Window Closed
                              </div>
                            ) : (
                              <button
                                onClick={() => setQrModalEvent({
                                  bookingId: booking.id,
                                  title: booking.title || booking.roomName || '',
                                  labName: booking.roomName,
                                  scheduledStart: `${booking.date}T${booking.time}`
                                })}
                                className="w-full btn-primary py-2 px-4 text-sm flex items-center justify-center gap-2"
                              >
                                <QrCode className="w-4 h-4" /> Show Event QR Code
                              </button>
                            );
                          })()}

                          {commentingBookingId === booking.id ? (
                            <div className="flex flex-col gap-2 mt-2">
                              <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment or question for the admin..."
                                className="w-full bg-slate-100 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-electric-500 resize-none h-16"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => { setCommentingBookingId(null); setCommentText(''); }}
                                  className="text-xs text-slate-500 dark:text-gray-400 hover:text-foreground"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveComment(booking.id)}
                                  className="text-xs text-electric-400 hover:text-electric-300 font-medium"
                                >
                                  Save Comment
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start mt-1">
                              {booking.studentComment ? (
                                <div className="bg-slate-100 dark:bg-white/5 rounded px-3 py-2 flex-1 mr-2 text-sm text-slate-600 dark:text-gray-300">
                                  <span className="text-slate-400 dark:text-gray-500 text-xs block mb-0.5">Your Comment:</span>
                                  {booking.studentComment}
                                </div>
                              ) : (
                                <div />
                              )}
                              <button
                                onClick={() => {
                                  setCommentingBookingId(booking.id);
                                  setCommentText(booking.studentComment || '');
                                }}
                                className="text-xs text-slate-500 dark:text-gray-400 hover:text-electric-400 transition-colors whitespace-nowrap mt-1"
                              >
                                {booking.studentComment ? 'Edit Comment' : 'Add Comment'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {booking.status === 'completed' && (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 py-2 bg-emerald-500/10 rounded-lg">
                          <CheckCircle2 className="w-4 h-4" /> Attendance Verified
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MY EVENTS VIEW */}
        {activeView === 'my-events' && (
          <div className="p-8 w-full">
            <h1 className="text-2xl font-bold text-foreground mb-6">Events I'm Attending</h1>

            {myRegistrations.length === 0 ? (
              <div className="glass-card p-10 text-center text-slate-500 dark:text-gray-400">
                You haven't joined any events yet. <Link to="/events" className="text-electric-400 hover:underline">Browse Events</Link>.
              </div>
            ) : (
              <div className="grid gap-4">
                {myRegistrations.map((reg: any) => {
                  const event = reg.booking;
                  const startDate = new Date(event.scheduledStart);

                  return (
                    <div key={reg.id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-foreground">{event.title}</h3>
                          <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${reg.status === 'attended' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                              reg.status === 'registered' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}>
                            {reg.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-gray-400 flex items-center gap-2 mb-3">
                          <MapPin className="w-4 h-4 text-electric-400" />
                          {event.lab.name} ({event.lab.faculty.name})
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserCircle className="w-3.5 h-3.5" />
                            Organizer: {event.organizer.fullName}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-center gap-3 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 min-w-[120px]">
                        {/* Guests never show a QR — the host displays the event QR at the door */}
                        {reg.status === 'attended' ? (
                          <div className="text-sm text-center">
                            <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" /> Attended
                            </div>
                            {reg.checkInTime && (
                              <div className="text-slate-400 dark:text-gray-500 text-xs">
                                Checked in at {new Date(reg.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        ) : reg.status === 'registered' ? (
                          <div className="text-center">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-2">
                              <Clock className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="text-xs text-amber-400 font-semibold">Awaiting event</div>
                            <div className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Host scans you in</div>
                          </div>
                        ) : (
                          <div className="text-xs text-red-400 font-semibold">No Show</div>
                        )}

                        {reg.certificateData && (
                          <button className="flex items-center gap-2 btn-primary py-2 px-4 text-xs w-full justify-center mt-2">
                            <Download className="w-4 h-4" /> Download Certificate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* QR Modal */}
      {qrModalEvent && (
        <EventQrModal
          bookingId={qrModalEvent.bookingId}
          eventTitle={qrModalEvent.title}
          labName={qrModalEvent.labName}
          scheduledStart={qrModalEvent.scheduledStart}
          onClose={() => setQrModalEvent(null)}
        />
      )}

      {/* Booking Modal */}
      {selectedRoom && (
        <BookingFormModal
          lab={{
            id: selectedRoom.id,
            name: selectedRoom.name,
            capacity: selectedRoom.capacity,
            location: selectedRoom.location,
            hardware: selectedRoom.hardware,
          }}
          existingBooking={editingBooking ? {
            id: editingBooking.id,
            title: editingBooking.title || '',
            description: editingBooking.description || '',
            expectedAttendees: editingBooking.expectedAttendees || 1,
            date: editingBooking.date,
            startTime: editingBooking.time,
            endTime: editingBooking.endTime || '',
          } : undefined}
          onClose={() => {
            setSelectedRoom(null);
            setEditingBooking(null);
          }}
          onSuccess={() => {
            setSelectedRoom(null);
            setEditingBooking(null);
            fetchBookings(); // Refresh bookings list
            setActiveView('history');
          }}
        />
      )}
    </div>
  );
}
