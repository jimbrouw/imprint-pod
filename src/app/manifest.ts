import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Drawn Checkout',
    short_name: 'Drawn',
    description: 'Draw it. Share a link. Get paid.',
    start_url: '/sell',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#fafaf9',
    theme_color: '#0369a1',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
