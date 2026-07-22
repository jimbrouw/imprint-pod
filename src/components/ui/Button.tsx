import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-spring active:scale-[0.98] active:translate-y-px disabled:opacity-40 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary: 'bg-ember-500 hover:bg-ember-400 text-zinc-950 shadow-[0_8px_24px_-8px_rgba(194,112,61,0.55)]',
  secondary: 'bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800',
  ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60',
  danger: 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-900/60',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} rounded-xl py-3 px-5 text-sm ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
