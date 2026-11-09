import type { Metadata } from 'next';
import { Basics } from '@/views/Basics';
export const metadata: Metadata = {
  title: 'Kitchen basics',
  description: 'Cooking temperatures, steak doneness, kitchen skills, and everyday conversions.',
};
export default function Page() {
  return <Basics />;
}
