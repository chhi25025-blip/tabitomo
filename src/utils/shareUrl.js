/**
 * 旅行のしおり・割り勘データをURLパラメータ経由で共有するためのユーティリティ
 * サーバー不要で、データをURLセーフなBase64文字列に変換して共有リンクを生成します。
 */

/**
 * 旅行データと割り勘データをURL用に軽量化（キー短縮）
 */
function packTripData(trip, warikan = null, focusTab = 'shiori') {
  if (!trip && !warikan) return null;

  const packed = trip
    ? {
        t: trip.title || '旅のしおり',
        d: trip.date || '',
        ed: trip.endDate || '',
        sd: trip.stayDays || 1,
        s: trip.style || 'drive',
        m: trip.memo || '',
        sp: trip.startPoint
          ? {
              n: trip.startPoint.name || '自宅・出発地',
              t: trip.startPoint.time || '08:30',
              m: trip.startPoint.memo || '',
              lat: trip.startPoint.lat,
              lng: trip.startPoint.lng,
            }
          : null,
        it: (trip.itinerary || []).map((s) => ({
          n: s.name,
          c: s.category || '立ち寄り',
          ic: s.icon || '📍',
          lat: s.lat,
          lng: s.lng,
          t: s.time || '10:00',
          sm: s.stayMin || 45,
          m: s.memo || '',
          d: s.day || 1,
          tm: s.transitMode || 'car',
          tmin: s.transitMin != null ? s.transitMin : 20,
          gurl: s.googleMapsUrl || null,
        })),
        cp: (trip.customPacking || []).map((p) => ({
          n: p.name,
          c: p.category || 'その他',
        })),
      }
    : {};

  // 割り勘メンバー＆支出記録をインデックス参照で軽量パック
  if (warikan && Array.isArray(warikan.members) && warikan.members.length > 0) {
    const memberIdxMap = new Map();
    packed.wm = warikan.members.map((mem, idx) => {
      memberIdxMap.set(mem.id, idx);
      return mem.name;
    });
    packed.we = (warikan.expenses || []).map((exp) => ({
      t: exp.title,
      a: exp.amount,
      p: memberIdxMap.has(exp.payerId) ? memberIdxMap.get(exp.payerId) : 0,
      ps: (exp.participantIds || [])
        .map((pid) => memberIdxMap.get(pid))
        .filter((idx) => idx !== undefined),
      d: exp.date || '',
    }));
  }

  if (focusTab && focusTab !== 'shiori') {
    packed.tab = focusTab;
  }

  return packed;
}

/**
 * 短縮されたデータを通常のTripオブジェクト＆Warikanデータに復元
 */
function unpackTripData(packed) {
  if (!packed) return null;
  const ts = Date.now();
  const newTripId = `trip-shared-${ts}-${Math.random().toString(36).slice(2, 6)}`;

  const hasTrip = Boolean(packed.t || (Array.isArray(packed.it) && packed.it.length > 0));
  const trip = hasTrip
    ? {
        id: newTripId,
        title: packed.t || '共有された旅のしおり',
        date: packed.d || '',
        endDate: packed.ed || '',
        stayDays: packed.sd || 1,
        style: packed.s || 'drive',
        memo: packed.m || '',
        startPoint: packed.sp
          ? {
              name: packed.sp.n || '自宅・出発地',
              time: packed.sp.t || '08:30',
              memo: packed.sp.m || '',
              lat: packed.sp.lat,
              lng: packed.sp.lng,
            }
          : { name: '自宅・出発地', time: '08:30', memo: '' },
        itinerary: (packed.it || []).map((s, idx) => ({
          id: `spot-shared-${ts}-${idx}`,
          name: s.n || 'スポット',
          category: s.c || '立ち寄り',
          icon: s.ic || '📍',
          lat: s.lat,
          lng: s.lng,
          time: s.t || '10:00',
          stayMin: s.sm || 45,
          memo: s.m || '',
          day: s.d || 1,
          transitMode: s.tm || 'car',
          transitMin: s.tmin != null ? s.tmin : 20,
          googleMapsUrl: s.gurl || null,
        })),
        customPacking: (packed.cp || []).map((p) => ({
          name: p.n || '',
          category: p.c || 'その他',
        })),
        checkedPacking: {},
        excludedPacking: {},
      }
    : null;

  let warikan = null;
  if (Array.isArray(packed.wm) && packed.wm.length > 0) {
    const unpackedMembers = packed.wm.map((name, idx) => ({
      id: `wm-shared-${ts}-${idx}`,
      name: name || `メンバー${idx + 1}`,
    }));
    const unpackedExpenses = (packed.we || []).map((exp, idx) => ({
      id: `pay-shared-${ts}-${idx}`,
      title: exp.t || '支出',
      amount: Number(exp.a) || 0,
      payerId: unpackedMembers[exp.p]?.id || unpackedMembers[0]?.id || '',
      participantIds: (exp.ps || [])
        .map((pIdx) => unpackedMembers[pIdx]?.id)
        .filter(Boolean),
      date: exp.d || '',
    }));
    warikan = {
      members: unpackedMembers,
      expenses: unpackedExpenses,
    };
  }

  return {
    trip,
    warikan,
    focusTab: packed.tab || 'shiori',
  };
}

