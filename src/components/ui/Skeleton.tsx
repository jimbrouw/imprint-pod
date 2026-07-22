export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-shimmer animate-shimmer rounded-lg ${className}`} />;
}

export function StatusDot({ tone = 'ember' }: { tone?: 'ember' | 'emerald' | 'zinc' }) {
  const colors = {
    ember: 'bg-ember-400',
    emerald: 'bg-emerald-400',
    zinc: 'bg-zinc-500',
  };
  return (
    <span className="relative flex h-2 w-2">
      <span className={`absolute inline-flex h-full w-full rounded-full ${colors[tone]} animate-breathe`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colors[tone]}`} />
    </span>
  );
}
