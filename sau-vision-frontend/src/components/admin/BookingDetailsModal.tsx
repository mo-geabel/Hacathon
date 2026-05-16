import React from 'react';
import type { Booking } from '../../types';
import { X, User, Building, MessageSquare, AlignLeft, Users, Clock, MapPin } from 'lucide-react';

interface ModalProps {
  booking: Booking;
  onClose: () => void;
}

export default function BookingDetailsModal({ booking, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-semibold text-white">Booking Details</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* Booking Info */}
          <div>
            <h3 className="text-lg font-medium text-white mb-1">{booking.title || 'Untitled Session'}</h3>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-3">
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <Clock className="w-4 h-4 text-electric-400" />
                {booking.date} at {booking.time} ({booking.duration}m)
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <MapPin className="w-4 h-4 text-amber-400" />
                {booking.roomName} ({booking.roomLocation})
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <Users className="w-4 h-4 text-emerald-400" />
                {booking.expectedAttendees || '?'} Expected
              </div>
            </div>
          </div>

          {booking.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <AlignLeft className="w-4 h-4" /> Description
              </div>
              <div className="p-4 bg-black/20 rounded-xl border border-white/5 text-gray-300 text-sm leading-relaxed">
                {booking.description}
              </div>
            </div>
          )}

          <hr className="border-white/5" />

          {/* Student/Host Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" /> Host Details
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{booking.studentName || 'Unknown Student'}</div>
                  <div className="text-xs text-gray-400 mt-1">{booking.studentId}</div>
                </div>
              </div>
              
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Building className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{booking.student?.faculty || 'Unknown Department'}</div>
                  <div className="text-xs text-gray-400 mt-1">{booking.student?.programme || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Host Comment */}
          {booking.studentComment && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
                <MessageSquare className="w-4 h-4" /> Host's Post-Approval Comment
              </div>
              <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-100 text-sm leading-relaxed italic">
                "{booking.studentComment}"
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end">
          <button 
            onClick={onClose}
            className="btn-ghost"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
}
