'use client';
import { useEffect, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { SessionProvider } from '@/hooks/SessionProvider';
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator)
      navigator.serviceWorker
        .register('/sw.js')
        .catch((error) => console.error('Could not register app shell', error));
  }, []);
  return (
    <SessionProvider>
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </SessionProvider>
  );
}
