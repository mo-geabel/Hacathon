import React, { useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Library, ShieldCheck, Loader2, GraduationCap } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login, isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect to their dashboard (or returnTo destination)
  if (isAuthenticated && user) {
    const params = new URLSearchParams(location.search);
    const returnTo = params.get('returnTo');
    const redirect = params.get('redirect');
    const dest = redirect || returnTo || (user.role === 'admin' ? '/admin' : '/dashboard');
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-card">
      {/* Left Pane - Image & Academic Quote */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-background border-r border-slate-200 dark:border-white/5">
        <div className="absolute inset-0 bg-background/60 mix-blend-multiply z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1829] via-[#0d1829]/60 to-transparent z-10" />
        <img 
          src="/academic-bg.png" 
          alt="Campus Library" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        <div className="relative z-20 flex flex-col justify-end p-16 h-full text-foreground max-w-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 backdrop-blur-sm">
              <Library className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold tracking-tight">Sakarya University</h1>
              <p className="text-amber-400/90 font-medium tracking-wide text-sm uppercase mt-1">SAÜ-Vision Portal</p>
            </div>
          </div>
          <blockquote className="space-y-6">
            <p className="text-2xl font-serif font-medium leading-relaxed text-gray-100">
              "Empowering the minds of tomorrow through advanced, intelligent campus facility management."
            </p>
            <footer className="flex items-center gap-3">
              <div className="h-px w-12 bg-amber-500/50" />
              <span className="text-sm font-medium text-slate-500 dark:text-gray-400 uppercase tracking-widest">
                Academic Excellence
              </span>
            </footer>
          </blockquote>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-32 relative">
        <div className="absolute top-6 right-6 z-50">
          <ThemeToggle />
        </div>
        {/* Subtle background glow for right pane */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-electric-500/5 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md mx-auto relative z-10">
          <div className="lg:hidden flex items-center gap-3 mb-10">
             <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Library className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-foreground tracking-tight">Sakarya University</h2>
              <p className="text-amber-400/90 text-xs font-medium uppercase tracking-widest mt-0.5">SAÜ-Vision</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight font-serif mb-2">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-8">
              Please enter your academic credentials to access the portal.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3.5 rounded-xl flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-gray-300">
                  University Email
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-border rounded-xl shadow-sm placeholder-gray-500 bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 sm:text-sm transition-all"
                    placeholder="name@sakarya.edu.tr"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-600 dark:text-gray-300">
                  Password
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-border rounded-xl shadow-sm placeholder-gray-500 bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 sm:text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 bg-background border-border rounded text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-500 dark:text-gray-400">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-slate-500 dark:text-gray-400 hover:text-amber-400 transition-colors">
                    Forgot password?
                  </a>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-navy-900 bg-amber-400 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-[#0d1829] transition-all disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Authenticating...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" /> Access Portal
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 dark:text-gray-500">
              By logging in, you agree to the University's Acceptable Use Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
