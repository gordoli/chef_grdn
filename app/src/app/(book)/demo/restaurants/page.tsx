import type { Metadata } from 'next';
import { Restaurants } from '@/views/Restaurants';
export const metadata: Metadata = {
  title: 'Restaurants preview',
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Restaurants />;
}
