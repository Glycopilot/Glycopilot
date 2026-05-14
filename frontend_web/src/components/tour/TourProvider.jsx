import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { tourSteps } from './tour-steps';

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const stop = useCallback(() => {
    setActive(false);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => Math.min(tourSteps.length - 1, i + 1));
  }, []);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const goTo = useCallback((i) => {
    if (i >= 0 && i < tourSteps.length) setStepIndex(i);
  }, []);

  const value = useMemo(
    () => ({
      active,
      stepIndex,
      total: tourSteps.length,
      start,
      stop,
      next,
      prev,
      goTo,
    }),
    [active, stepIndex, start, stop, next, prev, goTo]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour doit être utilisé à l\'intérieur d\'un <TourProvider>');
  }
  return ctx;
}
