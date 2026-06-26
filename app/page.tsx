"use client";

import React from 'react';
import App from '../App';
import { NotificationProvider } from '../contexts/NotificationContext';

export default function Page() {
  return (
    <NotificationProvider>
      <App />
    </NotificationProvider>
  );
}
