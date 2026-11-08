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
 * 開始日(YYYY-MM-DD)と泊数(stayDays: 1=日帰り, 2=1泊2日...)から終了日(YYYY-MM-DD)を計算
 */
export function calcEndDateFromStayDays(startDate, stayDays = 1) {
  if (!startDate) return '';
  try {
    const [y, m, d] = startDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return '';
    const daysToAdd = Math.max(1, stayDays) - 1;
    date.setDate(date.getDate() + daysToAdd);
    return toISODate(date);
  } catch {
    return '';
  }
}

/**
 * 開始日(YYYY-MM-DD)と終了日(YYYY-MM-DD)から総日数（stayDays: 1以上）を計算
 * 例: 2026-11-01 〜 2026-11-01 => 1 (日帰り)
 * 例: 2026-11-01 〜 2026-11-02 => 2 (1泊2日)
 */
export function calcStayDaysFromDates(startDate, endDate) {
  if (!startDate) return 1;
  if (!endDate) return 1;
  try {
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  } catch {
    return 1;
  }
}

/**
 * stayDays (1, 2, 3...) から泊数・日数の日本語ラベルを生成
 * 例: 1 => '日帰り（1日間）'
 * 例: 2 => '1泊2日（2日間）'
 * 例: 5 => '4泊5日（5日間）'
 */
export function formatStayDaysLabel(stayDays) {
  const days = Math.max(1, Number(stayDays) || 1);
  if (days === 1) return '日帰り（1日間）';
  return `${days - 1}泊${days}日（${days}日間）`;
}

/**
 * 開始日と終了日の期間表示（例: 2026年11月1日(日) 〜 11月3日(火)）
 */
export function formatDateRange(startDate, endDate) {
  if (!startDate) return '';
  if (!endDate || startDate === endDate) {
    return formatDate(startDate);
  }
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const startObj = new Date(sy, sm - 1, sd);
  const endObj = new Date(ey, em - 1, ed);
  const sw = '日月火水木金土'[startObj.getDay()];
  const ew = '日月火水木金土'[endObj.getDay()];

  if (sy === ey) {
    return `${sy}年${sm}月${sd}日(${sw}) 〜 ${em}月${ed}日(${ew})`;
  }
  return `${sy}年${sm}月${sd}日(${sw}) 〜 ${ey}年${em}月${ed}日(${ew})`;
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

/**
 * 旅行のしおりをLINEやSNSで友達と共有するためのテキスト整形関数
 */
export function formatTripForLineShare(trip) {
  if (!trip) return '';
  const lines = [];
  lines.push(`🎒【旅のしおり】${trip.title || '旅行計画'}`);

  if (trip.date) {
    const endStr = trip.endDate ? ` 〜 ${trip.endDate}` : '';
    const daysLabel = formatStayDaysLabel(trip.stayDays || 1);
    lines.push(`📅 日程: ${trip.date}${endStr} (${daysLabel})`);
  }
  if (trip.memo) {
    lines.push(`💡 合言葉・テーマ: ${trip.memo}`);
  }
  lines.push('────────────────');

  const itinerary = trip.itinerary || [];
  const stayDays = Math.max(1, trip.stayDays || 1);

  for (let day = 1; day <= stayDays; day++) {
    lines.push(`\n【${day}日目】`);
    if (day === 1 && trip.startPoint?.name) {
      lines.push(`🏠 ${trip.startPoint.time || '08:30'} 出発：${trip.startPoint.name}`);
      if (trip.startPoint.memo) {
        lines.push(`   └ 📝 ${trip.startPoint.memo}`);
      }
    }

    const daySpots = itinerary.filter((s) => (s.day || 1) === day);
    if (daySpots.length === 0 && day !== 1) {
      lines.push('（自由行動・予定なし）');
    }

    daySpots.forEach((spot, idx) => {
      // 直前からの移動情報
      if (spot.transitMode && spot.transitMin) {
        const modeDef = TRANSIT_MODES.find((m) => m.id === spot.transitMode) || { icon: '🚗', label: '車' };
        const h = Math.floor(Number(spot.transitMin) / 60);
        const m = Number(spot.transitMin) % 60;
        const durStr = h > 0 ? `${h}時間${m > 0 ? `${m}分` : ''}` : `${m}分`;
        lines.push(`   ↓ (${modeDef.icon} ${modeDef.label} 約${durStr})`);
      }

      const timeStr = spot.time ? `${spot.time} ` : '';
      const stayStr = spot.stayMin ? `（滞在 約${spot.stayMin}分）` : '';
      lines.push(`📍 ${timeStr}${spot.name} ${stayStr}`);
      if (spot.memo) {
        lines.push(`   └ 📝 ${spot.memo}`);
      }
      if (spot.googleMapsUrl) {
        lines.push(`   └ 🗺️ ${spot.googleMapsUrl}`);
      }
    });
  }

  lines.push('\n────────────────');
  lines.push('✨ タビトモで作成した旅のしおり');
  return lines.join('\n');
}
