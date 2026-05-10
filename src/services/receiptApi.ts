// Update BASE_URL to your machine's LAN IP when testing on a physical device
const BASE_URL = 'https://hisaber-production.up.railway.app';

export async function validateReceipt(base64: string): Promise<{ is_receipt: boolean }> {
  const res = await fetch(`${BASE_URL}/api/receipt/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: base64 }),
  });
  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`Validate failed: ${res.status}`);
  return res.json();
}

export async function extractReceipt(
  base64: string,
): Promise<{ store_name: string; items: Array<{ name: string; price: number }> }> {
  const res = await fetch(`${BASE_URL}/api/receipt/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: base64 }),
  });
  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`Extract failed: ${res.status}`);
  return res.json();
}
