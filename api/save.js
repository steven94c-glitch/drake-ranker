import { kv } from '@vercel/kv';

const MAX_BYTES = 2_000_000;     // 2 MB safety cap per session
const TTL_DAYS = 365;            // sessions kept for a year

function normalizeEmail(e) {
  return String(e || '').trim().toLowerCase();
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export default async function handler(req, res) {
  // CORS — allow same-origin and direct calls from any subdomain of the deployment
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const { email, state } = req.body || {};
    const key = normalizeEmail(email);
    if (!isValidEmail(key)) {
      return res.status(400).json({ error: 'invalid email' });
    }
    if (!state || typeof state !== 'object') {
      return res.status(400).json({ error: 'state required' });
    }

    const payload = JSON.stringify(state);
    if (payload.length > MAX_BYTES) {
      return res.status(413).json({ error: 'state too large' });
    }

    await kv.set(`session:${key}`, payload, { ex: TTL_DAYS * 24 * 60 * 60 });
    return res.status(200).json({ ok: true, bytes: payload.length });
  } catch (e) {
    console.error('save error', e);
    return res.status(500).json({ error: 'server error', detail: String(e && e.message || e) });
  }
}
