'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ArrowLeft } from 'lucide-react';

const fmt = (minor: number, currency = 'gbp') =>
  (minor / 100).toLocaleString('en-GB', { style: 'currency', currency: currency.toUpperCase() });

export default function AdminPage() {
  const data = useQuery(api.admin.overview);

  if (data === undefined) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading…</div>;
  }
  if (data === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 p-4 text-center">
        Not authorised. Add your Clerk user id to ADMIN_USER_IDS in the Convex environment.
      </div>
    );
  }

  const { totals, artists, orders } = data;
  const stat = (label: string, value: string | number, tone = 'text-white') => (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">{label}</p>
      <p className={`text-2xl font-extrabold ${tone}`}>{value}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <header className="border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h1 className="font-bold text-white">Platform Admin</h1>
          <span />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stat('Artists', totals.artists)}
          {stat('Events', totals.events)}
          {stat('Paid orders', totals.paidOrders)}
          {stat('Print orders', totals.prints)}
          {stat('Gross revenue', fmt(totals.gross), 'text-emerald-400')}
          {stat('Platform fees', fmt(totals.fees), 'text-sky-400')}
          {stat('Failed fulfilments', totals.failedFulfilments, totals.failedFulfilments ? 'text-rose-400' : 'text-white')}
        </div>

        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 overflow-x-auto">
          <h2 className="text-lg font-bold text-white mb-4">Artists</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="pb-3 px-3">Name</th><th className="pb-3 px-3">Email</th><th className="pb-3 px-3">Stripe</th>
                <th className="pb-3 px-3">Events</th><th className="pb-3 px-3">Orders</th><th className="pb-3 px-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {artists.map((a) => (
                <tr key={a.id}>
                  <td className="py-3 px-3 font-medium">{a.name}</td>
                  <td className="py-3 px-3 text-slate-400">{a.email}</td>
                  <td className="py-3 px-3">{a.onboardingComplete ? 'Active' : a.stripeConnected ? 'Incomplete' : 'Not connected'}</td>
                  <td className="py-3 px-3">{a.events}</td>
                  <td className="py-3 px-3">{a.orders}</td>
                  <td className="py-3 px-3 text-right">{fmt(a.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 overflow-x-auto">
          <h2 className="text-lg font-bold text-white mb-4">Recent orders</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="pb-3 px-3">Date</th><th className="pb-3 px-3">Event</th><th className="pb-3 px-3">Item</th>
                <th className="pb-3 px-3">Payment</th><th className="pb-3 px-3">Fulfilment</th>
                <th className="pb-3 px-3 text-right">Amount</th><th className="pb-3 px-3 text-right">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-3 px-3 text-slate-400">{new Date(o.createdAt).toLocaleString('en-GB')}</td>
                  <td className="py-3 px-3">{o.event}</td>
                  <td className="py-3 px-3">{o.type === 'print' ? `Print ${o.productSize}` : 'Digital'}</td>
                  <td className="py-3 px-3">{o.paymentStatus}</td>
                  <td className="py-3 px-3" title={o.failureMessage ?? undefined}>
                    <span className={o.fulfilmentStatus === 'failed' ? 'text-rose-400 font-semibold' : ''}>
                      {o.fulfilmentStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">{fmt(o.amount, o.currency)}</td>
                  <td className="py-3 px-3 text-right">{fmt(o.platformFee, o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
