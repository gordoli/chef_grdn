import { Suspense } from 'react';
import { SignIn } from '@/views/SignIn';
export default function Page() {
  return (
    <Suspense fallback={<div className="page-loader">Opening kitchen access…</div>}>
      <SignIn />
    </Suspense>
  );
}
