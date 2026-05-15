import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ApprovalTable from '../components/admin/ApprovalTable';
import NotificationBadge from '../components/admin/NotificationBadge';
import { mockBookings, mockRooms } from '../lib/mockData';
import type { Booking } from '../types';
import { ShieldCheck, BarChart3, Users, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Admin() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const activeBookings = bookings.filter(b => b.status === 'active' || b.status === 'approved');

  const handleApprove = (id: string) => {
    setBookings(prev => prev.map(b => 
      b.id === id ? { ...b, status: 'approved', qrToken: `live-qr-${Date.now()}` } : b
    ));
    // In a real app: await api.patch(`/bookings/${id}/approve`)
  };

  const handleReject = (id: string) => {
    setBookings(prev => prev.map(b => 
      b.id === id ? { ...b, status: 'rejected' } : b
    ));
    // In a real app: await api.patch(`/bookings/${id}/reject`)
  };

  return (
    <div className="min-h-screen bg-navy-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-electric-500" />
              Admin Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Welcome back, {user?.name}</p>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/map" className="btn-ghost flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" /> Live Map
            </Link>
            <NotificationBadge count={pendingBookings.length} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6 border-l-4 border-l-amber-500">
            <div className="text-sm text-gray-400 mb-1">Pending Requests</div>
            <div className="text-3xl font-bold text-white">{pendingBookings.length}</div>
          </div>
          <div className="glass-card p-6 border-l-4 border-l-emerald-500">
            <div className="text-sm text-gray-400 mb-1">Active Sessions</div>
            <div className="text-3xl font-bold text-white">{activeBookings.length}</div>
          </div>
          <div className="glass-card p-6 border-l-4 border-l-electric-500">
            <div className="text-sm text-gray-400 mb-1">System Efficiency</div>
            <div className="text-3xl font-bold text-white">94%</div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Approval Queue (Takes 2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-electric-400" />
                Pending Approvals
              </h2>
            </div>
            
            <ApprovalTable 
              bookings={pendingBookings} 
              rooms={mockRooms}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </div>

          {/* Sidebar (Takes 1/3 width) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Recent ROI Reports
              </h2>
            </div>

            <div className="glass-card p-1">
              {/* Mock Reports List */}
              <div className="divide-y divide-white/5">
                {[mockBookings.find(b => b.id === 'b5')].filter(Boolean).map(booking => {
                  if (!booking) return null;
                  const room = mockRooms.find(r => r.id === booking.roomId);
                  return (
                    <Link 
                      key={booking.id} 
                      to={`/admin/reports/${booking.id}`}
                      className="block p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-white text-sm">{room?.name}</div>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-electric-500/20 text-electric-400 border border-electric-500/30">
                          Ready
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {booking.date} • {booking.time} ({booking.duration}m)
                      </div>
                    </Link>
                  );
                })}
                
                {/* Dummy placeholders to fill space */}
                <div className="p-4 opacity-50">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium text-white text-sm">Lab 101</div>
                  </div>
                  <div className="text-xs text-gray-400">2026-05-13 • 09:00 (120m)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

