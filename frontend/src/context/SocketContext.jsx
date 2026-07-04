import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, token } = useAuth();

  useEffect(() => {
    if (token && user) {
      // Socket connects to the root server URL — strip any trailing /api
      const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        forceNew: true,
        closeOnBeforeunload: true,
        withCredentials: true,
      });

      newSocket.on('connect', () => {
        if (newSocket.connected) {
          console.log('Socket established successfully');
        }
      });

      newSocket.on('notification:new', (notification) => {
        toast.success(
          <div>
            <strong>{notification.title}</strong>
            <div>{notification.message}</div>
          </div>,
          { duration: 4000, position: 'top-right' }
        );
      });

      newSocket.on('security:alert', (alert) => {
        toast.error(
          <div>
            <strong>🚨 {alert.title}</strong>
            <div>{alert.message}</div>
          </div>,
          { duration: 6000, position: 'top-right' }
        );
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [token, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
