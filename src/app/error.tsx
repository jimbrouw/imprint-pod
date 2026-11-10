'use client';

import { useEffect } from 'react';

// Shows the real error instead of Next's generic "Application error" screen.
export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
        <h1 className="text-xl font-bold text-white">Something went wrong</h1>
        <pre className="text-xs text-rose-300 bg-slate-950 border border-slate-800 rounded-xl p-4 whitespace-pre-wrap break-words">
          {error.message || 'Unknown error'}
        </pre>
        <button
          onClick={reset}
          className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
