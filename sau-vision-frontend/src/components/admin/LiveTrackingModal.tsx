import React, { useState, useEffect } from 'react';
import { X, Users, Activity, Play, Image as ImageIcon } from 'lucide-react';
import type { Booking } from '../../types';

interface LiveTrackingModalProps {
  booking: Booking;
  onClose: () => void;
}

export default function LiveTrackingModal({ booking, onClose }: LiveTrackingModalProps) {
  const [frameData, setFrameData] = useState<string | null>(null);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Start the background processing when the modal opens if it's not already running
  useEffect(() => {
    const startProcessing = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/novavision/process', {
          method: 'POST',
        });
        if (!res.ok && res.status !== 409) { // 409 means it's already processing, which is fine
          console.error('Failed to start processing');
        }
      } catch (err) {
        console.error('Error starting video processing:', err);
      }
    };
    startProcessing();
  }, []);

  // Polling logic for stats and raw frame
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        // Fetch raw frame
        const rawRes = await fetch('http://localhost:5000/api/novavision/raw');
        if (rawRes.ok && rawRes.status === 200) {
          const rawData = await rawRes.json();
          if (rawData.success && rawData.data?.frame?.processedBase64) {
            setFrameData(rawData.data.frame.processedBase64);
            setStudentCount(rawData.data.frame.count || 0);
          }
        }
        
        // Fetch stats to check if processing is still active
        const statsRes = await fetch('http://localhost:5000/api/novavision/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success) {
            setIsProcessing(statsData.data.isProcessing);
            // If totalStudents is higher than current count, we could use that, but current frame count is better for live view
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching live data:', err);
        setError('Failed to connect to Nova Vision backend.');
      }
    };

    // Poll every 1 second
    const interval = setInterval(fetchLiveData, 1000);
    // Initial fetch
    fetchLiveData();
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-5xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                Live Monitoring
                {isProcessing && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase tracking-wider border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {booking.title || booking.studentName || 'Session'} • {booking.roomName || 'Unknown Room'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
          
          {/* Main Video/Frame Feed */}
          <div className="flex-1 bg-black/50 rounded-xl border border-white/5 overflow-hidden flex flex-col relative min-h-[400px]">
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-6 text-center">
                <Activity className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">{error}</p>
                <p className="text-sm opacity-70 mt-2">Ensure the local Nova Vision backend is running.</p>
              </div>
            ) : frameData ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <img 
                  src={frameData} 
                  alt="Live tracking frame" 
                  className="w-full h-full object-contain"
                />
                {/* Overlay processing indicator */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-white tracking-wide">NOVA VISION AI</span>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                <ImageIcon className="w-12 h-12 mb-3 opacity-50 animate-pulse" />
                <p className="font-medium text-gray-300">Connecting to Camera Feed...</p>
                <p className="text-sm mt-2">Waiting for first frame from Nova Vision pipeline.</p>
              </div>
            )}
          </div>

          {/* Sidebar Stats */}
          <div className="w-full md:w-72 flex flex-col gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Live Analytics</h3>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white leading-none">
                    {studentCount}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Detected Students</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Processing Status</span>
                  <span className={`font-medium ${isProcessing ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isProcessing ? 'Running' : 'Idle'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Model</span>
                  <span className="font-medium text-white">YOLOv5s</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">FPS</span>
                  <span className="font-medium text-white">~1.0</span>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mt-auto">
              <h3 className="text-sm font-medium text-blue-400 mb-2">Monitoring Active</h3>
              <p className="text-xs text-blue-200/70 leading-relaxed">
                The system is actively tracking attendance via the static camera feed. The maximum concurrent count will be saved as the official attendance for this session.
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
