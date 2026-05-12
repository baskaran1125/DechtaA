// hooks/useSocket.js
// ──────────────────────────────────────────────────────────────
// Socket.io client hook for QC Driver App
// Provides real-time order pings, GPS updates, notifications
// ──────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { io } from 'socket.io-client';
import { TokenStore, DriverStore, DRIVER_BACKEND_URL } from '../services/api';

const SOCKET_URL = DRIVER_BACKEND_URL;

export function useSocket({ onNewOrder, onOrderUpdate, onNotification } = {}) {
  const socketRef = useRef(null);
  const onNewOrderRef = useRef(onNewOrder);
  const onOrderUpdateRef = useRef(onOrderUpdate);
  const onNotificationRef = useRef(onNotification);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
    onOrderUpdateRef.current = onOrderUpdate;
    onNotificationRef.current = onNotification;
  }, [onNewOrder, onOrderUpdate, onNotification]);

  useEffect(() => {
    let socket;
    let cancelled = false;

    const connect = async () => {
      if (Platform.OS === 'web') return;

      const token = await TokenStore.get();
      const driver = await DriverStore.get();

      if (cancelled || !token || !driver) return;

      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        // Register driver identity with the server
        socket.emit('driver:register', { driverId: driver.id });
        console.log('[Socket] Connected and registered');
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        console.log('[Socket] Disconnected');
      });

      // New order pushed to this driver
      socket.on('order:new', (order) => {
        console.log('[Socket] New order received:', order.id);
        onNewOrderRef.current?.(order);
      });

      // Order status update
      socket.on('order:updated', (data) => {
        onOrderUpdateRef.current?.(data);
      });

      // Push notification
      socket.on('notification:new', (notification) => {
        onNotificationRef.current?.(notification);
      });

      socket.on('connect_error', (err) => {
        console.log('[Socket] Connection error:', err.message);
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, []);

  // Send GPS ping via socket (faster than HTTP)
  const sendGpsPing = useCallback(({ driverId, tripId, latitude, longitude }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('driver:gps_ping', { driverId, tripId, latitude, longitude });
    }
  }, []);

  // Join a trip chat room
  const joinTripRoom = useCallback((tripId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('trip:join', { tripId });
    }
  }, []);

  // Send chat message
  const sendChatViaSocket = useCallback((tripId, message, senderId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('trip:chat_message', {
        tripId,
        message,
        senderId,
        senderType: 'driver',
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  // Update online status
  const setDriverStatus = useCallback((driverId, isOnline) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('driver:status', { driverId, isOnline });
    }
  }, []);

  // Listen for chat messages in a trip
  const onTripChat = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('trip:chat_message', callback);
      return () => socketRef.current?.off('trip:chat_message', callback);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    sendGpsPing,
    joinTripRoom,
    sendChatViaSocket,
    setDriverStatus,
    onTripChat,
  };
}
