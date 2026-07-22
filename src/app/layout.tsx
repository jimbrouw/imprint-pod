import type { Metadata } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Imprint — Live Portrait Checkout',
  description: 'Turn a finished live portrait into a paid, delivered keepsake in under thirty seconds.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased font-sans bg-zinc-950 text-zinc-50 selection:bg-ember-500 selection:text-white min-h-screen">
        <div className="grain fixed inset-0 z-50 pointer-events-none" />
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
