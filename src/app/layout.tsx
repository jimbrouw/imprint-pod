import type { Metadata } from 'next';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Drawn Checkout',
  description: 'Draw it. Share a link. Get paid.',
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
