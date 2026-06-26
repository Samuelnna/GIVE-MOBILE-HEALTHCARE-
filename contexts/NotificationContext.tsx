import React, { createContext, useState, useCallback, useContext } from 'react';
import type { AppNotification, NotificationType } from '../types';
import Notification from '../components/Notification';

interface NotificationContextType {
  addNotification: (title: string, message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((title: string, message: string, type: NotificationType) => {
    const newNotification = {
      id: Date.now(),
      title,
      message,
      type,
    };
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div
        aria-live="assertive"
        className="fixed inset-0 flex items-start px-4 py-20 pointer-events-none sm:p-6 sm:items-start z-[100]"
      >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
            {notifications.map(notification => (
                <Notification
                    key={notification.id}
                    notification={notification}
                    onClose={removeNotification}
                />
            ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
};