/**
 * UTF-8文字列をURL-safeなBase64に変換
 */
function toBase64Url(str) {
  try {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = utf8Bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.warn('toBase64Url failed:', err);
    return '';
  }
}

/**
 * URL-safeなBase64をUTF-8文字列に復元
 */
function fromBase64Url(base64Url) {
  try {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (err) {
    console.warn('fromBase64Url failed:', err);
    return null;
  }
}

/**
 * 共有用URLを生成
 */
export function generateTripShareUrl(trip, warikan = null, focusTab = 'shiori') {
  const packed = packTripData(trip, warikan, focusTab);
  if (!packed) return '';

  const jsonStr = JSON.stringify(packed);
  const encoded = toBase64Url(jsonStr);

  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?tripShare=${encoded}`;
}

/**
 * LINEやSNSで送信するための共有テキスト＋URLを生成
 */
export function generateShareMessageWithUrl(trip, warikan = null, focusTab = 'shiori') {
  const shareUrl = generateTripShareUrl(trip, warikan, focusTab);

  if (focusTab === 'warikan') {
    const memberCount = warikan?.members?.length || 0;
    const totalAmt = (warikan?.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const titleText = trip?.title ? `（${trip.title}）` : '';
    return `💰【わりかん精算】${titleText}\n👥 メンバー: ${memberCount}人 / 合計支出: ¥${totalAmt.toLocaleString()}\n\n👇 このURLを開くと、タビトモでわりかん計算結果やしおりがそのまま見られます！\n${shareUrl}`;
  }

  const stayText = trip?.stayDays && trip.stayDays > 1 ? ` (${trip.stayDays}日間)` : ' (日帰り)';
  const dateText = trip?.date ? `\n📅 日程: ${trip.date}${trip.endDate ? ` 〜 ${trip.endDate}` : ''}${stayText}` : '';
  const memoText = trip?.memo ? `\n💡 メモ: ${trip.memo}` : '';

  return `🎒【旅のしおり】${trip?.title || '旅行計画'}${dateText}${memoText}\n\n👇 このURLを開くと、タビトモで同じしおり・割り勘・持ち物がそのまま見られます！\n${shareUrl}`;
}

/**
 * URLから共有旅行データ・割り勘データを抽出・復元
 */
export function parseTripFromUrl(searchString = window.location.search) {
  try {
    const params = new URLSearchParams(searchString);
    const shareParam = params.get('tripShare');
    if (!shareParam) return null;

    const jsonStr = fromBase64Url(shareParam);
    if (!jsonStr) return null;

    const packed = JSON.parse(jsonStr);
    return unpackTripData(packed);
  } catch (err) {
    console.warn('parseTripFromUrl failed:', err);
    return null;
  }
}
