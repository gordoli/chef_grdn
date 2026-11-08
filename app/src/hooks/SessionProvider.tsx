import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';
import { Redirect } from '@/components/Redirect';
import { supabase } from '@/lib/supabase';
import { SessionContext, useSession } from './useSession';
import type { Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/utils';
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function refreshProfile() {
    if (!supabase) return;
    const {
      data: { session: current },
    } = await supabase.auth.getSession();
    if (current) {
      const { data, error: failure } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', current.user.id)
        .single();
      if (failure) throw failure;
      setProfile(data);
    }
  }
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, current) => {
      if (active) setSession(current);
    });
    supabase.auth.getSession().then(({ data, error: failure }) => {
      if (!active) return;
      if (failure) setError(failure.message);
      setSession(data.session);
      setLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (!session) {
      setProfile(null);
      return;
    }
    const client = supabase;
    if (!client) return;
    setLoading(true);
    client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error: failure }) => {
        if (!active) return;
        setProfile(data);
        setError(failure ? `Could not load your profile: ${failure.message}` : '');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);
  return (
    <SessionContext.Provider value={{ session, profile, loading, error, refreshProfile }}>
      {children}
    </SessionContext.Provider>
  );
}
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, profile, loading, error, refreshProfile } = useSession();
  const pathname = usePathname();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  if (pathname.startsWith('/demo') || (!pathname.endsWith('/new') && !pathname.endsWith('/edit')))
    return <>{children}</>;
  if (loading)
    return (
      <div className="page-loader">
        <span className="loading-dot" />
        Opening your recipe book…
      </div>
    );
  if (!session) return <Redirect href={`/sign-in?next=${encodeURIComponent(pathname)}`} />;
  if (error || !profile)
    return (
      <div className="auth-state">
        <h1>A little setup first</h1>
        <p>{error || 'Your profile could not be loaded.'}</p>
        <p>Check SETUP.md to initialize the Supabase database.</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
        <Button variant="ghost" onClick={() => void supabase?.auth.signOut()}>
          Sign out
        </Button>
      </div>
    );
  if (profile.display_name === session.user.email?.split('@')[0])
    return (
      <form
        className="auth-state"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          try {
            if (!supabase) throw new Error('Supabase is not configured.');
            const { error: failure } = await supabase
              .from('profiles')
              .update({ display_name: name.trim() })
              .eq('id', profile.id);
            if (failure) throw failure;
            await refreshProfile();
          } catch (failure) {
            setSaveError(errorMessage(failure));
          } finally {
            setSaving(false);
          }
        }}
      >
        <h1>Make yourself at home.</h1>
        <p>What name should show on your reviews?</p>
        <label htmlFor="display-name" className="sr-only">
          Your name
        </label>
        <Input
          id="display-name"
          required
          minLength={2}
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
        {saveError && <p role="alert">{saveError}</p>}
        <Button disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Open recipe book'}</Button>
      </form>
    );
  return <>{children}</>;
}
