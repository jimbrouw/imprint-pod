'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Palette, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const handleDemoAccess = () => {
    // Set a cookie so the Clerk middleware knows to bypass auth for this session
    document.cookie = 'demo_mode=true; path=/; max-age=86400; SameSite=Lax';
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 mb-4">
            <Palette className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Live Artist Checkout</h1>
          <p className="text-sm text-slate-400 mt-1">iPad-based live portrait handover platform</p>
        </div>

        {/* Demo Fast Access */}
        <div className="mb-6 p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs text-sky-400 font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Local Demo Mode
          </div>
          <p className="text-xs text-slate-300">Test the dashboard & iPad terminal immediately without an account.</p>
          <button
            onClick={handleDemoAccess}
            type="button"
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm py-3 px-4 rounded-xl shadow transition-all flex items-center justify-center gap-2"
          >
            Enter Artist Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col gap-3">
          <button
            onClick={() => router.push('/sign-in')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm py-3 px-4 rounded-xl transition-all"
          >
            Sign In with Clerk
          </button>
          <button
            onClick={() => router.push('/sign-up')}
            className="w-full border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-medium text-sm py-3 px-4 rounded-xl transition-all"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
