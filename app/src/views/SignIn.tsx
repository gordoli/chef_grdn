'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Redirect } from '@/components/Redirect';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Moon, Sun } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';
import { useTheme } from '@/hooks/useTheme';
import { safeAuthDestination, passwordError } from '@/lib/auth';
export function SignIn() {
  const { session, loading } = useSession();
  const { dark, toggleTheme } = useTheme();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [requestReset, setRequestReset] = useState(false);
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const resetPassword = params.get('mode') === 'reset-password';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const next = safeAuthDestination(params.get('next'));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!supabase) throw new Error('The recipe book connection is not configured.');
      if (resetPassword) {
        const validation = passwordError(password, confirmation);
        if (validation) throw new Error(validation);
        if (!session) throw new Error('Request a fresh password email to continue.');
        const { error: failure } = await supabase.auth.updateUser({ password });
        if (failure) throw failure;
        setPassword('');
        setConfirmation('');
        setSaved(true);
      } else if (requestReset) {
        const redirect = new URL('/sign-in', window.location.origin);
        redirect.searchParams.set('mode', 'reset-password');
        redirect.searchParams.set('next', next);
        const { error: failure } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: redirect.href,
        });
        if (failure) throw failure;
        setSent(true);
      } else {
        const { error: failure } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (failure)
          throw new Error(
            'Email or password is incorrect. You can set or reset your password below.',
          );
        setPassword('');
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  if (session && !loading && !resetPassword) return <Redirect href={next} />;
  return (
    <div className="sign-in-page">
      <header>
        <Link href="/">
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
          {saved ? (
            <>
              <span className="sign-in-icon">
                <Check />
              </span>
              <h2>Password saved.</h2>
              <p>You can now sign in with your email and password.</p>
              <Button asChild>
                <Link href={next}>
                  Open recipe book
                  <ArrowRight />
                </Link>
              </Button>
            </>
          ) : sent ? (
            <>
              <span className="sign-in-icon">
                <Check />
              </span>
              <h2>Check your inbox.</h2>
              <p>
                If {email} has an account, you’ll receive an email to set a password. Open it on
                this device.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSent(false);
                  setRequestReset(false);
                  setError('');
                }}
              >
                <ArrowLeft />
                Back to sign in
              </Button>
            </>
          ) : resetPassword && !session ? (
            <>
              <span className="sign-in-icon">
                <LockKeyhole />
              </span>
              <h2>{loading ? 'Checking your link…' : 'Open your password email.'}</h2>
              <p>
                {loading
                  ? 'One moment while we verify your session.'
                  : 'Use the link in your password email to continue. If it has expired, request a new one.'}
              </p>
              {!loading && (
                <Button asChild variant="outline">
                  <Link href="/sign-in">Back to sign in</Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <span className="sign-in-icon">
                <LockKeyhole strokeWidth={1.5} />
              </span>
              <span className="eyebrow">KITCHEN ACCESS</span>
              <h2>
                {resetPassword
                  ? 'Choose your password.'
                  : requestReset
                    ? 'Set your password.'
                    : 'Welcome back.'}
              </h2>
              <p>
                {resetPassword
                  ? 'Choose a password with at least 8 characters.'
                  : requestReset
                    ? 'Enter your account email to create your first password or reset an existing one.'
                    : 'Sign in with your email and password to add recipes, edit the collection, and upload photos.'}
              </p>
              <form onSubmit={(event) => void submit(event)}>
                {!resetPassword && (
                  <>
                    <label htmlFor="email">Email address</label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                    />
                  </>
                )}
                {!requestReset && (
                  <>
                    <label htmlFor="password">{resetPassword ? 'New password' : 'Password'}</label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={resetPassword ? 'new-password' : 'current-password'}
                      required
                      minLength={resetPassword ? 8 : undefined}
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={busy}
                    />
                  </>
                )}
                {resetPassword && (
                  <>
                    <label htmlFor="confirmation">Confirm password</label>
                    <Input
                      id="confirmation"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={128}
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      disabled={busy}
                    />
                  </>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <Button disabled={busy} size="lg">
                  {busy
                    ? 'Please wait…'
                    : resetPassword
                      ? 'Save password'
                      : requestReset
                        ? 'Send password setup email'
                        : 'Sign in'}
                  <ArrowRight />
                </Button>
              </form>
              {!resetPassword && (
                <Button
                  className="auth-secondary-action"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setRequestReset(!requestReset);
                    setPassword('');
                    setError('');
                  }}
                >
                  {requestReset ? 'Back to sign in' : 'Set or reset password'}
                </Button>
              )}
            </>
          )}
          <div className="sign-in-divider" />
          <Link href="/" className="preview-link">
            Browse the recipe book
            <ArrowUpRightIcon />
          </Link>
          <Link href="/demo" className="demo-link">
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
