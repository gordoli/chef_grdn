import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';
interface SessionState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string;
  refreshProfile: () => Promise<void>;
}
export const SessionContext = createContext<SessionState | null>(null);
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession requires SessionProvider');
  return value;
}
