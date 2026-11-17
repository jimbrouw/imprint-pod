'use client';

import { useEffect } from 'react';
import { page, card, h2, muted, btnPrimary } from '@/components/ui';

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div className={`${page} flex items-center justify-center p-4`}>
      <div className={`${card} max-w-lg w-full space-y-4`}>
        <h1 className={h2}>Something went wrong</h1>
        {isDev ? (
          <pre className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-4 whitespace-pre-wrap break-words">
            {error.message || 'Unknown error'}
          </pre>
        ) : (
          <p className={muted}>Something went wrong. Please try again.</p>
        )}
        <button onClick={reset} className={btnPrimary}>
          Try again
        </button>
      </div>
    </div>
  );
}
