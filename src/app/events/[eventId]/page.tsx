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

  const event = useQuery(api.events.getEventForArtist, { slug: eventId });
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-600">
        Loading event control room...
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-600">
        Event not found
      </div>
    );
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${event.slug}`;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 pb-12">
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h1 className="font-bold text-stone-900 text-base truncate max-w-xs sm:max-w-md">
            {event.title}
          </h1>
          <Link
            href={`/events/${eventId}/upload`}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm sm:text-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
          >
            <Upload className="w-4 h-4" /> Upload Portrait
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white border border-stone-200 rounded-3xl p-6 text-center flex flex-col items-center justify-center">
            <h3 className="font-bold text-stone-800 text-base mb-1">Fixed Booth Event QR</h3>
            <p className="text-sm text-stone-600 mb-4">Show this QR on your iPad or print for customers to claim artwork</p>
            
            {qrCodeDataUrl ? (
              <div className="bg-white p-4 rounded-2xl mb-4">
                <img src={qrCodeDataUrl} alt="Event QR" className="w-48 h-48 mx-auto" />
              </div>
            ) : (
              <div className="w-48 h-48 bg-stone-100 rounded-2xl animate-pulse mb-4" />
            )}

            <div className="flex items-center gap-2 w-full max-w-xs">
              <button
                onClick={handleCopyUrl}
                className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium py-2 px-3 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy URL'}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-stone-100 hover:bg-stone-200 text-stone-800 p-2 rounded-xl text-sm flex items-center justify-center transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6 flex flex-col justify-between">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-stone-200 rounded-2xl p-5">
                <p className="text-sm text-stone-600 uppercase tracking-wider mb-1 font-semibold">Total Portraits</p>
                <p className="text-3xl font-extrabold text-stone-900">{customers.length}</p>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl p-5">
                <p className="text-sm text-stone-600 uppercase tracking-wider mb-1 font-semibold">Uploaded</p>
                <p className="text-3xl font-extrabold text-brand-600">
                  {customers.filter((c) => c.artworks?.length > 0).length}
                </p>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl p-5 col-span-2 sm:col-span-1">
                <p className="text-sm text-stone-600 uppercase tracking-wider mb-1 font-semibold">Paid Sales</p>
                <p className="text-3xl font-extrabold text-green-700">
                  {customers.filter((c) => c.artworks?.some((a: any) => a.status === 'paid')).length}
                </p>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-stone-900 text-lg">Fast iPad Upload Handoff</h4>
                <p className="text-sm text-stone-600 mt-0.5">
                  Export finished portrait from Procreate, select customer, and upload preview in &lt;30s.
                </p>
              </div>
              <Link
                href={`/events/${eventId}/upload`}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold min-h-12 py-3 px-5 rounded-xl shrink-0 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Open Upload Terminal
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-stone-900">Customer Queue & Portraits</h3>
              <p className="text-sm text-stone-600">Manage portrait claim codes and artwork status</p>
            </div>
            <button
              onClick={() => {
                setCreatedClaimCode(null);
                setCustomerName('');
                setCustomerEmail('');
                setShowCustomerModal(true);
              }}
              className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-medium py-2.5 px-4 rounded-xl flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-brand-600" /> Pre-register Customer
            </button>
          </div>

          {customers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl">
              <p className="text-sm text-stone-600">No customers registered yet for this event.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-600 text-sm uppercase tracking-wider">
                    <th className="pb-3 px-4 font-semibold">Customer</th>
                    <th className="pb-3 px-4 font-semibold">Claim Code</th>
                    <th className="pb-3 px-4 font-semibold">Artwork</th>
                    <th className="pb-3 px-4 font-semibold">Status</th>
                    <th className="pb-3 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {customers.map((c) => {
                    const artwork = c.artworks?.[0];
                    return (
                      <tr key={c._id} className="hover:bg-stone-100 transition-colors">
                        <td className="py-4 px-4 font-medium text-stone-900">
                          {c.name}
                          {c.email && <span className="block text-sm text-stone-600 font-normal">{c.email}</span>}
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-brand-600">{c.claimCode}</td>
                        <td className="py-4 px-4">
                          {artwork ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-green-700 font-medium">
                              <ImageIcon className="w-3.5 h-3.5" /> Uploaded
                            </span>
                          ) : (
                            <span className="text-sm text-stone-600">Pending Upload</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {artwork?.status === 'paid' ? (
                            <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm font-semibold">
                              Paid
                            </span>
                          ) : artwork ? (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-sm font-semibold">
                              Claimable
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded-full text-sm font-semibold">
                              Waiting
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Link
                            href={`/events/${eventId}/upload?customerId=${c._id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 bg-brand-600 text-white border border-brand-100 py-1.5 px-3 rounded-lg transition-colors hover:bg-brand-700"
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
        <div className="fixed inset-0 z-50 bg-stone-900/80 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 w-full max-w-md">
            <h3 className="text-xl font-bold text-stone-900 mb-1">Pre-register Customer</h3>
            <p className="text-sm text-stone-600 mb-6">
              Create customer record in advance and get their 6-character claim code.
            </p>

            {createdClaimCode ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-green-50 border border-green-200 text-green-700 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-stone-800">Customer Created!</h4>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <p className="text-sm text-stone-600 mb-1">Claim Code</p>
                  <p className="text-3xl font-mono font-extrabold text-brand-600 tracking-wider">{createdClaimCode}</p>
                </div>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium py-3 rounded-xl text-sm"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-800 uppercase tracking-wider mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Sam Taylor"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-800 uppercase tracking-wider mb-2">
                    Customer Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="sam@example.com"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(false)}
                    className="px-4 py-2.5 text-sm text-stone-600 hover:text-stone-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCustomer}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all"
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
