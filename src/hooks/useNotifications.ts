import { useState, useEffect, useCallback } from 'react';
import { Notification } from '@/types';
import { generateUUID } from '@/lib/utils';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Carrega notificações do localStorage
  useEffect(() => {
    try {
      const storedNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      setNotifications(storedNotifications);
    } catch (error) {
      console.error("Failed to load notifications from localStorage", error);
      setNotifications([]);
    }
  }, []);

  // Salva notificações no localStorage sempre que o estado mudar
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((message: string, type: Notification['type'] = 'info', link?: string) => {
    const newNotification: Notification = {
      id: generateUUID(),
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      link,
    };
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(notif => notif.id === id ? { ...notif, read: true } : notif));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  }, []);

  const unreadCount = notifications.filter(notif => !notif.read).length;

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    unreadCount,
  };
}