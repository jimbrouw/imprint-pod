import type { Metadata, Viewport } from 'next';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Drawn Checkout',
  description: 'Draw it. Share a link. Get paid.',
  applicationName: 'Drawn Checkout',
  appleWebApp: { capable: true, title: 'Drawn', statusBarStyle: 'default' },
  icons: { apple: '/pwa-icon/180' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0369a1',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-stone-50 text-stone-900 min-h-screen">
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
