import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/shared/Navbar';

// Pages
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import MapPage from '../pages/Map';
import Dashboard from '../pages/Dashboard';
import Admin from '../pages/Admin';
import CheckIn from '../pages/CheckIn';
import Report from '../pages/Report';
import EventsDashboard from '../pages/EventsDashboard';
import JoinEvent from '../pages/JoinEvent';
import EventAttendees from '../pages/EventAttendees';
import EventFeedback from '../pages/EventFeedback';

// ── Shared Layout with Navbar (for public/admin pages) ────────────────────────
const Layout = () => (
  <div className="page-container relative">
    <Navbar />
    <main>
      <Outlet />
    </main>
  </div>
);

// ── Sidebar Layout (no Navbar — Dashboard, Map, Events handle their own nav) ──
const SidebarLayout = () => <Outlet />;

// ── Protected Route ───────────────────────────────────────────────────────────
const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: ('student' | 'admin')[];
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};

// ── Router ────────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // ── Pages WITH the top Navbar (Landing, Admin, utility pages) ──────────────
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Landing /> },

      // Checkin / attendees / feedback — utility pages that keep navbar
      {
        path: '/booking/:id/checkin',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <CheckIn />
          </ProtectedRoute>
        ),
      },
      {
        path: '/booking/:bookingId/attendees',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <EventAttendees />
          </ProtectedRoute>
        ),
      },
      {
        path: '/booking/:bookingId/feedback',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <EventFeedback />
          </ProtectedRoute>
        ),
      },

      // Admin
      {
        path: '/admin',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <Admin />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/reports/:id',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <Report />
          </ProtectedRoute>
        ),
      },
    ],
  },

  // ── Pages WITH the AppSidebar — NO top Navbar ─────────────────────────────
  {
    element: <SidebarLayout />,
    children: [
      // Map is publicly viewable
      { path: '/map', element: <MapPage /> },

      // Student-only sidebar pages
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/events',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <EventsDashboard />
          </ProtectedRoute>
        ),
      },
    ],
  },

  // Login (no Navbar, no Sidebar)
  { path: '/login', element: <Login /> },

  // QR Scan Landing Page (public, handles its own auth redirect)
  { path: '/join/:bookingId', element: <JoinEvent /> },

  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
]);
