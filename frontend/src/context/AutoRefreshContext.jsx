import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';

/**
 * AutoRefreshContext
 * Provides a global refresh signal to all child pages/components.
 * Pages subscribe with useAutoRefreshSignal() and run their fetchData
 * whenever the signal fires.
 */

const AutoRefreshContext = createContext(null);

// Default interval: 30 seconds
const DEFAULT_INTERVAL_MS = 30000;

export const AutoRefreshProvider = ({ children, intervalMs = DEFAULT_INTERVAL_MS }) => {
  const [countdown, setCountdown] = useState(Math.floor(intervalMs / 1000));
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // bump to signal subscribers
  const isPaused = useRef(false);
  const countdownRef = useRef(Math.floor(intervalMs / 1000));

  // Pause when tab hidden
  useEffect(() => {
    const onVisibility = () => {
      isPaused.current = document.hidden;
      if (!document.hidden) {
        // Refresh immediately when tab comes back
        fire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const fire = useCallback(() => {
    setRefreshKey(k => k + 1);
    setLastRefreshed(new Date());
    countdownRef.current = Math.floor(intervalMs / 1000);
    setCountdown(countdownRef.current);
  }, [intervalMs]);

  // 1-second countdown tick
  useEffect(() => {
    const id = setInterval(() => {
      if (isPaused.current) return;
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        fire();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [fire]);

  // Manual trigger exposed to header button
  const triggerRefresh = useCallback(() => {
    fire();
  }, [fire]);

  return (
    <AutoRefreshContext.Provider value={{ countdown, lastRefreshed, triggerRefresh, refreshKey }}>
      {children}
    </AutoRefreshContext.Provider>
  );
};

/** Hook for the UI indicator (AdminLayout header) */
export const useAutoRefreshState = () => {
  const ctx = useContext(AutoRefreshContext);
  if (!ctx) throw new Error('useAutoRefreshState must be used within AutoRefreshProvider');
  return ctx;
};

/** Hook for pages — returns a refreshKey that changes every interval */
export const useAutoRefreshSignal = () => {
  const ctx = useContext(AutoRefreshContext);
  if (!ctx) return { refreshKey: 0 };
  return { refreshKey: ctx.refreshKey, triggerRefresh: ctx.triggerRefresh };
};

export default AutoRefreshContext;
