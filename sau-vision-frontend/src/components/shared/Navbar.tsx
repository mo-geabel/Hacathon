import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Activity, LogOut, Menu, X, Map, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Don't show navbar on login, landing, checkin, student dashboard, or report detail pages
  // (those pages either have their own nav or use a sidebar)
  if (
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname.includes('/checkin') ||
    location.pathname === '/dashboard' ||
    location.pathname.startsWith('/admin/reports/')
  ) {
    return null;
  }

  const navLinks = [];

  if (isAuthenticated) {
    if (user?.role === 'admin') {
      navLinks.push({ name: 'Admin Dashboard', path: '/admin', icon: ShieldCheck });
    } else {
      navLinks.push({ name: 'My Dashboard', path: '/dashboard', icon: LayoutDashboard });
    }
  }

  navLinks.push({ name: 'Campus Map', path: '/map', icon: Map });

  // Resolve where the logo should take the user
  const logoHref = !isAuthenticated ? '/' : user?.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-navy-900/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          <div className="flex items-center gap-3">
            <Link to={logoHref} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-electric-500 rounded-lg flex items-center justify-center glow-blue-sm">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight hidden sm:block">
                SAÜ-Vision
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex gap-6">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium transition-colors",
                      isActive ? "text-white" : "text-gray-400 hover:text-white"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-electric-400" : "")} />
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                <div className="text-sm">
                  <div className="text-white font-medium leading-none">{user?.name}</div>
                  <div className="text-gray-500 text-xs mt-1 capitalize">{user?.role}</div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-sm px-4 py-2">
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-400 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-navy-800 border-b border-white/10 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium",
                  isActive ? "bg-electric-500/20 text-electric-400" : "text-gray-300 hover:bg-white/5"
                )}
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </Link>
            );
          })}
          
          {isAuthenticated && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-red-400 hover:bg-red-500/10 mt-4 border border-red-500/20"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

