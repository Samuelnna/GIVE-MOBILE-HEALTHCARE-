import React from 'react';
import { User } from '../types';

interface PendingDashboardProps {
  user: User;
  onLogout: () => void;
  onEditProfile: () => void;
}

import { useNotification } from '../contexts/NotificationContext';

import { useEffect } from 'react';
import { supabase } from '../src/supabaseClient';

const PendingDashboard: React.FC<PendingDashboardProps> = ({ user, onLogout, onEditProfile }) => {
  const { addNotification } = useNotification();
  
  // Auto-refresh status check
  useEffect(() => {
    const checkStatus = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single();
      
      if (data?.status === 'active') {
        // Force a page reload to update the app state
        window.location.reload();
      }
    };

    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [user.id]);

  const handleResend = () => {
    addNotification('Verification Request Sent', 'An urgent reminder has been sent to the administration team.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
        <div className="bg-amber-50 border-b border-amber-100 p-6 text-center">
          <h2 className="text-xl font-bold text-amber-800 uppercase tracking-wider mb-2">VERIFICATION IN PROGRESS</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <ul className="space-y-4">
            <li className="flex items-center gap-3 text-slate-700">
              <span className="text-green-500 text-xl">✅</span> 
              <span>Step 1: Account created</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700">
              <span className="text-sky-500 text-xl">🔄</span> 
              <span>Step 2: Documents uploaded</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700 font-medium bg-amber-50 p-2 rounded-lg border border-amber-100">
              <span className="text-amber-500 text-xl">⏳</span> 
              <span>Step 3: Admin review (24hrs)</span>
            </li>
          </ul>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
            <p className="text-slate-600 text-sm mb-1">We will email you at:</p>
            <p className="font-bold text-slate-800">{user.email}</p>
            <p className="text-slate-600 text-sm mt-1">when verification is complete.</p>
          </div>

          <div className="text-center text-sm text-slate-500">
            Meanwhile, you can edit your profile or log out.
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <button 
              onClick={onLogout}
              className="w-full bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-lg hover:bg-slate-200 transition-colors"
            >
              LOG OUT
            </button>
            <button 
              className="w-full text-sky-600 font-semibold py-2 px-4 rounded-lg hover:underline transition-colors text-sm"
              onClick={handleResend}
            >
              Resend Verification Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingDashboard;
