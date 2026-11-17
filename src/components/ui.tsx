// Shared class strings so pages stay consistent and short.
// Light theme: white/off-white surfaces, near-black text, one accent (brand-600).

export const page = 'min-h-screen bg-stone-50 text-stone-900';
export const container = 'w-full max-w-3xl mx-auto px-4 py-6 sm:py-10';
export const card = 'bg-white border border-stone-200 rounded-2xl p-5 sm:p-6';
export const h1 = 'text-2xl sm:text-3xl font-bold tracking-tight text-stone-900';
export const h2 = 'text-lg font-semibold text-stone-900';
export const muted = 'text-base text-stone-600';
export const label = 'block text-base font-medium text-stone-800 mb-1.5';
export const input =
  'w-full min-h-12 bg-white border border-stone-300 rounded-xl px-4 text-base text-stone-900 placeholder-stone-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20';

const btnBase =
  'inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const btnPrimary = `${btnBase} bg-brand-600 text-white hover:bg-brand-700`;
export const btnSecondary = `${btnBase} bg-white text-stone-900 border border-stone-300 hover:bg-stone-100`;
export const btnDanger = `${btnBase} bg-white text-red-700 border border-red-300 hover:bg-red-50`;

export const alertError = 'p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-base flex items-start gap-2';
export const alertWarn = 'p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-base';
export const alertOk = 'p-4 bg-green-50 border border-green-200 rounded-xl text-green-900 text-base';
