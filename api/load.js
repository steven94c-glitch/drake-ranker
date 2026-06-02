import { kv } from '@vercel/kv';

function normalizeEmail(e) {
  return String(e || '').trim().toLowerCase();
}
function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  try {
    const key = normalizeEmail(req.query.email);
    if (!isValidEmail(key)) return res.status(400).json({ error: 'invalid email' });

    const raw = await kv.get(`session:${key}`);
    if (raw === null || raw === undefined) {
      return res.status(404).json({ found: false });
    }
    // KV may auto-parse JSON depending on how it was stored — handle both
    let state;
    if (typeof raw === 'string') {
      try { state = JSON.parse(raw); } catch { state = raw; }
    } else {
      state = raw;
    }
    return res.status(200).json({ found: true, state });
  } catch (e) {
    console.error('load error', e);
    return res.status(500).json({ error: 'server error', detail: String(e && e.message || e) });
  }
}
