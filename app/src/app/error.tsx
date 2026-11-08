'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="auth-state">
      <h1>Something went off recipe.</h1>
      <p>Please try opening the collection again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
