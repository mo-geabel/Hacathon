import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ApprovalTable from '../components/admin/ApprovalTable';
import AdminStatsCards from '../components/admin/AdminStatsCards';
import BookingsChart from '../components/admin/BookingsChart';
import LiveSessionsTable from '../components/admin/LiveSessionsTable';
import type { Booking } from '../types';
import { ShieldCheck, BarChart3, Users, LayoutDashboard, Activity, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

export default function Admin() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'live' | 'reports'>('overview');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await api.get('/bookings');
        
        const mapped: Booking[] = response.data.map((b: any) => {
          const startDate = new Date(b.scheduledStart);
          const endDate = new Date(b.scheduledEnd);
          const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
          const dateStr = startDate.toISOString().split('T')[0];
          const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return {
            id: b.id,
            roomId: b.labId,
            studentId: b.student?.universityId || b.studentId,
            studentName: b.student?.fullName || b.studentId,
            roomName: b.lab?.name || 'Unknown Room',
            roomLocation: b.lab ? `Floor ${b.lab.floor}, Room ${b.lab.roomNumber}` : 'Unknown Location',
            date: dateStr,
            time: timeStr,
            duration,
            status: b.status,
            title: b.title,
            description: b.description,
            expectedAttendees: b.expectedAttendees,
            studentComment: b.studentComment,
            student: b.student,
            reliabilityScore: 95, // Still mocked until backend provides it
            qrToken: b.status === 'approved' ? `live-qr-${b.id}` : undefined
          };
        });

        setBookings(mapped);
      } catch (error) {
        console.error('Failed to fetch bookings', error);
        addToast('Failed to load bookings', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [addToast]);

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const activeBookings = bookings.filter(b => b.status === 'active' || b.status === 'approved');
  const completedBookings = bookings.filter(b => b.status === 'completed');

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status: 'approved' });
      setBookings(prev => prev.map(b => 
        b.id === id ? { ...b, status: 'approved', qrToken: `live-qr-${Date.now()}` } : b
      ));
      addToast('Booking approved successfully', 'success');
    } catch (error) {
      console.error('Failed to approve booking', error);
      addToast('Failed to approve booking', 'error');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status: 'rejected' });
      setBookings(prev => prev.map(b => 
        b.id === id ? { ...b, status: 'rejected' } : b
      ));
      addToast('Booking rejected', 'info');
    } catch (error) {
      console.error('Failed to reject booking', error);
      addToast('Failed to reject booking', 'error');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'approvals', label: 'Pending Approvals', icon: Users, badge: pendingBookings.length },
    { id: 'live', label: 'Live Monitoring', icon: Activity, badge: activeBookings.length },
    { id: 'reports', label: 'Post-Event Reports', icon: FileText },
  ] as const;

  return (
    <div className="min-h-screen bg-navy-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-electric-500" />
              Admin Workspace
            </h1>
            <p className="text-gray-400 mt-2">Welcome back, {user?.name}</p>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/map" className="btn-ghost flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" /> Live Map
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto hide-scrollbar border-b border-white/10 mb-8">
          <div className="flex gap-8 px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium transition-colors whitespace-nowrap
                    ${isActive 
                      ? 'border-electric-500 text-electric-400' 
                      : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs
                      ${isActive ? 'bg-electric-500/20 text-electric-400' : 'bg-white/10 text-gray-300'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="glass-card p-12 text-center text-gray-400">Loading workspace data...</div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <AdminStatsCards bookings={bookings} />
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <BookingsChart bookings={bookings} />
                    </div>
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-400" />
                        Recent Reports
                      </h2>
                      <div className="glass-card p-1">
                        <div className="divide-y divide-white/5">
                          {completedBookings.slice(0, 3).map(booking => (
                            <Link 
                              key={booking.id} 
                              to={`/admin/reports/${booking.id}`}
                              className="block p-4 hover:bg-white/[0.02] transition-colors"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <div className="font-medium text-white text-sm">{booking.roomName}</div>
                                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  Ready
                                </span>
                              </div>
                              <div className="text-xs text-gray-400">
                                {booking.date} • {booking.time} ({booking.duration}m)
                              </div>
                            </Link>
                          ))}
                          {completedBookings.length === 0 && (
                            <div className="p-6 text-center text-sm text-gray-500">
                              No completed reports available yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'approvals' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <ApprovalTable 
                    bookings={pendingBookings} 
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                </div>
              )}

              {activeTab === 'live' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <LiveSessionsTable bookings={activeBookings} />
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="glass-card p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Post-Event Reports Archive</h3>
                    <p className="text-gray-400">Detailed ROI and Engagement reports generated by puq.ai will appear here.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
