import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { router } from './router';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="sau-vision-theme">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
