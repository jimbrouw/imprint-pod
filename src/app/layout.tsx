import type { Metadata } from 'next';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Live Artist Checkout',
  description: 'Ultra-fast live event portrait delivery and checkout platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-50 selection:bg-sky-500 selection:text-white min-h-screen">
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
