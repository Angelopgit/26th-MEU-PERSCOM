/**
 * Returns the correct base origin for uploaded files (images, PDFs, etc.)
 *
 * In production:  VITE_API_URL = 'https://railway.app/api'
 *   → strip /api  → 'https://railway.app'
 *   → images load directly from Railway (no Apache proxy needed)
 *
 * In development: no VITE_API_URL, BASE_URL = '/'
 *   → base = '' → /uploads/... served via Vite proxy
 */
export const ASSET_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : import.meta.env.BASE_URL.replace(/\/$/, '');

export const imgUrl = (path) => (path ? `${ASSET_BASE}${path}` : '');
