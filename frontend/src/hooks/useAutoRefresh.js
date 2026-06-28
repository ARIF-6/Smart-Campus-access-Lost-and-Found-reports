import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * useAutoRefresh
 * Calls `callback` every `intervalMs` milliseconds.
 * Pauses automatically when the browser tab is hidden.
 * Returns { countdown, lastRefreshed, triggerRefresh } for UI display.
 *
 * @param {Function} callback  - async function to run on each tick
 * @param {number}   intervalMs - refresh interval in ms (default 30 000)
 * @param {boolean}  enabled   - set false to disable (default true)
 */
const useAutoRefresh = (callback, intervalMs = 30000, enabled = true) => {
  const [countdown, setCountdown] = useState(Math.floor(intervalMs / 1000));
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const callbackRef = useRef(callback);
  const countdownRef = useRef(Math.floor(intervalMs / 1000));
  const isPaused = useRef(false);

  // Keep callback ref current so interval doesn't need to re-register
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Pause/resume when tab visibility changes
  useEffect(() => {
    const onVisibility = () => {
      isPaused.current = document.hidden;
      if (!document.hidden) {
        // Immediately refresh when tab becomes visible again
        countdownRef.current = Math.floor(intervalMs / 1000);
        setCountdown(countdownRef.current);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [intervalMs]);

  const triggerRefresh = useCallback(async () => {
    await callbackRef.current?.();
    setLastRefreshed(new Date());
    countdownRef.current = Math.floor(intervalMs / 1000);
    setCountdown(countdownRef.current);
  }, [intervalMs]);

  useEffect(() => {
    if (!enabled) return;

    // 1-second tick for countdown display
    const tickId = setInterval(() => {
      if (isPaused.current) return;

      countdownRef.current -= 1;
      setCountdown(countdownRef.current);

      if (countdownRef.current <= 0) {
        countdownRef.current = Math.floor(intervalMs / 1000);
        setCountdown(countdownRef.current);
        callbackRef.current?.().then(() => setLastRefreshed(new Date()));
      }
    }, 1000);

    return () => clearInterval(tickId);
  }, [enabled, intervalMs]);

  return { countdown, lastRefreshed, triggerRefresh };
};

export default useAutoRefresh;
