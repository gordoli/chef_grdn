import type { Metadata } from 'next';
import { Restaurants } from '@/views/Restaurants';
export const metadata: Metadata = {
  title: 'Restaurants',
  description: 'Favorite restaurants and places to try.',
};
export default function Page() {
  return <Restaurants />;
}
