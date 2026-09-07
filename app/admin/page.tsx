"use client";

import React, { useState } from 'react';
import { HospitalIcon, ArrowLeftIcon } from '../../components/IconComponents';
import { supabase } from '../../src/supabaseClient';
import { useNotification } from '../../contexts/NotificationContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import App from '../../App';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { addNotification } = useNotification();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      if (email === 'admin@givehealthcare.com') {
          setIsLoggedIn(true);
          setIsAdmin(true);
          // Store in localStorage for App component to pick up
          const user = {
            id: data.user?.id || '',
            name: 'Administrator',
            email: email,
            hospitalId: 'MH-ADMIN',
            userType: 'admin',
            status: 'active',
          };
          localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
          throw new Error('Unauthorized access. Admin credentials required.');
      }
    } catch (error) {
      addNotification('Authentication Failed', (error as Error).message, 'error');
    }
  };

  if (isLoggedIn && isAdmin) {
      return <App />;
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col justify-center items-center p-4 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="max-w-md w-full">
        <div className="flex flex-col justify-center items-center gap-3 mb-8">
          <div className="bg-white p-2 rounded-2xl shadow-sm">
            <img src="/mobiledoclogo.jpeg" alt="MobileDoc Logo" className="h-28 w-28 rounded-2xl object-contain bg-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight text-center">
            MobileDoc Admin Portal
          </h1>
          <p className="text-emerald-700 text-sm text-center font-bold tracking-wide uppercase italic">Restricted Access</p>
        </div>
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-emerald-500/5 border border-slate-100">
            <form onSubmit={handleLogin} className="space-y-4">
                <input
                    type="email"
                    placeholder="Admin Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white text-slate-800 font-medium"
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white text-slate-800 font-medium"
                    required
                />
                <button type="submit" className="w-full bg-slate-900 text-white font-extrabold py-4 px-4 rounded-2xl hover:bg-black transition-all shadow-lg active:scale-[0.98] mt-6 tracking-wide">
                    Admin Sign In
                </button>
            </form>
            <a href="/" className="flex items-center justify-center gap-2 mt-6 text-slate-500 hover:text-slate-800 text-sm font-bold transition-colors">
                <ArrowLeftIcon className="h-4 w-4" /> Return to Main Site
            </a>
            <a href="/about" className="block text-center mt-3 text-slate-400 hover:text-slate-700 text-xs font-bold">About MobileDoc</a>
        </div>
      </div>
    </div>
  );
};

export default function Page() {
    return (
        <NotificationProvider>
            <AdminLoginPage />
        </NotificationProvider>
    )
}
