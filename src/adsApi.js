import { LOCAL_ADS } from './ads.js'

const env = import.meta.env
const SB_URL = (env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '')
const SB_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  ''
const ready = Boolean(SB_URL && SB_KEY)

const headers = { apikey: SB_KEY, 'Content-Type': 'application/json' }
if (SB_KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${SB_KEY}`

function local(position) {
  return LOCAL_ADS.filter((a) => a.position === position).sort((a, b) => a.sort_order - b.sort_order)
}

export async function loadAds(position) {
  if (!ready) return local(position)
  try {
    const q =
      `${SB_URL}/rest/v1/ads?select=id,title,image_url,link_url,position,lang,sort_order` +
      `&position=eq.${position}&order=sort_order.asc`
    const res = await fetch(q, { headers })
    if (!res.ok) throw new Error('ads ' + res.status)
    const rows = await res.json()
    return rows.length ? rows : local(position)
  } catch (e) {
    return local(position)
  }
}

export function trackAd(id, kind) {
  if (!ready || String(id).startsWith('local-')) return
  try {
    fetch(`${SB_URL}/rest/v1/rpc/track_ad`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_ad_id: id, p_kind: kind }),
      keepalive: true,
    }).catch(() => {})
  } catch (e) {}
}
