import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../ThemeToggle';
import {
  LayoutDashboard, UserCircle, Map, LogOut,
  CalendarCheck, BookOpen, Grid, Menu, X, ChevronLeft, ChevronRight
} from 'lucide-react';

interface AppSidebarProps {
  /** Active view state for Dashboard's internal tabs. Pass undefined on non-Dashboard pages. */
  activeView?: string;
  onNavClick?: (id: string) => void;
}

const DASHBOARD_TABS = [
  { id: 'booking',   label: 'AI Booking',        icon: LayoutDashboard },
  { id: 'browse',    label: 'Browse Rooms',       icon: Grid },
  { id: 'profile',   label: 'Profile & Settings', icon: UserCircle },
  { id: 'history',   label: 'My History',         icon: BookOpen },
  { id: 'my-events', label: 'My Events',          icon: CalendarCheck },
];

const EXTERNAL_LINKS = [
  { id: 'events', label: 'Events Dashboard', icon: CalendarCheck, href: '/events' },
  { id: 'map',    label: 'Campus Map',       icon: Map,           href: '/map' },
];

export default function AppSidebar({ activeView, onNavClick }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'ST';

  const isTabActive = (id: string) =>
    activeView ? activeView === id : false;

  const isLinkActive = (href: string) =>
    location.pathname === href;

  const handleTabClick = (id: string) => {
    setIsMobileOpen(false);
    if (onNavClick) {
      onNavClick(id);
    } else {
      navigate('/dashboard');
    }
  };

  const handleLinkClick = (href: string) => {
    setIsMobileOpen(false);
    navigate(href);
  };

  return (
    <div
      className={`shrink-0 flex flex-col md:flex-row relative
        ${isCollapsed ? 'md:w-16' : 'md:w-64'}
        transition-all duration-300 ease-in-out
      `}
    >
      {/* ─── MOBILE HEADER ───────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-navy-800 border-b border-border z-40 sticky top-0 w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow">
            {initials}
          </div>
          <span className="font-semibold text-foreground text-sm">SAÜ-Vision</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 text-slate-500 hover:text-foreground transition-colors"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ─── MOBILE OVERLAY ──────────────────────────────────────────────── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ─── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen
          bg-white dark:bg-navy-800/95 backdrop-blur-md border-r border-slate-200 dark:border-white/5
          flex flex-col z-50 transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Profile Card */}
        <div className={`border-b border-slate-200 dark:border-white/5 ${isCollapsed ? 'p-3' : 'p-5'}`}>
          <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? 'justify-center' : ''}`}>
            {/* Square avatar */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow-lg shrink-0">
              {initials}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden flex-1">
                <p className="font-semibold text-foreground truncate text-sm">{user?.name || 'Student'}</p>
                <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            )}
            {!isCollapsed && (
              <div className="ml-auto shrink-0">
                <ThemeToggle />
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Student
            </div>
          )}
        </div>

        {/* Nav Links — Dashboard Tabs */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {DASHBOARD_TABS.map((item) => {
            const Icon = item.icon;
            const active = isTabActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                  ${active
                    ? 'bg-electric-500/15 text-electric-400 border border-electric-500/20'
                    : 'text-slate-500 dark:text-gray-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          {/* Divider */}
          <div className={`my-2 border-t border-slate-200 dark:border-white/5 ${isCollapsed ? 'mx-1' : 'mx-2'}`} />

          {/* External page links */}
          {EXTERNAL_LINKS.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href);
            return (
              <button
                key={item.id}
                onClick={() => handleLinkClick(item.href)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                  ${active
                    ? 'bg-electric-500/15 text-electric-400 border border-electric-500/20'
                    : 'text-slate-500 dark:text-gray-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom: Theme (when collapsed), collapse toggle, sign out */}
        <div className="p-2 border-t border-slate-200 dark:border-white/5 space-y-1">
          {isCollapsed && (
            <div className="flex justify-center pb-1">
              <ThemeToggle />
            </div>
          )}
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden md:flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium
              text-slate-400 dark:text-gray-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200
              ${isCollapsed ? 'justify-center' : ''}`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
          </button>

          {/* Sign out */}
          <button
            onClick={() => { logout(); navigate('/'); }}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200
              ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && 'Sign Out'}
          </button>
        </div>
      </aside>
    </div>
  );
}
