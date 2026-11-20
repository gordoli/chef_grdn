'use client';
import { useEffect, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { RestaurantImportProvider } from '@/hooks/RestaurantImportProvider';
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
      <RestaurantImportProvider>{children}</RestaurantImportProvider>
      <Toaster position="bottom-right" richColors closeButton />
    </SessionProvider>
  );
}
