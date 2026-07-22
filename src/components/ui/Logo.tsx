import { PenNib } from '@phosphor-icons/react/dist/ssr';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'w-14 h-14 rounded-2xl' : size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl';
  const iconSize = size === 'lg' ? 28 : size === 'sm' ? 16 : 20;

  return (
    <div className={`${dims} bg-ember-500 flex items-center justify-center text-zinc-950 shrink-0`}>
      <PenNib size={iconSize} weight="bold" />
    </div>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      Imprint
    </span>
  );
}
