import { InputHTMLAttributes, forwardRef } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, className = '', id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-zinc-950 border rounded-xl py-3 px-4 text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 transition-colors ${
            error
              ? 'border-rose-800/80 focus:ring-rose-700/50'
              : 'border-zinc-800 focus:ring-ember-600/50 focus:border-ember-700'
          } ${className}`}
          {...props}
        />
        {hint && !error && <p className="text-xs text-zinc-500">{hint}</p>}
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    );
  }
);
Field.displayName = 'Field';
