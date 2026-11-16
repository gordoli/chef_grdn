import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/demo/restaurants?roll=1');
}
