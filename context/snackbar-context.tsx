import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type SnackbarType = 'success' | 'error' | 'info' | 'warning';

export interface SnackbarMessage {
  message: string;
  type: SnackbarType;
  duration?: number;
}

interface SnackbarContextType {
  showSnackbar: (options: SnackbarMessage) => void;
  hideSnackbar: () => void;
  snackbar: SnackbarMessage | null;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (context === undefined) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

export const SnackbarProvider = ({ children }: { children: ReactNode }) => {
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);

  const showSnackbar = useCallback((options: SnackbarMessage) => {
    console.log('--- showSnackbar invoked ---', options); // Added clearer log
    setSnackbar(options);
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar(null);
  }, []);

  const value = {
    showSnackbar,
    hideSnackbar,
    snackbar,
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
    </SnackbarContext.Provider>
  );
};
