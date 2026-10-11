import { useEffect, useState } from 'react';

/** localStorage に永続化される useState */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* noop */
    }
  }, [key, value]);
  return [value, setValue];
}

export const uid = (p = 'id') =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const yen = (n) => `¥${Math.round(n || 0).toLocaleString('ja-JP')}`;

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function defaultTripDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return toISODate(d);
}

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const w = '日月火水木金土'[date.getDay()];
  return `${y}年${m}月${d}日(${w})`;
}

/**
 * 基準日と日程番号（1, 2, 3...）から実際の日付文字列（例: 10月19日(日)）を生成
 */
export function getDayDateString(baseDate, dayNumber) {
  if (!baseDate) return `${dayNumber}日目`;
  try {
    const d = new Date(baseDate);
    if (isNaN(d.getTime())) return `${dayNumber}日目`;
    d.setDate(d.getDate() + (dayNumber - 1));
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return `${month}月${date}日(${dayOfWeek})`;
  } catch {
    return `${dayNumber}日目`;
  }
}

/**
 * Googleマップ外部リンク（APIキー・クレカ不要）
 * destination にスポット名や住所、または緯度経度を指定して公式ナビを起動
 */
export function getGoogleMapsNavUrl(spotName, lat, lng) {
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(spotName)}`;
}

export function getGoogleMapsSearchUrl(spotName, lat, lng) {
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spotName)}&query_place_id=&center=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spotName)}`;
}

/**
 * 2地点間のGoogleマップ公式ルート検索URL（APIキー・クレカ不要）
 * origin, destination にスポット情報（lat/lngまたは名称）を指定
 */
export function getGoogleMapsDirectionsUrl(fromSpot, toSpot, mode = 'car') {
  if (!fromSpot || !toSpot) return 'https://www.google.com/maps';
  const originParam =
    fromSpot.lat != null && fromSpot.lng != null
      ? `${fromSpot.lat},${fromSpot.lng}`
      : encodeURIComponent(fromSpot.name || '出発地');

  const destParam =
    toSpot.lat != null && toSpot.lng != null
      ? `${toSpot.lat},${toSpot.lng}`
      : encodeURIComponent(toSpot.name || '目的地');

  let travelmode = 'driving';
  if (mode === 'transit' || mode === 'train') travelmode = 'transit';
  else if (mode === 'walk') travelmode = 'walking';

  return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=${travelmode}`;
}

/**
 * 時刻文字列 "HH:MM" に指定した分を加算して "HH:MM" を返す
 */
export function addMinutesToTimeString(timeStr, minutesToAdd) {
  if (!timeStr) return '10:00';
  const parts = String(timeStr).split(':');
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  if (isNaN(h)) h = 10;
  if (isNaN(m)) m = 0;

  const totalMin = h * 60 + m + (parseInt(minutesToAdd, 10) || 0);
  // 24時間循環 (0〜1439分)
  const normMin = ((totalMin % 1440) + 1440) % 1440;
  const newH = Math.floor(normMin / 60);
  const newM = normMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * 移動手段の定義
 */
export const TRANSIT_MODES = [
  { id: 'car', label: '車・レンタカー', icon: '🚗', hasDurationInput: true, gmode: 'driving' },
  { id: 'transit', label: '電車・バス（公共交通）', icon: '🚃', hasDurationInput: false, gmode: 'transit' },
  { id: 'walk', label: '徒歩', icon: '🚶', hasDurationInput: true, gmode: 'walking' },
  { id: 'taxi', label: 'タクシー', icon: '🚕', hasDurationInput: true, gmode: 'driving' },
];

/**
 * 割り勘清算: 最小限の送金ペアを貪欲法で算出
 */
export function computeSettlement(members, expenses) {
  const bal = Object.fromEntries(members.map((m) => [m.id, 0]));
  const paid = Object.fromEntries(members.map((m) => [m.id, 0]));
  const owe = Object.fromEntries(members.map((m) => [m.id, 0]));
  let total = 0;

  expenses.forEach((e) => {
    const ps = (e.participantIds || []).filter((id) => id in bal);
    if (!ps.length || !(e.payerId in bal) || !(e.amount > 0)) return;
    const share = e.amount / ps.length;
    total += e.amount;
    bal[e.payerId] += e.amount;
    paid[e.payerId] = (paid[e.payerId] || 0) + e.amount;
    ps.forEach((id) => {
      bal[id] -= share;
      owe[id] = (owe[id] || 0) + share;
    });
  });

  const creditors = [];
  const debtors = [];
  Object.entries(bal).forEach(([id, v]) => {
    const r = Math.round(v);
    if (r > 0) creditors.push({ id, amt: r });
    else if (r < 0) debtors.push({ id, amt: -r });
  });
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const x = Math.min(debtors[i].amt, creditors[j].amt);
    if (x > 0) {
      transfers.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: x,
      });
    }
    debtors[i].amt -= x;
    creditors[j].amt -= x;
    if (debtors[i].amt <= 0) i += 1;
    if (creditors[j].amt <= 0) j += 1;
  }
  return { balances: bal, paid, owe, transfers, total };
}
