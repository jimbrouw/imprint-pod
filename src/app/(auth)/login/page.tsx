'use client';

import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Lightning } from '@phosphor-icons/react';
import { Logo, Wordmark } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();

  const handleDemoAccess = () => {
    document.cookie = 'demo_mode=true; path=/; max-age=86400; SameSite=Lax';
    router.push('/dashboard');
  };

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
      {/* Left: content */}
      <div className="flex items-center justify-center px-6 py-16 lg:px-16">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="flex items-center gap-3 mb-12">
            <Logo />
            <Wordmark className="text-xl text-zinc-50" />
          </div>

          <h1 className="text-4xl tracking-tighter leading-none font-semibold text-zinc-50 mb-3">
            Draw it. Upload it. Get paid.
          </h1>
          <p className="text-base text-zinc-400 leading-relaxed max-w-[38ch] mb-10">
            Made for artists who draw live on an iPad. Finish the picture, upload it here, and your customer can pay and take it home before they walk away.
          </p>

          <div className="mb-6 p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs text-ember-400 font-medium uppercase tracking-wider">
              <ShieldCheck size={16} weight="bold" /> Try it first
            </div>
            <p className="text-sm text-zinc-400">
              Have a look around before you sign up — no account needed.
            </p>
            <Button onClick={handleDemoAccess} className="w-full">
              Take a look around <ArrowRight size={16} weight="bold" />
            </Button>
          </div>

          <div className="border-t border-zinc-800/80 pt-6 flex flex-col gap-3">
            <Button variant="secondary" onClick={() => router.push('/sign-in')} className="w-full">
              Sign in
            </Button>
            <Button variant="ghost" onClick={() => router.push('/sign-up')} className="w-full">
              Create an account
            </Button>
          </div>
        </div>
      </div>

      {/* Right: asymmetric visual panel */}
      <div className="hidden lg:flex relative overflow-hidden bg-zinc-900 items-end p-16">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 70% 20%, rgba(194,112,61,0.18), transparent 60%), radial-gradient(ellipse 50% 60% at 20% 90%, rgba(194,112,61,0.10), transparent 60%)',
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(9,9,11,0.4)_100%)]" />

        <div className="relative z-10 flex items-center gap-3 text-sm text-zinc-400">
          <Lightning size={16} weight="fill" className="text-ember-400 shrink-0" />
          <span>No queues, no laptops — just your iPad and theirs.</span>
        </div>
      </div>
    </div>
  );
}
