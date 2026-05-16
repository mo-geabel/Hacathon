import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Map, ShieldCheck, Zap, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';

const HERO_IMAGES = [
  { src: '/images/students-sitting-lawn-reading.jpg', caption: 'Students Learning Together' },
  { src: '/images/high-school-students-conducting-hands-on-engineering-experiment-in-lab-photo.jpg', caption: 'World-Class Labs & Facilities' },
  { src: '/images/multiethnic-group-happy-students-posing-classroom.jpg', caption: 'Campus Life at SAÜ' },
];

interface LiveStats {
  totalRooms: number;
  activeSessions: number;
}

export default function Landing() {
  const [stats, setStats] = useState<LiveStats>({ totalRooms: 0, activeSessions: 0 });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Fetch live lab stats from the real API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: labs } = await api.get('/labs');
        const totalRooms = labs.length;
        const activeSessions = labs.filter((l: any) => l.status === 'occupied').length;
        setStats({ totalRooms, activeSessions });
      } catch {
        // Graceful fallback — keep zeros if API is unreachable
      }
    };
    fetchStats();
    // Refresh live stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate slideshow
  useEffect(() => {
    const timer = setInterval(() => goToNext(), 6000);
    return () => clearInterval(timer);
  }, [currentSlide]);

  const goToSlide = (index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setIsTransitioning(false);
    }, 300);
  };

  const goToNext = () => goToSlide((currentSlide + 1) % HERO_IMAGES.length);
  const goToPrev = () => goToSlide((currentSlide - 1 + HERO_IMAGES.length) % HERO_IMAGES.length);

  return (
    <div className="min-h-screen bg-navy-900 text-white overflow-hidden selection:bg-electric-500/30">

      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-electric-500 rounded-lg flex items-center justify-center glow-blue">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight drop-shadow-lg">SAÜ-Vision</span>
        </div>
        <div className="flex gap-4 items-center">
          <Link to="/map" className="text-sm font-medium text-white/80 hover:text-white transition-colors drop-shadow">
            Campus Map
          </Link>
          <Link to="/login" className="btn-primary flex items-center gap-2 text-sm px-5 py-2">
            Sign In <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">

        {/* Background image slides */}
        {HERO_IMAGES.map((img, i) => (
          <div
            key={img.src}
            className="absolute inset-0 bg-center bg-cover transition-opacity duration-700 ease-in-out"
            style={{
              backgroundImage: `url('${img.src}')`,
              opacity: i === currentSlide && !isTransitioning ? 1 : 0,
              zIndex: 0,
            }}
          />
        ))}

        {/* Multi-layer dark overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-navy-900/70 via-navy-900/50 to-navy-900/90" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-navy-900/40 via-transparent to-navy-900/40" />

        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-electric-500/15 rounded-full blur-[100px] pointer-events-none z-20" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-400/10 rounded-full blur-[80px] pointer-events-none z-20" />

        {/* Hero Content */}
        <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-500/20 border border-electric-500/30 text-electric-300 text-sm font-medium mb-8 animate-fade-in backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span>Next-Gen Facility Management</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 animate-slide-up drop-shadow-2xl text-balance">
            Smart Campus, <br className="hidden md:block" />
            <span className="gradient-text">Zero Friction.</span>
          </h1>

          <p className="mt-4 text-xl text-gray-200 max-w-2xl mx-auto mb-10 animate-slide-up drop-shadow-lg" style={{ animationDelay: '100ms' }}>
            Book rooms with AI, verify attendance with IoT vision, and manage campus density in real-time. The future of Sakarya University facilities is here.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Link to="/login" className="btn-primary text-lg px-8 py-3 shadow-lg">
              Book a Room
            </Link>
            <Link to="/map" className="btn-ghost flex items-center justify-center gap-2 text-lg px-8 py-3 backdrop-blur-sm">
              <Map className="w-5 h-5" /> Live Density Map
            </Link>
          </div>
        </div>

        {/* Slideshow Controls */}
        <button
          onClick={goToPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white border border-white/10 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white border border-white/10 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Slide dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`transition-all duration-300 rounded-full ${
                i === currentSlide
                  ? 'w-8 h-2 bg-electric-400'
                  : 'w-2 h-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        {/* Caption */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-40 text-xs text-white/50 tracking-widest uppercase">
          {HERO_IMAGES[currentSlide].caption}
        </div>
      </section>

      {/* Live Stats Ticker */}
      <section className="border-y border-white/5 bg-navy-800/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-1">{stats.totalRooms}</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">Connected Rooms</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-electric-400 mb-1">{stats.activeSessions}</div>
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
