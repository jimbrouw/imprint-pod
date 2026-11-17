'use client';

import { useState, useEffect, useCallback } from 'react';

export type StripeState = 'loading' | 'not_connected' | 'finish_setup' | 'ready';

/** Syncs the artist's Stripe Connect status and exposes a connect/finish-setup action. */
export function useStripeConnect() {
  const [state, setState] = useState<StripeState>('loading');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/connect/status')
      .then((r) => r.json())
      .then((d) => setState(d.complete ? 'ready' : d.connected ? 'finish_setup' : 'not_connected'))
      .catch(() => setState('not_connected'));
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/connect/onboard', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error?.message || 'Could not start Stripe onboarding');
    } catch {
      setError('Could not reach Stripe. Try again.');
    } finally {
      setConnecting(false);
    }
  }, []);

  return { state, connecting, error, connect };
}
