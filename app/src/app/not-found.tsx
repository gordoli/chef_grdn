import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function NotFound() {
  return (
    <div className="auth-state">
      <h1>A little off the menu.</h1>
      <p>We couldn’t find that page.</p>
      <Button asChild>
        <Link href="/">Back to recipes</Link>
      </Button>
    </div>
  );
}
