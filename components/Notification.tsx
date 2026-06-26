import React, { useEffect, useState } from 'react';
import type { AppNotification } from '../types';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, CloseIcon } from './IconComponents';

interface NotificationProps {
  notification: AppNotification;
  onClose: (id: number) => void;
}

const icons = {
  success: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
  error: <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />,
  warning: <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />,
  info: <InformationCircleIcon className="h-6 w-6 text-sky-500" />,
};

const colors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-sky-50 border-sky-200',
};

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  const { id, title, message, type } = notification;
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(() => onClose(id), 300); // Wait for exit animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose(id), 300);
  };
  
  return (
    <div
      className={`
        w-full max-w-sm rounded-lg shadow-lg pointer-events-auto overflow-hidden border
        ${colors[type]}
        transition-all duration-300 ease-in-out
        ${exiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        animate-slide-in-right
      `}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {icons[type]}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-bold text-slate-800">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className="inline-flex rounded-md bg-transparent text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              <span className="sr-only">Close</span>
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notification;
