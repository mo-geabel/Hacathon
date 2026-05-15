import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/shared/Navbar';

// Lazy loading pages can be added later if bundle size grows
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import MapPage from '../pages/Map';
import Dashboard from '../pages/Dashboard';
import Admin from '../pages/Admin';
import CheckIn from '../pages/CheckIn';
import Report from '../pages/Report';

// Shared Layout with Navbar
const Layout = () => {
  return (
    <div className="page-container relative">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

// Protected Route Wrapper
const ProtectedRoute = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles?: ('student' | 'admin')[] 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-navy-900 text-white">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to their appropriate home if they try to access the wrong role's page
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Landing />,
      },
      {
        path: '/map',
        element: <MapPage />,
      },
      {
        path: '/booking/:id/checkin',
        element: <CheckIn />,
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
  {
    path: '/login',
    element: <Login />,
  },
]);
