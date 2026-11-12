"use client";

import React, { useEffect, useState } from 'react';
import App from '../App';
import { NotificationProvider } from '../contexts/NotificationContext';
import Homepage from './Homepage';

export default function Page() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    setHasSession(Boolean(localStorage.getItem('currentUser')));
    if (new URLSearchParams(window.location.search).get('care') === 'doctors') setShowAuth(true);
    setIsCheckingSession(false);
  }, []);

  if (isCheckingSession) {
    return <div className="min-h-screen bg-[#f5faf8]" />;
  }

  return (
    <NotificationProvider>
      {hasSession || showAuth ? <App onBackToHome={() => setShowAuth(false)} /> : <Homepage onGetStarted={() => setShowAuth(true)} />}
    </NotificationProvider>
  );
}
