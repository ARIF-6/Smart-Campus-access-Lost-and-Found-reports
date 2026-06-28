import React from 'react';
import { useAutoRefreshState } from '../../context/AutoRefreshContext';

/**
 * AutoRefreshIndicator
 * Shows in the AdminLayout header:
 *  - Animated pulsing dot (green while counting down, blue while refreshing)
 *  - Countdown in seconds until next auto-refresh
 *  - "Last refreshed X min ago" timestamp
 *  - Manual refresh button
 */
const AutoRefreshIndicator = () => {
  const { countdown, lastRefreshed, triggerRefresh } = useAutoRefreshState();
  const isRefreshing = countdown <= 1;

  const formatLastRefreshed = () => {
    if (!lastRefreshed) return 'Never';
    const diffMs = Date.now() - lastRefreshed.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm select-none">
      {/* Pulsing status dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isRefreshing ? 'bg-blue-400' : 'bg-emerald-400'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            isRefreshing ? 'bg-blue-500' : 'bg-emerald-500'
          }`}
        />
      </span>

      {/* Countdown */}
      <span className="text-xs font-semibold text-gray-500 tabular-nums min-w-[28px]">
        {isRefreshing ? (
          <span className="text-blue-500">...</span>
        ) : (
          `${countdown}s`
        )}
      </span>

      {/* Divider */}
      <span className="text-gray-200 text-xs">|</span>

      {/* Last refreshed */}
      <span className="text-[11px] font-medium text-gray-400 hidden md:block whitespace-nowrap">
        {formatLastRefreshed()}
      </span>

      {/* Manual refresh button */}
      <button
        onClick={triggerRefresh}
        title="Refresh data now"
        className="ml-1 p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90"
      >
        <svg
          className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
};

export default AutoRefreshIndicator;
