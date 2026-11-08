import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Mail, Moon, Sun } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';
import { useTheme } from '@/hooks/useTheme';
export function SignIn() {
  const { session, loading } = useSession();
  const { dark, toggleTheme } = useTheme();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requested = params.get('next') ?? '/';
  const next =
    requested.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\')
      ? requested
      : '/';
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!supabase) throw new Error('Supabase is not configured yet. Explore the preview below.');
      const { error: failure } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/sign-in?next=${encodeURIComponent(next)}`,
        },
      });
      if (failure)
        throw new Error(
          failure.status === 400
            ? 'That email isn’t on the invite list. Ask Gordon to invite you.'
            : failure.message,
        );
      setSent(true);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Could not send the link. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (session && !loading) return <Navigate to={next} replace />;
  return (
    <div className="sign-in-page">
      <header>
        <Link to="/">
          <Brand />
        </Link>
        <Button size="icon" variant="ghost" aria-label="Toggle color theme" onClick={toggleTheme}>
          {dark ? <Sun /> : <Moon />}
        </Button>
      </header>
      <div className="sign-in-layout">
        <div className="sign-in-story">
          <span className="eyebrow">A LITTLE COLLECTION OF GOOD THINGS</span>
          <h1>
            Recipes to
            <br />
            come home to<span>.</span>
          </h1>
          <p>
            From Gordon’s kitchen, with love.
            <br />A personal collection of things worth cooking again.
          </p>
          <span className="sign-in-decoration" aria-hidden="true">
            grdn.
          </span>
        </div>
        <div className="sign-in-card">
          {sent ? (
            <>
              <span className="sign-in-icon">
                <Check />
              </span>
              <h2>Check your inbox.</h2>
              <p>
                We sent a sign-in link to <strong>{email}</strong>. Open it on this device to get
                cooking.
              </p>
              <Button variant="outline" onClick={() => setSent(false)}>
                <ArrowLeft />
                Use another email
              </Button>
            </>
          ) : (
            <>
              <span className="sign-in-icon">
                <Mail strokeWidth={1.5} />
              </span>
              <span className="eyebrow">KITCHEN ACCESS</span>
              <h2>Welcome back.</h2>
              <p>
                Sign in to add recipes, edit the collection, or leave a note about something you’ve
                made.
              </p>
              <form onSubmit={(event) => void submit(event)}>
                <label htmlFor="email">Email address</label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <Button disabled={busy} size="lg">
                  {busy ? 'Sending your link…' : 'Send a sign-in link'}
                  <ArrowRight />
                </Button>
              </form>
              <small>No password to remember. Just a little link.</small>
            </>
          )}
          <div className="sign-in-divider" />
          <Link to="/" className="preview-link">
            Browse the recipe book
            <ArrowUpRightIcon />
          </Link>
          <Link to="/demo" className="demo-link">
            Explore an editable preview
          </Link>
        </div>
      </div>
      <footer>A little collection. A lot of good food.</footer>
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={16} />;
}
