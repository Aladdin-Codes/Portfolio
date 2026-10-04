'use client';

import { createContext, useContext, useMemo, useState, type ReactNode, createElement } from 'react';

export type SignalContextValue = {
  isOpen: boolean;
  openSignal: () => void;
  closeSignal: () => void;
  toggleSignal: () => void;
};

const SignalContext = createContext<SignalContextValue | undefined>(undefined);

export function SignalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<SignalContextValue>(
    () => ({
      isOpen,
      openSignal: () => setIsOpen(true),
      closeSignal: () => setIsOpen(false),
      toggleSignal: () => setIsOpen((current) => !current),
    }),
    [isOpen],
  );

  return createElement(SignalContext.Provider, { value }, children);
}

export function useSignal() {
  const context = useContext(SignalContext);

  if (!context) {
    throw new Error('useSignal must be used within a SignalProvider.');
  }

  return context;
}
