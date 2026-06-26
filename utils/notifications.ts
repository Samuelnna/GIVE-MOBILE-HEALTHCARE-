/**
 * Checks if the Notifications API is supported and requests permission from the user.
 * @returns {Promise<NotificationPermission>} The permission status ('granted', 'denied', or 'default').
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return 'denied';
  }

  // Let's check whether notification permissions have already been granted
  if (Notification.permission === 'granted') {
    return 'granted';
  }

  // Otherwise, we need to ask the user for permission
  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Displays a system notification if permission has been granted.
 * @param {string} title The title of the notification.
 * @param {NotificationOptions} [options] Optional parameters for the notification (e.g., body, icon).
 */
export const showNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  } else {
    console.log('Notification permission has not been granted.');
  }
};
