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

// ── Shared Layout with Navbar ─────────────────────────────────────────────────
const Layout = () => (
  <div className="page-container relative">
    <Navbar />
    <main>
      <Outlet />
    </main>
  </div>
);

// ── Protected Route ───────────────────────────────────────────────────────────
// Wraps any route that requires authentication.
// allowedRoles: if provided, redirects users with the wrong role to their home.
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
      <div className="min-h-screen flex items-center justify-center bg-navy-900 text-white text-sm">
        Loading...
      </div>
    );
  }

  // Not logged in → send to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role → send to their correct home
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};

// ── Router ────────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  {
    // All routes inside Layout share the Navbar
    element: <Layout />,
    children: [
      // ── Public ──────────────────────────────────────────────────────────────
      {
        path: '/',
        element: <Landing />,
      },
      {
        // Map is publicly viewable; "Pin Event" button is conditionally shown
        path: '/map',
        element: <MapPage />,
      },

      // ── Student-only ────────────────────────────────────────────────────────
      {
        path: '/events',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <EventsDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        // CheckIn page requires authentication — a student must be logged in
        // to view their booking's QR code
        path: '/booking/:id/checkin',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <CheckIn />
          </ProtectedRoute>
        ),
      },

      // ── Admin-only ──────────────────────────────────────────────────────────
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

  // Login lives outside Layout (no Navbar)
  {
    path: '/login',
    element: <Login />,
  },

  // QR Scan Landing Page (public, handles its own auth redirect)
  {
    path: '/join/:bookingId',
    element: <JoinEvent />,
  },

  // Catch-all: any unknown URL → landing
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
