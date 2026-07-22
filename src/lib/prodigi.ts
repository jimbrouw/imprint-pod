import { ProductSize, ShippingAddress } from './types';

const PRODIGI_API_KEY = process.env.PRODIGI_API_KEY || 'mock-prodigi-key';
const PRODIGI_BASE_URL = process.env.PRODIGI_BASE_URL || 'https://api.sandbox.prodigi.com/v4.0';

const SKU_MAP: Record<ProductSize, string> = {
  A5: process.env.PRODIGI_SKU_A5 || 'GLOBAL-ART-A5',
  A4: process.env.PRODIGI_SKU_A4 || 'GLOBAL-ART-A4',
  A3: process.env.PRODIGI_SKU_A3 || 'GLOBAL-ART-A3',
};

export interface ProdigiOrderPayload {
  orderId: string;
  artworkUrl: string;
  productSize: ProductSize;
  recipientName: string;
  shippingAddress: ShippingAddress;
  recipientEmail?: string;
}

export async function createProdigiOrder(payload: ProdigiOrderPayload) {
  if (PRODIGI_API_KEY === 'mock-prodigi-key') {
    console.log('[PRODIGI MOCK] Creating print order:', payload.orderId);
    return {
      id: `prodigi_mock_${payload.orderId.slice(0, 8)}`,
      status: 'submitted',
    };
  }

  const sku = SKU_MAP[payload.productSize];
  const response = await fetch(`${PRODIGI_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': PRODIGI_API_KEY,
    },
    body: JSON.stringify({
      idempotencyKey: payload.orderId,
      merchantReference: payload.orderId,
      shippingMethod: 'Budget',
      recipient: {
        name: payload.recipientName,
        email: payload.recipientEmail,
        address: {
          line1: payload.shippingAddress.line1,
          line2: payload.shippingAddress.line2,
          townOrCity: payload.shippingAddress.city,
          stateOrCounty: payload.shippingAddress.state,
          postalOrZipCode: payload.shippingAddress.postcode,
          countryCode: payload.shippingAddress.country,
        },
      },
      items: [
        {
          sku: sku,
          copies: 1,
          sizing: 'fillPrintArea',
          assets: [
            {
              printArea: 'default',
              url: payload.artworkUrl,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Prodigi API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return {
    id: data.order?.id || data.id,
    status: data.order?.status?.stage || 'submitted',
  };
}
