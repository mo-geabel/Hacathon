import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Map, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { mockRooms } from '../lib/mockData';

export default function Landing() {
  const [activeRooms, setActiveRooms] = useState(0);

  // Simulate live stats changing
  useEffect(() => {
    const active = mockRooms.filter(r => r.status === 'occupied').length;
    setActiveRooms(active);

    const interval = setInterval(() => {
      setActiveRooms(prev => (prev === active ? active + 1 : active));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-navy-900 text-white overflow-hidden selection:bg-electric-500/30">
      
      {/* Navbar (Simplified for Landing) */}
      <nav className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-electric-500 rounded-lg flex items-center justify-center glow-blue">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">SAÜ-Vision</span>
        </div>
        <div className="flex gap-4 items-center">
          <Link to="/map" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Campus Map
          </Link>
          <Link to="/login" className="btn-primary flex items-center gap-2 text-sm px-5 py-2">
            Sign In <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-electric-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-500/10 border border-electric-500/20 text-electric-400 text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>Next-Gen Facility Management</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 animate-slide-up text-balance">
            Smart Campus, <br className="hidden md:block" />
            <span className="gradient-text">Zero Friction.</span>
          </h1>
          
          <p className="mt-4 text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
            Book rooms with AI, verify attendance with IoT vision, and manage campus density in real-time. The future of Sakarya University facilities is here.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Link to="/login" className="btn-primary text-lg px-8 py-3">
              Book a Room
            </Link>
            <Link to="/map" className="btn-ghost flex items-center justify-center gap-2 text-lg px-8 py-3">
              <Map className="w-5 h-5" /> Live Density Map
            </Link>
          </div>
        </div>
      </main>

      {/* Stats Ticker */}
      <section className="border-y border-white/5 bg-navy-800/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-1">{mockRooms.length}</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">Connected Rooms</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-electric-400 mb-1">{activeRooms}</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">Active Sessions</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-1">99%</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-1">&lt;1s</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">IoT Latency</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Why SAÜ-Vision?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-card p-8 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Chatbot Booking</h3>
              <p className="text-gray-400">Just type what you need. Our NLP engine finds the perfect room, capacity, and hardware instantly.</p>
            </div>

            <div className="glass-card p-8 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Anti-Ghosting System</h3>
              <p className="text-gray-400">Hardware vision verifies physical presence. Abandoned rooms are automatically released back to the pool.</p>
            </div>

            <div className="glass-card p-8 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-Time Insights</h3>
              <p className="text-gray-400">Admins get live heatmaps, instant notifications, and automated ROI reports for every session.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
