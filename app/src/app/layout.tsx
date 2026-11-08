import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Providers } from '@/components/Providers';
import '../styles.css';
const poppins = localFont({
  src: [
    { path: '../../scripts/assets/Poppins-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../scripts/assets/Poppins-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../scripts/assets/Poppins-SemiBold.ttf', weight: '600', style: 'normal' },
  ],
  variable: '--font-poppins',
  display: 'swap',
});
const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chef-grdn.vercel.app';
export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: { default: 'Chef GRDN · Recipe book', template: '%s · Chef GRDN' },
  description: 'A little collection of things worth cooking again.',
  applicationName: 'Chef GRDN',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    title: 'Chef GRDN',
    description: 'A little collection of things worth cooking again.',
    url: origin,
    siteName: 'Chef GRDN',
    images: [
      {
        url: '/og-image.png',
        width: 1600,
        height: 900,
        alt: 'Smiling pixel Chef Gordon holding a spatula and kitchen knife above Chef GRDN.',
      },
    ],
  },
  twitter: { card: 'summary_large_image', title: 'Chef GRDN', images: ['/og-image.png'] },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090909' },
  ],
};
const themeScript =
  "try{const theme=localStorage.getItem('grdn.theme');document.documentElement.classList.toggle('dark',theme==='dark'||(!theme&&matchMedia('(prefers-color-scheme: dark)').matches))}catch{}";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={poppins.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
