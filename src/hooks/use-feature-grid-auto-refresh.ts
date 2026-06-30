import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { refreshActiveFeatureGrids } from './refresh-active-feature-grids';

/** Polls the active feature store on the same interval as Settings auto-refresh. */
export function useFeatureGridAutoRefresh(intervalMs: number) {
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  useEffect(() => {
    if (!intervalMs || intervalMs < 5000) {
      return;
    }

    let cancelled = false;

    const tick = async () => {
      try {
        await refreshActiveFeatureGrids(pathnameRef.current);
      } catch {
        if (cancelled) return;
      }
    };

    const timer = setInterval(() => void tick(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);
}
