import { redirect } from 'next/navigation';
export default function Page() {
  redirect('/demo?add=1');
}
