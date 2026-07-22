'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

import { generateQRCodeDataUrl } from '@/lib/qr';
import { ArrowLeft, Upload, UserPlus, Copy, Check, ExternalLink, Image as ImageIcon } from 'lucide-react';

export default function EventControlRoomPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const event = useQuery(api.events.getEventBySlug, { slug: eventId });
  const customers = useQuery(api.events.getCustomerQueue, event ? { eventId: event._id } : 'skip') || [];
  const createCustomer = useMutation(api.customers.createCustomer);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [createdClaimCode, setCreatedClaimCode] = useState<string | null>(null);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);

  useEffect(() => {
    async function loadQR() {
      if (!event) return;
      const publicUrl = `${window.location.origin}/e/${event.slug}`;
      const qrData = await generateQRCodeDataUrl(publicUrl);
      setQrCodeDataUrl(qrData);
    }
    loadQR();
  }, [event]);

  const handleCopyUrl = () => {
    if (!event) return;
    const publicUrl = `${window.location.origin}/e/${event.slug}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCustomer(true);

    try {
      if (!event) throw new Error("Event not loaded");
      const { claimCode } = await createCustomer({
        eventId: event._id,
        name: customerName,
        email: customerEmail || undefined,
      });
      setCreatedClaimCode(claimCode);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingCustomer(false);
    }
  };

  if (event === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading event control room...
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Event not found
      </div>
    );
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${event.slug}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h1 className="font-bold text-white text-base truncate max-w-xs sm:max-w-md">
            {event.title}
          </h1>
          <Link
            href={`/events/${eventId}/upload`}
            className="bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
          >
            <Upload className="w-4 h-4" /> Upload Portrait
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center flex flex-col items-center justify-center">
            <h3 className="font-bold text-slate-200 text-base mb-1">Fixed Booth Event QR</h3>
            <p className="text-xs text-slate-400 mb-4">Show this QR on your iPad or print for customers to claim artwork</p>
            
            {qrCodeDataUrl ? (
              <div className="bg-white p-4 rounded-2xl shadow-xl mb-4">
                <img src={qrCodeDataUrl} alt="Event QR" className="w-48 h-48 mx-auto" />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-800 rounded-2xl animate-pulse mb-4" />
            )}

            <div className="flex items-center gap-2 w-full max-w-xs">
              <button
                onClick={handleCopyUrl}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy URL'}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl text-xs flex items-center justify-center transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6 flex flex-col justify-between">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Total Portraits</p>
                <p className="text-3xl font-extrabold text-white">{customers.length}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Uploaded</p>
                <p className="text-3xl font-extrabold text-sky-400">
                  {customers.filter((c) => c.artworks?.length > 0).length}
                </p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Paid Sales</p>
                <p className="text-3xl font-extrabold text-emerald-400">
                  {customers.filter((c) => c.artworks?.some((a: any) => a.status === 'paid')).length}
                </p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-lg">Fast iPad Upload Handoff</h4>
                <p className="text-sm text-slate-400 mt-0.5">
                  Export finished portrait from Procreate, select customer, and upload preview in &lt;30s.
                </p>
              </div>
              <Link
                href={`/events/${eventId}/upload`}
                className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold py-3 px-5 rounded-xl shadow-lg shadow-sky-500/20 shrink-0 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Open Upload Terminal
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Customer Queue & Portraits</h3>
              <p className="text-xs text-slate-400">Manage portrait claim codes and artwork status</p>
            </div>
            <button
              onClick={() => {
                setCreatedClaimCode(null);
                setCustomerName('');
                setCustomerEmail('');
                setShowCustomerModal(true);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium py-2.5 px-4 rounded-xl flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-sky-400" /> Pre-register Customer
            </button>
          </div>

          {customers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <p className="text-sm text-slate-500">No customers registered yet for this event.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 px-4 font-semibold">Customer</th>
                    <th className="pb-3 px-4 font-semibold">Claim Code</th>
                    <th className="pb-3 px-4 font-semibold">Artwork</th>
                    <th className="pb-3 px-4 font-semibold">Status</th>
                    <th className="pb-3 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {customers.map((c) => {
                    const artwork = c.artworks?.[0];
                    return (
                      <tr key={c._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-4 font-medium text-white">
                          {c.name}
                          {c.email && <span className="block text-xs text-slate-400 font-normal">{c.email}</span>}
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-sky-400">{c.claimCode}</td>
                        <td className="py-4 px-4">
                          {artwork ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                              <ImageIcon className="w-3.5 h-3.5" /> Uploaded
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Pending Upload</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {artwork?.status === 'paid' ? (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                              Paid
                            </span>
                          ) : artwork ? (
                            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold">
                              Claimable
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-semibold">
                              Waiting
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Link
                            href={`/events/${eventId}/upload?customerId=${c._id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-500/10 border border-sky-500/20 py-1.5 px-3 rounded-lg transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" /> {artwork ? 'Re-upload' : 'Upload'}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-1">Pre-register Customer</h3>
            <p className="text-xs text-slate-400 mb-6">
              Create customer record in advance and get their 6-character claim code.
            </p>

            {createdClaimCode ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">Customer Created!</h4>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-xs text-slate-400 mb-1">Claim Code</p>
                  <p className="text-3xl font-mono font-extrabold text-sky-400 tracking-wider">{createdClaimCode}</p>
                </div>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl text-sm"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Sam Taylor"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Customer Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="sam@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(false)}
                    className="px-4 py-2.5 text-sm text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCustomer}
                    className="bg-sky-500 hover:bg-sky-400 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all"
                  >
                    {submittingCustomer ? 'Saving...' : 'Generate Claim Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
