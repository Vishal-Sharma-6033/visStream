import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

const resolveSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  const fallbackSocketUrl = `http://${runtimeHost}:5000`;

  if (!envUrl) return fallbackSocketUrl;

  try {
    const parsed = new URL(envUrl);
    const isEnvLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const isRuntimeLocalhost = runtimeHost === 'localhost' || runtimeHost === '127.0.0.1';

    if (isEnvLocalhost && !isRuntimeLocalhost) {
      parsed.hostname = runtimeHost;
      return parsed.toString().replace(/\/$/, '');
    }

    return envUrl;
  } catch {
    return fallbackSocketUrl;
  }
};

const SOCKET_URL = resolveSocketUrl();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('wp_token');
    if (!user || !token) {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      setConnected(false);
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect',    () => { console.log('🔌 Socket connected'); setConnected(true); });
    socket.on('disconnect', () => { console.log('❌ Socket disconnected'); setConnected(false); });
    socket.on('connect_error', (err) => console.error('Socket connect error:', err.message));

    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user]);

  const emit = useCallback((event, data) => { socketRef.current?.emit(event, data); }, []);
  const on   = useCallback((event, fn) => { socketRef.current?.on(event, fn);   return () => socketRef.current?.off(event, fn); }, []);
  const off  = useCallback((event, fn) => { socketRef.current?.off(event, fn); }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef, connected, emit, on, off }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
};
