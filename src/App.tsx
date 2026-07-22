import React, { useState, useEffect } from 'react';
import LoginPage from './app/(auth)/login/page';
import DashboardPage from './app/dashboard/page';
import NewEventPage from './app/events/new/page';
import EventControlRoomPage from './app/events/[eventId]/page';
import IPadUploadTerminalPage from './app/events/[eventId]/upload/page';
import PublicEventClaimPage from './app/e/[slug]/page';
import ArtworkPurchasePage from './app/artwork/[claimToken]/page';
import CheckoutSuccessPage from './app/checkout/success/page';

export default function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Simple client routing matcher
  if (route.startsWith('/events/') && route.endsWith('/upload')) {
    return <IPadUploadTerminalPage />;
  }
  if (route.startsWith('/events/') && route !== '/events/new') {
    return <EventControlRoomPage />;
  }
  if (route === '/events/new') {
    return <NewEventPage />;
  }
  if (route.startsWith('/e/')) {
    return <PublicEventClaimPage />;
  }
  if (route.startsWith('/artwork/')) {
    return <ArtworkPurchasePage />;
  }
  if (route.startsWith('/checkout/success')) {
    return <CheckoutSuccessPage />;
  }
  if (route === '/dashboard') {
    return <DashboardPage />;
  }

  return <LoginPage />;
}
