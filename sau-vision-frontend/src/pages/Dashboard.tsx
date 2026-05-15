import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatWindow from '../components/chatbot/ChatWindow';
import { mockBookings, mockRooms } from '../lib/mockData';
import { Clock, QrCode, CheckCircle2, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  
  // Get only this student's bookings
  const myBookings = mockBookings.filter(b => b.studentId === user?.id || b.studentId === 's1'); // Fallback to 's1' for demo

  return (
    <div className="min-h-screen bg-navy-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-400">Where would you like to study today?</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Chatbot Area (Takes 2/3 width) */}
          <div className="lg:col-span-2">
            <ChatWindow />
          </div>

          {/* Sidebar: Booking History (Takes 1/3 width) */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-electric-400" />
              My Bookings
            </h2>

            <div className="space-y-4">
              {myBookings.length === 0 ? (
                <div className="glass-card p-8 text-center text-gray-400">
                  No previous bookings found. Use the chat to book a room!
                </div>
              ) : (
                myBookings.map((booking) => {
                  const room = mockRooms.find(r => r.id === booking.roomId);
                  const isApproved = booking.status === 'approved';
                  
                  return (
                    <div key={booking.id} className="glass-card p-5 relative overflow-hidden group">
                      {isApproved && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                      )}
                      
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-white">{room?.name || 'Unknown Room'}</h4>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {room?.location}
                          </p>
                        </div>
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${
                          booking.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          booking.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          booking.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}>
                          {booking.status}
                        </span>
                      </div>

                      <div className="text-sm text-gray-300 mb-4 bg-navy-900/50 p-2 rounded-md">
                        {booking.date} at {booking.time} ({booking.duration}m)
                      </div>

                      {isApproved && (
                        <Link 
                          to={`/booking/${booking.id}/checkin`}
                          className="w-full btn-primary py-2 px-4 text-sm flex items-center justify-center gap-2 mt-2"
                        >
                          <QrCode className="w-4 h-4" /> View Check-In QR
                        </Link>
                      )}
                      
                      {booking.status === 'completed' && (
                        <div className="flex items-center justify-center gap-1 text-xs text-emerald-400 mt-2 py-2 bg-emerald-500/10 rounded-md">
                          <CheckCircle2 className="w-4 h-4" /> Attendance Verified
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

