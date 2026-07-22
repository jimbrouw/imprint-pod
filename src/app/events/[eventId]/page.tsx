'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

import { generateQRCodeDataUrl } from '@/lib/qr';
import { ArrowLeft, UploadSimple, UserPlus, Copy, Check, ArrowSquareOut, ImageSquare } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';

export default function EventControlRoomPage() {
  const params = useParams();
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
      if (!event) throw new Error('Event not loaded');
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
      <div className="min-h-[100dvh] bg-zinc-950 max-w-6xl mx-auto px-4 sm:px-6 pt-24 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center text-zinc-500">
        Event not found
      </div>
    );
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${event.slug}`;
  const uploadedCount = customers.filter((c) => c.artworks?.length > 0).length;
  const paidCount = customers.filter((c) => c.artworks?.some((a: any) => a.status === 'paid')).length;

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 pb-16">
      <header className="border-b border-zinc-800/80 sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          >
            <ArrowLeft size={16} weight="bold" /> Dashboard
          </Link>
          <h1 className="font-semibold text-zinc-50 text-sm truncate">{event.title}</h1>
          <Link href={`/events/${eventId}/upload`}>
            <Button className="!py-2 !px-4 text-xs shrink-0">
              <UploadSimple size={14} weight="bold" /> Upload
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 border border-zinc-800 rounded-3xl p-6 text-center flex flex-col items-center justify-center">
            <h3 className="font-semibold text-zinc-200 text-sm mb-1">Your event's QR code</h3>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">Show this on your iPad, or print it out for your stand</p>

            {qrCodeDataUrl ? (
              <div className="bg-zinc-50 p-3 rounded-2xl mb-4">
                <img src={qrCodeDataUrl} alt="Event QR" className="w-40 h-40 mx-auto" />
              </div>
            ) : (
              <Skeleton className="w-40 h-40 mb-4" />
            )}

            <div className="flex items-center gap-2 w-full max-w-xs">
              <Button variant="secondary" onClick={handleCopyUrl} className="flex-1 !py-2 !px-3 text-xs">
                {copied ? <Check size={14} weight="bold" className="text-emerald-400" /> : <Copy size={14} weight="bold" />}
                {copied ? 'Copied' : 'Copy URL'}
              </Button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 p-2.5 rounded-xl transition-colors"
              >
                <ArrowSquareOut size={16} weight="bold" />
              </a>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6 flex flex-col justify-between">
            <div className="grid grid-cols-3 divide-x divide-zinc-800 border border-zinc-800 rounded-2xl">
              <div className="px-5 py-5">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Portraits</p>
                <p className="text-3xl font-mono font-semibold text-zinc-50">{customers.length}</p>
              </div>
              <div className="px-5 py-5">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Uploaded</p>
                <p className="text-3xl font-mono font-semibold text-ember-400">{uploadedCount}</p>
              </div>
              <div className="px-5 py-5">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Paid</p>
                <p className="text-3xl font-mono font-semibold text-emerald-400">{paidCount}</p>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-zinc-50 text-base">Ready to upload a portrait?</h4>
                <p className="text-sm text-zinc-500 mt-0.5 leading-relaxed">
                  Finish the drawing, then come here to upload it and give your customer their code.
                </p>
              </div>
              <Link href={`/events/${eventId}/upload`} className="shrink-0">
                <Button variant="secondary">
                  <UploadSimple size={16} weight="bold" /> Upload a portrait
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="border border-zinc-800 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-zinc-50">Your customers</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Who's waiting, and what's been uploaded</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setCreatedClaimCode(null);
                setCustomerName('');
                setCustomerEmail('');
                setShowCustomerModal(true);
              }}
              className="!py-2.5 !px-4 text-sm"
            >
              <UserPlus size={16} weight="bold" className="text-ember-400" /> Add a customer
            </Button>
          </div>

          {customers.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
              <p className="text-sm text-zinc-600">No customers added yet for this event.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="pb-3 px-4 font-medium">Customer</th>
                    <th className="pb-3 px-4 font-medium">Claim code</th>
                    <th className="pb-3 px-4 font-medium">Artwork</th>
                    <th className="pb-3 px-4 font-medium">Status</th>
                    <th className="pb-3 px-4 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {customers.map((c) => {
                    const artwork = c.artworks?.[0];
                    return (
                      <tr key={c._id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-4 px-4 font-medium text-zinc-50">
                          {c.name}
                          {c.email && <span className="block text-xs text-zinc-500 font-normal">{c.email}</span>}
                        </td>
                        <td className="py-4 px-4 font-mono font-semibold text-ember-400">{c.claimCode}</td>
                        <td className="py-4 px-4">
                          {artwork ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                              <ImageSquare size={14} weight="bold" /> Uploaded
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">Pending</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {artwork?.status === 'paid' ? (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
                              Paid
                            </span>
                          ) : artwork ? (
                            <span className="px-2.5 py-1 bg-ember-500/10 text-ember-400 border border-ember-500/20 rounded-full text-xs font-medium">
                              Claimable
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-zinc-900 text-zinc-500 border border-zinc-800 rounded-full text-xs font-medium">
                              Waiting
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Link
                            href={`/events/${eventId}/upload?customerId=${c._id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-ember-400 hover:text-ember-300 bg-ember-500/10 border border-ember-500/20 py-1.5 px-3 rounded-lg transition-colors"
                          >
                            <UploadSimple size={14} weight="bold" /> {artwork ? 'Re-upload' : 'Upload'}
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
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 w-full max-w-md">
            <h3 className="text-xl font-semibold tracking-tight text-zinc-50 mb-1">Add a customer</h3>
            <p className="text-xs text-zinc-500 mb-6">
              Add their name now and get a 6-character code to give them.
            </p>

            {createdClaimCode ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <Check size={20} weight="bold" />
                </div>
                <h4 className="text-sm font-medium text-zinc-200">Customer created</h4>
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">Claim code</p>
                  <p className="text-3xl font-mono font-semibold text-ember-400 tracking-wider">{createdClaimCode}</p>
                </div>
                <Button variant="secondary" onClick={() => setShowCustomerModal(false)} className="w-full">
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <Field
                  label="Customer name"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Priya Anand"
                />
                <Field
                  label="Customer email (optional)"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="priya@example.com"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCustomerModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingCustomer}>
                    {submittingCustomer ? 'Saving…' : 'Generate claim code'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
