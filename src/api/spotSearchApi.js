// ------------------------------------------------------------
// タビトモ — スポット検索 & 高画質写真マルチ取得サービス
// 1. OpenStreetMap (Nominatim API): 実在する観光スポット・ランドマーク・座標の特定（完全無料・キー不要）
// 2. Wikipedia API: 観光地の詳細な解説文・高解像度写真の取得（代表写真＋記事内深掘り）
// 3. 楽天トラベルAPI: 周辺宿・観光施設写真の自動穴埋め
// 4. 自然・風景・観光地の高画質スマートフォールバック
// ------------------------------------------------------------

import { MAIN_SPOTS, YORIMICHI_CANDIDATES } from '../travelData.js';

// ユーザーが取得した楽天APIキーの初期デフォルト値
const DEFAULT_RAKUTEN_APP_ID = '74e20a2f-7465-4c98-86e6-6f75788ba853';
const DEFAULT_RAKUTEN_ACCESS_KEY = 'pk_yTV1Up1or1M35FIq88Rb2C6S5UtRODDeg7CbXtAr3zb';
// ホットペッパーグルメAPIキー
const DEFAULT_HOTPEPPER_KEY = '940f835bee45d662';

/**
 * 外部APIキー取得（localStorage またはデフォルト値）
 */
export function getExternalApiKeys() {
  try {
    return {
      jalanKey: localStorage.getItem('tabitomo.jalanKey') || '',
      rakutenId: localStorage.getItem('tabitomo.rakutenId') || DEFAULT_RAKUTEN_APP_ID,
      rakutenKey: localStorage.getItem('tabitomo.rakutenKey') || DEFAULT_RAKUTEN_ACCESS_KEY,
      hotpepperKey: localStorage.getItem('tabitomo.hotpepperKey') || DEFAULT_HOTPEPPER_KEY,
    };
  } catch {
    return {
      jalanKey: '',
      rakutenId: DEFAULT_RAKUTEN_APP_ID,
      rakutenKey: DEFAULT_RAKUTEN_ACCESS_KEY,
      hotpepperKey: DEFAULT_HOTPEPPER_KEY,
    };
  }
}

export function saveExternalApiKeys({ jalanKey, rakutenId, rakutenKey, hotpepperKey }) {
  try {
    if (jalanKey !== undefined) localStorage.setItem('tabitomo.jalanKey', jalanKey);
    if (rakutenId !== undefined) localStorage.setItem('tabitomo.rakutenId', rakutenId);
    if (rakutenKey !== undefined) localStorage.setItem('tabitomo.rakutenKey', rakutenKey);
    if (hotpepperKey !== undefined) localStorage.setItem('tabitomo.hotpepperKey', hotpepperKey);
  } catch {
    /* noop */
  }
}

/**
 * GitHub Pages等の静的ホスティング環境でCORS制限を回避するためのJSONPリクエストヘルパー
 */
function fetchJsonp(url, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('JSONP requires browser DOM'));
      return;
    }
    const callbackName = `__tabitomo_cb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      try {
        delete window[callbackName];
      } catch {
        window[callbackName] = undefined;
      }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('JSONP timeout'));
    }, timeoutMs);

    window[callbackName] = (data) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    const sep = url.includes('?') ? '&' : '?';
    script.src = `${url}${sep}callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error('JSONP script error'));
    };

    document.body.appendChild(script);
  });
}

/**
 * スポットオブジェクトから「cafe」「restaurant」「sightseeing」の正規化カテゴリ種別を判定
 * 表記揺れや欠落を完全に吸収し、カフェ・レストランの0件バグを防止する
 */
export function getNormalizedCategoryType(item) {
  if (!item) return 'sightseeing';
  if (item.categoryType === 'cafe' || item.categoryType === 'restaurant') {
    return item.categoryType;
  }
  const text = `${item.category || ''} ${item.tag || ''} ${item.name || ''} ${item.title || ''} ${item.genre?.name || ''} ${item.genre || ''}`.toLowerCase();
  if (/カフェ|喫茶|珈琲|コーヒー|ベーカリー|パン|スイーツ|ケーキ|パフェ|洋菓子|和菓子|デザート|tea|cafe|coffee|bakery/i.test(text)) {
    return 'cafe';
  }
  if (/レストラン|グルメ|食事|ランチ|ディナー|食堂|和食|洋食|中華|イタリアン|フレンチ|パスタ|ピザ|焼肉|肉|寿司|鮨|海鮮|魚|居酒屋|バー|酒|ラーメン|らーめん|拉麺|そば|蕎麦|うどん|定食|料理|restaurant|food/i.test(text)) {
    return 'restaurant';
  }
  return 'sightseeing';
}

/**
 * 観光地・目的地として不適切なインフラ・土木・交通・行政・墓所などのノイズ記事を除外
 * （例: 「神奈川県道306号藤沢停車場線」「神奈川中央交通藤沢営業所」などのゴミ候補を100%遮断）
 */
export function isNoiseSpot(name = '') {
  if (!name || typeof name !== 'string') return true;
  return /小学校|中学校|高等学校|高校|大学|幼稚園|保育園|養護学校|支援学校|専門学校|県道|国道|停車場線|都道|府道|街道|バイパス|ジャンクション|JCT|インターチェンジ|スマートIC|営業所|車庫|バス停|停留所|派出所|警察署|消防署|変電所|浄水場|下水処理|団地|公営住宅|市役所|区役所|役場|支所|出張所|選挙区|区検察庁|裁判所|郵便局|霊園|墓地|墓所|斎場|火葬場|事件|事故|訴訟|条例|計画|会戦|合戦|の歴史|の一覧|一覧/i.test(
    name
  );
}

/**
 * 検索クエリとヒットした名称の関連性検証
 * 例: クエリが「辻堂駅」なのに Nominatim のファジー検索で「室堂駅」が返ってくるような致命的誤爆をシャットアウト
 */
export function isQueryRelevant(resultName = '', query = '') {
  if (!resultName || !query) return false;
  const cleanQ = query.replace(/[駅町市郡県都道府県]/g, '').trim().toLowerCase();
  const cleanN = resultName.replace(/[駅町市郡県都道府県]/g, '').trim().toLowerCase();
  if (cleanQ.length >= 2) {
    return cleanN.includes(cleanQ) || cleanQ.includes(cleanN);
  }
  return true;
}

/**
 * スポット名やキーワードから、カテゴリに合った水彩フォールバック種別を判定
 */
export function detectWatercolorTheme(title = '', desc = '') {
  const text = `${title} ${desc}`.toLowerCase();
  if (text.includes('温泉') || text.includes('湯') || text.includes('風呂')) {
    return {
      type: 'onsen',
      label: '温泉・癒やし',
      icon: '♨️',
      gradient: 'linear-gradient(135deg, #faeee9 0%, #f3d7ce 100%)',
      color: '#c26549',
    };
  }
  if (text.includes('山') || text.includes('岳') || text.includes('高原') || text.includes('峰') || text.includes('峠') || text.includes('富士')) {
    return {
      type: 'mountain',
      label: '山岳・高原',
      icon: '⛰️',
      gradient: 'linear-gradient(135deg, #eaf1ec 0%, #cfded3 100%)',
      color: '#587b66',
    };
  }
  if (text.includes('湖') || text.includes('海') || text.includes('川') || text.includes('滝') || text.includes('島') || text.includes('浜') || text.includes('池') || text.includes('渓谷')) {
    return {
      type: 'water',
      label: '湖沼・清流・海',
      icon: '🌊',
      gradient: 'linear-gradient(135deg, #e6f3f5 0%, #cce5eb 100%)',
      color: '#4a8292',
    };
  }
  if (text.includes('寺') || text.includes('神社') || text.includes('城') || text.includes('宮') || text.includes('大社') || text.includes('堂') || text.includes('歴史')) {
    return {
      type: 'history',
      label: '寺社・名所旧跡',
      icon: '🏮',
      gradient: 'linear-gradient(135deg, #f5efe4 0%, #ded2be 100%)',
      color: '#8d7860',
    };
  }
  if (text.includes('カフェ') || text.includes('喫茶') || text.includes('ベーカリー') || text.includes('パン') || text.includes('食') || text.includes('店') || text.includes('スイーツ')) {
    return {
      type: 'cafe',
      label: 'カフェ・グルメ',
      icon: '☕',
      gradient: 'linear-gradient(135deg, #f7f1ea 0%, #eddccf 100%)',
      color: '#a07050',
    };
  }
  return {
    type: 'nature',
    label: '自然・景勝地',
    icon: '🌿',
    gradient: 'linear-gradient(135deg, #f4efe6 0%, #e5ddcd 100%)',
    color: '#587b66',
  };
}

/**
 * Wikipedia記事内の写真一覧から、観光風景写真を深掘り取得
 */
async function fetchDeepPhotoFromWiki(pageTitle) {
  try {
    const listUrl = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      pageTitle
    )}&prop=images&format=json&origin=*`;
    const res = await fetch(listUrl);
    if (!res.ok) return null;
    const data = await res.json();
    const page = Object.values(data?.query?.pages || {})[0];
    const imageList = page?.images || [];

    const photoNames = imageList
      .map((item) => item.title)
      .filter((title) => /\.(jpg|jpeg|png|webp)$/i.test(title))
      .filter(
        (title) =>
          !/icon|logo|stub|commons|map|flag|symbol|question|sign|route|road/i.test(title)
      );

    if (photoNames.length === 0) return null;

    const targetFile = photoNames[0];
    const infoUrl = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      targetFile
    )}&prop=imageinfo&iiprop=url&iiurlwidth=1280&format=json&origin=*`;
    const resInfo = await fetch(infoUrl);
    if (!resInfo.ok) return null;
    const dataInfo = await resInfo.json();
    const infoPage = Object.values(dataInfo?.query?.pages || {})[0];
    const photoUrl =
      infoPage?.imageinfo?.[0]?.thumburl || infoPage?.imageinfo?.[0]?.url;

    return photoUrl || null;
  } catch {
    return null;
  }
}

/**
 * 楽天トラベルAPIから周辺スポット・宿の高品質写真を取得（穴埋め用）
 */
export async function searchPhotoFromRakuten(keyword, keys) {
  const { rakutenId, rakutenKey } = keys || getExternalApiKeys();
  if (!rakutenId) return null;

  const cleanKey = keyword.replace(/(都|道|府|県|市|町|村|公園|温泉|山|高原|湖|滝)$/, '').trim();
  const searchWord = cleanKey || keyword;

  const tryUrls = [
    `/api/rakuten/engine/api/Travel/KeywordHotelSearch/20260731?applicationId=${encodeURIComponent(
      rakutenId
    )}&accessKey=${encodeURIComponent(rakutenKey || '')}&keyword=${encodeURIComponent(
      searchWord
    )}&format=json&hits=2`,
    `https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20260731?applicationId=${encodeURIComponent(
      rakutenId
    )}&accessKey=${encodeURIComponent(rakutenKey || '')}&keyword=${encodeURIComponent(
      searchWord
    )}&format=json&hits=2`,
  ];

  for (const url of tryUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const hotels = data?.hotels || [];
        if (hotels.length > 0) {
          const hotelInfo = hotels[0]?.hotel?.[0]?.hotelBasicInfo;
          if (hotelInfo && hotelInfo.hotelImageUrl) {
            return {
              imageUrl: String(hotelInfo.hotelImageUrl).replace(/^http:\/\//i, 'https://'),
              imageSource: '楽天トラベル',
              hotelName: hotelInfo.hotelName,
            };
          }
        }
      }
    } catch {
      // 次のURLへフォールバック
    }
  }

  return null;
}

/**
 * Wikipediaからスポット名で解説と写真を補完取得する
 * requireCoords: true の場合、座標を持たない同音異義語（例:「日光＝太陽光」「白馬＝動物」）を弾き、cityHint で再検索する
 */
async function fetchWikiInfo(spotName, { requireCoords = false, cityHint = '' } = {}) {
  try {
    const url = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      spotName
    )}&prop=pageimages|extracts|coordinates|info&pithumbsize=1000&exintro=1&explaintext=1&exsentences=3&inprop=url&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const page = Object.values(data?.query?.pages || {})[0];
    if (!page || page.missing) {
      if (cityHint && cityHint !== spotName) {
        return fetchWikiInfo(cityHint, { requireCoords, cityHint: '' });
      }
      return null;
    }

    const hasCoords = Array.isArray(page.coordinates) && page.coordinates.length > 0;
    if (requireCoords && !hasCoords) {
      if (cityHint && cityHint !== spotName) {
        return fetchWikiInfo(cityHint, { requireCoords: true, cityHint: '' });
      }
      return null;
    }

    let extract = (page.extract || '').replace(/\s+/g, ' ').trim();
    if (extract.length > 180) extract = extract.slice(0, 180) + '…';

    let imageUrl = page.thumbnail?.source || null;
    let imageSource = imageUrl ? 'Wikipedia' : null;

    if (!imageUrl) {
      const deepUrl = await fetchDeepPhotoFromWiki(page.title);
      if (deepUrl) {
        imageUrl = deepUrl;
        imageSource = 'Wikimedia Commons';
      }
    }

    return {
      extract,
      imageUrl,
      imageSource,
      wikiUrl: page.fullurl,
      lat: page.coordinates?.[0]?.lat,
      lng: page.coordinates?.[0]?.lon,
    };
  } catch {
    return null;
  }
}

/**
 * OpenStreetMap (Nominatim API) を使用して日本国内の実在スポットを検索
 * 競走馬や辞書的用語（概念）を完全にシャットアウトし、正確な座標と住所を取得
 */
async function searchFromNominatim(query) {
  const clean = query.trim();
  if (!clean) return [];

  // 「軽井沢高原教会」等の連結地名はスペース分割版も候補に用意
  const spaced = clean.replace(/^(.{2,4}?)(高原|公園|教会|神社|温泉|カフェ|駅)/, '$1 $2').trim();
  const queriesToTry = spaced && spaced !== clean ? [clean, spaced] : [clean];

  const ignoreTypes = new Set([
    'hairdresser',
    'bus_stop',
    'traffic_signals',
    'fuel',
    'parking',
    'waste_basket',
    'post_box',
    'secondary',
    'tertiary',
    'residential',
    'motorway',
    'trunk',
  ]);

  for (const q of queriesToTry) {
    // プロキシ優先、失敗時（GitHub Pages本番等）は公式URLへ直接アクセス
    const endpoints = [
      `/api/osm/search?q=${encodeURIComponent(
        q
      )}&format=json&countrycodes=jp&addressdetails=1&limit=8&accept-language=ja`,
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&countrycodes=jp&addressdetails=1&limit=8&accept-language=ja`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const items = await res.json();
        if (!Array.isArray(items) || items.length === 0) continue;

        return items.filter((item) => !ignoreTypes.has(item.type));
      } catch {
        // 次のURLへ
      }
    }
  }

  return [];
}

/**
 * Wikipedia側の座標フィルタリングフォールバック（アプローチ2）
 * 緯度経度（coordinates）が登録されている実在の地理的記事のみを残す
 */
async function searchWikiGeoOnly(query) {
  try {
    const searchUrl = `https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query
    )}&srlimit=6&utf8=1&format=json&origin=*`;
    const res = await fetch(searchUrl);
    if (!res.ok) return [];
    const data = await res.json();
    const hits = data?.query?.search || [];
    if (hits.length === 0) return [];

    const pageIds = hits.map((h) => h.pageid);
    const detailUrl = `https://ja.wikipedia.org/w/api.php?action=query&pageids=${pageIds.join(
      '|'
    )}&prop=pageimages|extracts|coordinates|info&pithumbsize=1000&exintro=1&explaintext=1&exsentences=3&inprop=url&format=json&origin=*`;
    const res2 = await fetch(detailUrl);
    if (!res2.ok) return [];
    const data2 = await res2.json();
    const pages = data2?.query?.pages || {};

    const geoResults = [];
    for (const h of hits) {
      const p = pages[h.pageid];
      if (!p) continue;
      // ★ 最重要: 座標（coordinates）がない記事（馬、概念「リゾートとは」等）は100%除外！
      if (!p.coordinates || p.coordinates.length === 0) continue;

      // ★ インフラ・道路・バス営業所などのノイズスポットは100%除外！
      if (isNoiseSpot(p.title)) continue;

      let extract = (p.extract || '').replace(/\s+/g, ' ').trim();
      if (extract.length > 180) extract = extract.slice(0, 180) + '…';

      geoResults.push({
        name: p.title,
        title: p.title,
        extract,
        lat: p.coordinates[0].lat,
        lng: p.coordinates[0].lon,
        imageUrl: p.thumbnail?.source || null,
        imageSource: p.thumbnail?.source ? 'Wikipedia' : null,
        wikiUrl: p.fullurl,
      });
    }

    return geoResults;
  } catch {
    return [];
  }
}

/**
 * メインのハイブリッド検索関数
 * 1. OpenStreetMap (Nominatim) で実在スポット・座標を特定（馬や概念は出ない）
 * 2. 確定スポットについて Wikipedia & 楽天トラベル から高画質写真・紹介文を取得
 * 3. 補完として Wikipedia座標付き観光記事も活用
 */
export async function searchSpotHybrid(query) {
  if (!query || !query.trim()) return [];
  const clean = query.trim();
  const keys = getExternalApiKeys();

  const results = [];
  const seenNames = new Set();

  // Step 0: Wikipedia タイトル完全一致チェック
  // ユーザーが「辻堂駅」「日光東照宮」などピンポイントで調べた場合、実在するWikipedia座標付き記事を最優先でトップに確定
  try {
    const directWiki = await fetchWikiInfo(clean, { requireCoords: true });
    if (directWiki && directWiki.lat && directWiki.lng && !isNoiseSpot(clean)) {
      seenNames.add(clean);
      const theme = detectWatercolorTheme(clean, directWiki.extract || '');
      let catType = 'sightseeing';
      let catLabel = '観光スポット';
      if (/駅$/.test(clean)) {
        catLabel = '交通・駅';
      } else if (/カフェ|喫茶|珈琲|ベーカリー|パン|スイーツ/i.test(clean)) {
        catType = 'cafe';
        catLabel = 'カフェ・スイーツ';
      } else if (/レストラン|食堂|料理|店/i.test(clean)) {
        catType = 'restaurant';
        catLabel = 'グルメ・食事';
      }

      results.push({
        id: `wiki-exact-${Math.random().toString(36).slice(2, 8)}`,
        name: clean,
        title: clean,
        extract: directWiki.extract || `${clean}の観光・スポット情報です。`,
        region: '日本国内',
        category: catLabel,
        categoryType: catType,
        lat: directWiki.lat,
        lng: directWiki.lng,
        hasRealCoord: true,
        imageUrl: directWiki.imageUrl || null,
        imageSource: directWiki.imageSource || (directWiki.imageUrl ? 'Wikipedia' : null),
        wikiUrl: directWiki.wikiUrl || `https://www.google.com/search?q=${encodeURIComponent(clean)}`,
        theme,
      });
    }
  } catch {}

  // Step 1: OpenStreetMap (Nominatim) 検索
  const osmItems = await searchFromNominatim(clean);

  for (const item of osmItems) {
    let name = item.name;
    if (!name) {
      name = item.display_name.split(',')[0].trim();
    }
    // 駅名補正（classがrailwayで末尾に駅がない場合）
    if (item.class === 'railway' && item.type === 'station' && !name.endsWith('駅')) {
      name = `${name}駅`;
    }

    // ノイズ（県道、営業所、バス停、車庫等）の除外
    if (isNoiseSpot(name)) continue;

    // クエリとの関連性チェック（例: クエリが「辻堂駅」なのに「室堂駅」が返ってきた致命的な誤爆をシャットアウト）
    if (!isQueryRelevant(name, clean)) continue;

    if (seenNames.has(name)) continue;
    seenNames.add(name);

    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    // 住所の抽出（長野県 白馬村 等）
    const addr = item.address || {};
    const region = [
      addr.province || addr.state || addr.prefecture || '',
      addr.city || addr.town || addr.village || addr.county || '',
    ]
      .filter(Boolean)
      .join(' ');

    // 写真と解説の取得（Wikipedia ＋ 楽天。座標のない一般名詞記事「日光＝太陽光」等は弾く）
    const cityHint = addr.city || addr.town || addr.village || '';
    const wikiInfo = await fetchWikiInfo(name, { requireCoords: true, cityHint });

    let extract = wikiInfo?.extract || '';
    if (!extract) {
      extract = `${region ? region + 'にある' : ''}${name}のスポット情報です。`;
    }

    let imageUrl = wikiInfo?.imageUrl || null;
    let imageSource = wikiInfo?.imageSource || null;

    // 楽天トラベルによる写真穴埋め
    if (!imageUrl && keys.rakutenId) {
      const rakuten = await searchPhotoFromRakuten(name, keys);
      if (rakuten?.imageUrl) {
        imageUrl = rakuten.imageUrl;
        imageSource = '楽天トラベル';
      }
    }

    const theme = detectWatercolorTheme(name, extract);

    // OSMアイテムのカテゴリ分類（カフェ・レストラン・観光地を正しく振り分ける）
    const osmTypeLower = `${item.type || ''} ${item.class || ''} ${name}`.toLowerCase();
    let osmCategoryType = 'sightseeing';
    let osmCategoryLabel = item.type || item.class || '観光スポット';
    if (/cafe|coffee|bakery|tea|カフェ|喫茶|珈琲|ベーカリー|スイーツ|パン/i.test(osmTypeLower)) {
      osmCategoryType = 'cafe';
      osmCategoryLabel = 'カフェ・スイーツ';
    } else if (/restaurant|fast_food|food_court|ramen|izakaya|レストラン|食堂|ラーメン|そば|うどん/i.test(osmTypeLower)) {
      osmCategoryType = 'restaurant';
      osmCategoryLabel = 'グルメ・食事';
    }

    results.push({
      id: `osm-${item.osm_id || Math.random().toString(36).slice(2, 8)}`,
      name,
      title: name,
      extract,
      region: region || '日本国内',
      category: osmCategoryLabel,
      categoryType: osmCategoryType,
      lat,
      lng,
      hasRealCoord: true,
      imageUrl,
      imageSource,
      wikiUrl: wikiInfo?.wikiUrl || `https://www.google.com/search?q=${encodeURIComponent(name)}`,
      theme,
    });

    if (results.length >= 6) break;
  }

  // Step 2: ヒットが少ない場合は Wikipedia座標付き地理記事 ＋ プリセット観光地辞書で補完
  if (results.length < 3) {
    const wikiGeo = await searchWikiGeoOnly(clean);
    for (const w of wikiGeo) {
      if (isNoiseSpot(w.name)) continue;
      if (!isQueryRelevant(w.name, clean)) continue;
      if (seenNames.has(w.name)) continue;
      seenNames.add(w.name);

      let imageUrl = w.imageUrl;
      let imageSource = w.imageSource;

      if (!imageUrl && keys.rakutenId) {
        const rakuten = await searchPhotoFromRakuten(w.name, keys);
        if (rakuten?.imageUrl) {
          imageUrl = rakuten.imageUrl;
          imageSource = '楽天トラベル';
        }
      }

      const theme = detectWatercolorTheme(w.name, w.extract);

      results.push({
        id: `wiki-geo-${Math.random().toString(36).slice(2, 8)}`,
        name: w.name,
        title: w.name,
        extract: w.extract,
        region: '日本国内',
        category: '名所・自然',
        categoryType: 'sightseeing',
        lat: w.lat,
        lng: w.lng,
        hasRealCoord: true,
        imageUrl,
        imageSource,
        wikiUrl: w.wikiUrl,
        theme,
      });

      if (results.length >= 6) break;
    }

    // プリセット辞書・寄り道候補からの高速マッチ補完（軽井沢高原教会や地方の名所など）
    const cleanLower = clean.toLowerCase();
    for (const yc of YORIMICHI_CANDIDATES) {
      const yName = (yc.name || '').toLowerCase();
      const yDesc = (yc.desc || yc.tag || '').toLowerCase();
      if ((yName.includes(cleanLower) || cleanLower.includes(yName) || yDesc.includes(cleanLower)) && !seenNames.has(yc.name)) {
        seenNames.add(yc.name);
        results.push({
          id: yc.id || `preset-yc-${Math.random().toString(36).slice(2, 8)}`,
          name: yc.name,
          title: yc.name,
          extract: yc.desc || yc.tag || `${yc.name}の人気立ち寄りスポットです。`,
          region: '日本国内',
          category: yc.category || '観光スポット',
          categoryType: yc.categoryType || (/カフェ|スイーツ|パン/i.test(yc.category || yc.name) ? 'cafe' : /グルメ|食事|ランチ/i.test(yc.category || '') ? 'restaurant' : 'sightseeing'),
          icon: yc.icon || '📍',
          lat: yc.lat,
          lng: yc.lng,
          hasRealCoord: true,
          imageUrl: yc.imageUrl || null,
          imageSource: yc.imageSource || null,
          wikiUrl: `https://www.google.com/search?q=${encodeURIComponent(yc.name)}`,
          theme: detectWatercolorTheme(yc.name, yc.desc || ''),
        });
      }
    }

    for (const dictSpot of POPULAR_SPOTS_DICT) {
      const hitName = dictSpot.name.toLowerCase().includes(cleanLower) || cleanLower.includes(dictSpot.name.toLowerCase());
      const hitKana = dictSpot.kana.includes(cleanLower);
      if ((hitName || hitKana) && !seenNames.has(dictSpot.name)) {
        const coords = findCoordinatesInLocalDictionary(dictSpot.name);
        if (coords) {
          seenNames.add(dictSpot.name);
          const wikiDirect = await fetchWikiInfo(dictSpot.name, { requireCoords: false });
          results.push({
            id: `dict-${Math.random().toString(36).slice(2, 8)}`,
            name: dictSpot.name,
            title: dictSpot.name,
            extract: wikiDirect?.extract || `${dictSpot.region}にある「${dictSpot.name}」（${dictSpot.category}）です。`,
            region: dictSpot.region,
            category: dictSpot.category,
            categoryType: /カフェ|スイーツ|珈琲|パン/i.test(`${dictSpot.name} ${dictSpot.category}`) ? 'cafe' : 'sightseeing',
            lat: coords.lat,
            lng: coords.lng,
            hasRealCoord: true,
            imageUrl: wikiDirect?.imageUrl || null,
            imageSource: wikiDirect?.imageSource || null,
            wikiUrl: wikiDirect?.wikiUrl || `https://www.google.com/search?q=${encodeURIComponent(dictSpot.name)}`,
            theme: detectWatercolorTheme(dictSpot.name, dictSpot.category),
          });
        }
      }
      if (results.length >= 6) break;
    }

    // それでも0件ならWikipediaタイトル完全一致を許容し、座標は辞書で補完
    if (results.length === 0) {
      const wikiDirect = await fetchWikiInfo(clean, { requireCoords: false });
      const fallbackCoords = wikiDirect?.lat && wikiDirect?.lng
        ? { lat: wikiDirect.lat, lng: wikiDirect.lng }
        : findCoordinatesInLocalDictionary(clean);
      if (wikiDirect && fallbackCoords) {
        seenNames.add(clean);
        results.push({
          id: `wiki-direct-${Math.random().toString(36).slice(2, 8)}`,
          name: clean,
          title: clean,
          extract: wikiDirect.extract || `${clean}の観光情報です。`,
          region: '日本国内',
          category: '観光スポット',
          categoryType: 'sightseeing',
          lat: fallbackCoords.lat,
          lng: fallbackCoords.lng,
          hasRealCoord: true,
          imageUrl: wikiDirect.imageUrl || null,
          imageSource: wikiDirect.imageSource || null,
          wikiUrl: wikiDirect.wikiUrl || `https://www.google.com/search?q=${encodeURIComponent(clean)}`,
          theme: detectWatercolorTheme(clean, wikiDirect.extract || ''),
        });
      }
    }
  }

  // Step 3: ホットペッパーグルメAPIによる飲食店・カフェ検索も並行取得して結合
  try {
    const coreClean = clean.replace(/駅$/, '').trim();
    const searchQueries = [clean];
    if (coreClean && coreClean !== clean && coreClean.length >= 2) {
      searchQueries.push(coreClean);
    }
    for (const q of searchQueries) {
      const gourmetResults = await searchGourmetFromHotpepper(q, 8);
      if (gourmetResults && gourmetResults.length > 0) {
        for (const g of gourmetResults) {
          if (!seenNames.has(g.name)) {
            results.push({
              ...g,
              categoryType: getNormalizedCategoryType(g),
            });
            seenNames.add(g.name);
          }
        }
      }
    }

    // もし1件目に実在スポット（駅・モール等）がある場合、その座標周辺のグルメも追加補強
    if (results.length > 0 && typeof results[0].lat === 'number' && typeof results[0].lng === 'number') {
      const hasCafe = results.some((r) => getNormalizedCategoryType(r) === 'cafe');
      const hasRest = results.some((r) => getNormalizedCategoryType(r) === 'restaurant');
      if (!hasCafe || !hasRest || results.length < 8) {
        const nearbyGourmet = await fetchNearbyHotpepperGourmet(results[0].lat, results[0].lng, 3, 8);
        for (const ng of nearbyGourmet) {
          if (!seenNames.has(ng.name)) {
            results.push({
              ...ng,
              categoryType: getNormalizedCategoryType(ng),
            });
            seenNames.add(ng.name);
          }
          if (results.length >= 16) break;
        }
      }
    }
  } catch {
    // グルメ検索エラー時は観光地のみで安全に継続
  }

  // Step 4: カフェ・レストランが不足している場合、プリセット寄り道候補（軽井沢の沢村・丸山珈琲、日光の湯波・カフェ等）から補完
  const hasCafe = results.some((r) => getNormalizedCategoryType(r) === 'cafe');
  const hasRestaurant = results.some((r) => getNormalizedCategoryType(r) === 'restaurant');
  if ((!hasCafe || !hasRestaurant) && Array.isArray(YORIMICHI_CANDIDATES)) {
    const cleanLower = clean.toLowerCase();
    for (const yc of YORIMICHI_CANDIDATES) {
      const cType = getNormalizedCategoryType(yc);
      if (cType === 'sightseeing') continue;
      const matchName = (yc.name || '').toLowerCase().includes(cleanLower) || cleanLower.includes((yc.name || '').toLowerCase());
      const matchDesc = (yc.desc || yc.tag || '').toLowerCase().includes(cleanLower);
      if ((matchName || matchDesc) && !seenNames.has(yc.name)) {
        seenNames.add(yc.name);
        results.push({
          id: yc.id || `preset-gourmet-${Math.random().toString(36).slice(2, 8)}`,
          name: yc.name,
          title: yc.name,
          extract: yc.desc || yc.tag || `${yc.name}のグルメ・カフェ情報です。`,
          region: '日本国内',
          category: yc.category || (cType === 'cafe' ? 'カフェ・スイーツ' : 'グルメ・食事'),
          categoryType: cType,
          icon: yc.icon || (cType === 'cafe' ? '☕' : '🍴'),
          lat: yc.lat,
          lng: yc.lng,
          hasRealCoord: true,
          imageUrl: yc.imageUrl || null,
          imageSource: yc.imageSource || null,
          wikiUrl: `https://www.google.com/search?q=${encodeURIComponent(yc.name)}`,
          theme: detectWatercolorTheme(yc.name, yc.desc || ''),
          defaultStay: cType === 'cafe' ? 45 : 60,
          sourceType: 'gourmet',
        });
      }
      if (results.length >= 10) break;
    }
  }

  // 全アイテムに categoryType を確実に正規化適用
  return results.map((item) => ({
    ...item,
    categoryType: getNormalizedCategoryType(item),
  }));
}

/**
 * 後方互換性用エイリアス
 */
export const searchSpotFromWikipedia = searchSpotHybrid;

/**
 * 外部API手動検索用ハンドラ
 */
export async function searchSpotFromExternalApi(query, keys) {
  return searchPhotoFromRakuten(query, keys);
}

/**
 * 全国人気観光地・ランドマーク辞書（ひらがな・カタカナ・漢字インクリメンタル高速サジェスト用）
 */
const POPULAR_SPOTS_DICT = [
  { name: '富士急ハイランド', kana: 'ふじきゅうはいらんど', region: '山梨県 富士吉田市', category: 'テーマパーク' },
  { name: '富士山', kana: 'ふじさん', region: '山梨県・静岡県', category: '山岳・日本一' },
  { name: '富士五湖', kana: 'ふじごこ', region: '山梨県', category: '湖沼・景勝地' },
  { name: '白馬八方尾根', kana: 'はくばはっぽうおね', region: '長野県 白馬村', category: '山岳・スキー' },
  { name: '白馬村', kana: 'はくばむら', region: '長野県', category: '高原リゾート' },
  { name: '箱根湯本温泉', kana: 'はこねゆもとおんせん', region: '神奈川県 箱根町', category: '温泉街' },
  { name: '箱根神社', kana: 'はこねじんじゃ', region: '神奈川県 箱根町', category: '神社・パワースポット' },
  { name: '大涌谷', kana: 'おおわくだに', region: '神奈川県 箱根町', category: '火山景勝地・黒たまご' },
  { name: '草津温泉・湯畑', kana: 'くさつおんせん', region: '群馬県 草津町', category: '名湯・湯畑' },
  { name: '東京ディズニーランド', kana: 'とうきょうでぃずにーらんど', region: '千葉県 浦安市', category: 'テーマパーク' },
  { name: '東京ディズニーシー', kana: 'とうきょうでぃずにーしー', region: '千葉県 浦安市', category: 'テーマパーク' },
  { name: 'ユニバーサル・スタジオ・ジャパン', kana: 'ゆにばーさるすたじおじゃぱん', region: '大阪府 大阪市', category: 'テーマパーク' },
  { name: '清水寺', kana: 'きよみずでら', region: '京都府 京都市', category: '世界遺産・寺院' },
  { name: '伏見稲荷大社', kana: 'ふしみいなりたいしゃ', region: '京都府 京都市', category: '千本鳥居・神社' },
  { name: '金閣寺', kana: 'きんかくじ', region: '京都府 京都市', category: '世界遺産・寺院' },
  { name: '嵐山・渡月橋', kana: 'あらしやま', region: '京都府 京都市', category: '景勝地・竹林' },
  { name: '上高地・河童橋', kana: 'かみこうち', region: '長野県 松本市', category: '北アルプス・絶景' },
  { name: '美ヶ原高原', kana: 'うつくしがはらこうげん', region: '長野県', category: '高原・美術館' },
  { name: '軽井沢プリンスショッピングプラザ', kana: 'かるいざわぷりんす', region: '長野県 軽井沢町', category: 'リゾート・避暑地' },
  { name: '軽井沢高原教会', kana: 'かるいざわこうげんきょうかい', region: '長野県 軽井沢町', category: '教会・名所' },
  { name: '石の教会・内村鑑三記念堂', kana: 'いしのきょうかい', region: '長野県 軽井沢町', category: '教会・建築' },
  { name: 'ハルニレテラス', kana: 'はるにてらす', region: '長野県 軽井沢町', category: 'カフェ・ショッピング' },
  { name: 'ベーカリー＆レストラン 沢村', kana: 'さわむら かるいざわ', region: '長野県 軽井沢町', category: 'カフェ・ベーカリー' },
  { name: '丸山珈琲 軽井沢本店', kana: 'まるやまこーひー かるいざわ', region: '長野県 軽井沢町', category: 'カフェ・珈琲' },
  { name: '旧軽井沢銀座通り', kana: 'きゅうかるいざわぎんざ', region: '長野県 軽井沢町', category: '散策・食べ歩き' },
  { name: '雲場池', kana: 'くもばいけ かるいざわ', region: '長野県 軽井沢町', category: '景勝地・散策' },
  { name: '白糸の滝', kana: 'しらいとのたき', region: '長野県 軽井沢町', category: '名瀑・清流' },
  { name: '日光東照宮', kana: 'にっこうとうしょうぐう', region: '栃木県 日光市', category: '世界遺産・歴史' },
  { name: '中禅寺湖・華厳の滝', kana: 'ちゅうぜんじこ', region: '栃木県 日光市', category: '名瀑・湖' },
  { name: '熱海温泉', kana: 'あたみおんせん', region: '静岡県 熱海市', category: '海沿い温泉街' },
  { name: '伊豆大室山', kana: 'いずおおむろやま', region: '静岡県 伊東市', category: '絶景・パノラマ' },
  { name: '城ヶ崎海岸', kana: 'じょうがさきかいがん', region: '静岡県 伊東市', category: '吊橋・海岸絶景' },
  { name: '白川郷合掌造り集落', kana: 'しらかわごう', region: '岐阜県 白川村', category: '世界遺産・集落' },
  { name: '飛騨高山・古い町並', kana: 'ひだたかやま', region: '岐阜県 高山市', category: '小京都・町並み' },
  { name: '兼六園', kana: 'けんろくえん', region: '石川県 金沢市', category: '日本三名園' },
  { name: '金沢21世紀美術館', kana: 'かなざわにじゅういっせいきびじゅつかん', region: '石川県 金沢市', category: '現代アート' },
  { name: '出雲大社', kana: 'いずもたいしゃ', region: '島根県 出雲市', category: '縁結び・大社' },
  { name: '厳島神社・宮島', kana: 'いつくしまじんじゃ', region: '広島県 廿日市市', category: '世界遺産・海中大鳥居' },
  { name: '道後温泉本館', kana: 'どうごおんせん', region: '愛媛県 松山市', category: '日本最古の名湯' },
  { name: '別府地獄めぐり', kana: 'べっぷじごくめぐり', region: '大分県 別府市', category: '温泉・観光名所' },
  { name: '由布院温泉・金鱗湖', kana: 'ゆふいんおんせん', region: '大分県 由布市', category: '温泉・散策' },
  { name: '東京タワー', kana: 'とうきょうたわー', region: '東京都 港区', category: 'ランドマーク・展望台' },
  { name: '東京スカイツリー', kana: 'とうきょうすかいつりー', region: '東京都 墨田区', category: 'ランドマーク・展望台' },
  { name: '浅草寺・雷門', kana: 'せんそうじ', region: '東京都 台東区', category: '歴史・下町' },
  { name: '横浜赤レンガ倉庫', kana: 'よこはまあかれんがそうこ', region: '神奈川県 横浜市', category: '港・商業施設' },
  { name: '江の島', kana: 'えのしま', region: '神奈川県 藤沢市', category: '島・海・神社' },
  { name: '高尾山', kana: 'たかおさん', region: '東京都 八王子市', category: '登山・名所' },
  { name: '宮古島・与那覇前浜', kana: 'みやこじま', region: '沖縄県 宮古島市', category: 'ビーチ・絶景' },
  { name: '美ら海水族館', kana: 'ちゅらうみすいぞくかん', region: '沖縄県 本部町', category: '水族館・海洋博' },
  { name: '富良野ラベンダー畑', kana: 'ふらの', region: '北海道 富良野市', category: '花畑・田園' },
  { name: '小樽運河', kana: 'おたるうんが', region: '北海道 小樽市', category: '運河・レトロ街' },
  { name: '函館山夜景', kana: 'はこだてやま', region: '北海道 函館市', category: '世界三大夜景' },
];

/**
 * 入力中のキーワードからリアルタイムに検索候補（サジェスト）を生成
 * 1. 入力キーワード自体の直接候補
 * 2. Wikipedia Opensearch（日本語の駅名・観光地・施設名に圧倒的に強い）
 * 3. アプリ内人気スポット辞書・寄り道候補（ひらがな・漢字の高速マッチ）
 * 4. Nominatim クイック検索（ノイズ・無関係誤爆を完全シャットアウト）
 */
export async function fetchSearchSuggestions(rawQuery) {
  const clean = (rawQuery || '').trim();
  const query = clean.toLowerCase();
  if (!query) return [];

  const suggestions = [];
  const seen = new Set();

  // 1. 入力キーワードそのものが2文字以上の場合、最優先候補として先頭を確保
  if (clean.length >= 2 && !isNoiseSpot(clean)) {
    seen.add(clean);
    suggestions.push({
      name: clean,
      region: '入力スポットを検索',
      category: /駅$/.test(clean) ? '交通・駅' : '直接検索',
      source: 'direct',
    });
  }

  // 2. Wikipedia Opensearch（日本語の駅名・観光名所に最も強く超高速）
  if (clean.length >= 2) {
    try {
      const openSearchUrl = `https://ja.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
        clean
      )}&limit=6&format=json&origin=*`;
      const resWiki = await fetch(openSearchUrl);
      if (resWiki.ok) {
        const wikiData = await resWiki.json();
        const titles = wikiData?.[1] || [];
        for (const title of titles) {
          if (!title || seen.has(title)) continue;
          if (isNoiseSpot(title)) continue;
          if (!isQueryRelevant(title, clean)) continue;

          seen.add(title);
          let cat = '観光スポット';
          if (/駅$/.test(title)) cat = '交通・駅';
          else if (/寺|神社|宮|大社|城/i.test(title)) cat = '寺社・名所';
          else if (/公園|庭園|ビーチ|海岸|山|高原|湖|滝/i.test(title)) cat = '自然・名所';
          else if (/モール|ショッピング|タワー|ヒルズ/i.test(title)) cat = '施設・名所';

          suggestions.push({
            name: title,
            region: '日本国内',
            category: cat,
            source: 'wikipedia',
          });
          if (suggestions.length >= 6) break;
        }
      }
    } catch {}
  }

  // 3. アプリ内スポット辞書・寄り道候補マッチ（ひらがな/漢字対応）
  if (suggestions.length < 6) {
    for (const s of POPULAR_SPOTS_DICT) {
      const hitName = s.name.toLowerCase().includes(query);
      const hitKana = s.kana.includes(query);
      if ((hitName || hitKana) && !seen.has(s.name)) {
        seen.add(s.name);
        suggestions.push({
          name: s.name,
          region: s.region,
          category: s.category,
          source: 'preset',
        });
      }
      if (suggestions.length >= 6) break;
    }
  }

  // 4. Nominatim クイック検索（ノイズ除外＆関連性検証を100%徹底）
  if (query.length >= 2 && suggestions.length < 5) {
    const osmEndpoints = [
      `/api/osm/search?q=${encodeURIComponent(query)}&format=json&countrycodes=jp&addressdetails=1&limit=4&accept-language=ja`,
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=jp&addressdetails=1&limit=4&accept-language=ja`,
    ];

    for (const osmUrl of osmEndpoints) {
      try {
        const res = await fetch(osmUrl);
        if (!res.ok) continue;
        const osmData = await res.json();
        if (Array.isArray(osmData) && osmData.length > 0) {
          for (const item of osmData) {
            let name = item.name || item.display_name.split(',')[0].trim();
            if (item.class === 'railway' && item.type === 'station' && !name.endsWith('駅')) {
              name = `${name}駅`;
            }

            // ノイズ（道路・営業所・バス停・信号など）は完全除外
            if (isNoiseSpot(name)) continue;
            // クエリと無関係な「室堂駅」などの誤爆を100%除外
            if (!isQueryRelevant(name, clean)) continue;

            if (!seen.has(name) && !/hairdresser|bus_stop|traffic_signals|fuel|parking/i.test(item.type)) {
              seen.add(name);
              const addr = item.address || {};
              const region = [
                addr.province || addr.state || addr.prefecture || '',
                addr.city || addr.town || addr.village || '',
              ].filter(Boolean).join(' ');

              suggestions.push({
                name,
                region: region || '日本国内',
                category: item.type || item.class || 'スポット',
                source: 'osm',
              });
            }
            if (suggestions.length >= 6) break;
          }
          break;
        }
      } catch {
        // 次のエンドポイントへ
      }
    }
  }

  return suggestions.slice(0, 6);
}

/**
 * 2点間の直線距離（Haversineの公式 / 単位: km）
 */
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * ホットペッパーのジャンル名や店名から「cafe」か「restaurant」かを分類
 */
export function classifyGourmetCategory(genreName = '', catchText = '', shopName = '') {
  const full = `${genreName} ${catchText} ${shopName}`.toLowerCase();
  if (/カフェ|喫茶|スイーツ|パン|ベーカリー|パフェ|洋菓子|和菓子|デザート|tea|cafe/i.test(full)) {
    return 'cafe';
  }
  return 'restaurant';
}

/**
 * ホットペッパー店舗オブジェクトをアプリ共通フォーマットへ変換
 */
function formatHotpepperShop(s, refLat = null, refLng = null) {
  const genreName = s.genre?.name || 'グルメ';
  const catchText = s.catch || s.genre?.catch || '';
  const catType = classifyGourmetCategory(genreName, catchText, s.name);
  const isCafe = catType === 'cafe';

  let icon = isCafe ? '☕' : '🍽️';
  if (!isCafe) {
    if (/和食|海鮮|魚/i.test(genreName)) icon = '🐟';
    else if (/焼肉|肉/i.test(genreName)) icon = '🥩';
    else if (/イタリアン|フレンチ|パスタ/i.test(genreName)) icon = '🍝';
    else if (/居酒屋|バー|酒/i.test(genreName)) icon = '🍺';
    else if (/ラーメン/i.test(genreName)) icon = '🍜';
  }

  const shopLat = parseFloat(s.lat);
  const shopLng = parseFloat(s.lng);
  const dist =
    typeof refLat === 'number' && typeof refLng === 'number' && !isNaN(shopLat) && !isNaN(shopLng)
      ? getDistanceKm(refLat, refLng, shopLat, shopLng)
      : undefined;

  const descParts = [];
  if (s.catch) descParts.push(s.catch);
  if (s.genre?.name) descParts.push(`【${s.genre.name}】`);
  if (s.budget?.name) descParts.push(`予算: ${s.budget.name}`);
  if (s.open) descParts.push(`営業: ${s.open}`);

  return {
    id: `hp-${s.id}`,
    name: s.name,
    title: s.name,
    extract: descParts.join(' / ') || s.address,
    desc: descParts.join(' / ') || s.address,
    region: s.address || '日本国内',
    address: s.address,
    category: isCafe ? 'カフェ・スイーツ' : genreName,
    categoryType: catType, // 'cafe' | 'restaurant'
    icon,
    lat: shopLat,
    lng: shopLng,
    distanceKm: dist,
    hasRealCoord: true,
    tag: s.genre?.catch || genreName,
    imageUrl: (s.photo?.pc?.l || s.photo?.pc?.m || null)
      ? String(s.photo?.pc?.l || s.photo?.pc?.m).replace(/^http:\/\//i, 'https://')
      : null,
    imageSource: 'ホットペッパーグルメ',
    wikiUrl: s.urls?.pc || null,
    detailUrl: s.urls?.pc || null,
    theme: {
      type: isCafe ? 'cafe' : 'nature',
      label: isCafe ? 'カフェ・スイーツ' : genreName || 'レストラン',
      icon,
      gradient: isCafe
        ? 'linear-gradient(135deg, #f7f1ea 0%, #eddccf 100%)'
        : 'linear-gradient(135deg, #fbf5ef 0%, #f4e8dc 100%)',
      color: isCafe ? '#a07050' : '#b25d3b',
    },
    defaultStay: isCafe ? 45 : 60,
    sourceType: 'gourmet',
  };
}

/**
 * ホットペッパーリクエスト共通ヘルパー（開発環境はプロキシ、本番GitHub PagesはJSONPでCORS回避）
 */
async function requestHotpepperShops(queryParams) {
  // 1. プロキシ（Vercel Serverless Function / Vite 開発環境プロキシ）
  const proxyUrls = [
    `/api/hotpepper?${queryParams}&format=json`,
    `/api/hotpepper/hotpepper/gourmet/v1/?${queryParams}&format=json`,
  ];
  for (const proxyUrl of proxyUrls) {
    try {
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const text = await res.text();
        // SPAのindex.htmlなどのHTMLフォールバックが返ってきた場合はスキップ
        if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
          continue;
        }
        try {
          const data = JSON.parse(text);
          const shops = data?.results?.shop || [];
          if (shops.length > 0) return shops;
        } catch {}
      }
    } catch {
      // 次のプロキシ候補へ
    }
  }

  // 2. ブラウザ環境（GitHub Pages等）での JSONP
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const jsonpUrl = `https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${queryParams}&format=jsonp`;
      const data = await fetchJsonp(jsonpUrl, 5500);
      const shops = data?.results?.shop || [];
      if (shops.length > 0) return shops;
    } catch {
      // JSONP失敗時は次を試行
    }
  }

  // 3. 直接フェッチ
  try {
    const directUrl = `https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${queryParams}&format=json`;
    const resDirect = await fetch(directUrl);
    if (resDirect.ok) {
      const text = await resDirect.text();
      const data = JSON.parse(text);
      const shops = data?.results?.shop || [];
      if (shops.length > 0) return shops;
    }
  } catch {
    return [];
  }

  return [];
}

/**
 * ホットペッパーグルメAPIによるキーワード検索（目的地検索でレストラン・カフェもヒット）
 */
export async function searchGourmetFromHotpepper(keyword, limit = 8) {
  const { hotpepperKey } = getExternalApiKeys();
  if (!hotpepperKey || !keyword || !keyword.trim()) return [];

  const clean = keyword.trim();
  const params = `key=${encodeURIComponent(hotpepperKey)}&keyword=${encodeURIComponent(clean)}&count=${limit * 2}`;
  const shops = await requestHotpepperShops(params);
  return shops.slice(0, limit).map((s) => formatHotpepperShop(s));
}

/**
 * ホットペッパーグルメAPIによる周辺飲食店・カフェ検索
 */
export async function fetchNearbyHotpepperGourmet(lat, lng, range = 5, limit = 8) {
  const { hotpepperKey } = getExternalApiKeys();
  if (!hotpepperKey) return [];

  const params = `key=${encodeURIComponent(hotpepperKey)}&lat=${lat}&lng=${lng}&range=${range}&count=${limit * 2}`;
  const shops = await requestHotpepperShops(params);
  return shops.slice(0, limit).map((s) => formatHotpepperShop(s, lat, lng));
}

/**
 * OpenStreetMap Overpass API による周辺カフェ・レストラン補助取得（GitHub Pagesから直接CORS呼び出し可能）
 */
async function fetchNearbyOverpassGourmet(lat, lng, radiusM = 3500, limit = 6) {
  try {
    const query = `[out:json][timeout:6];(node["amenity"~"^(cafe|restaurant)$"]["name"](around:${radiusM},${lat},${lng}););out ${limit * 2};`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const elements = data?.elements || [];

    const items = [];
    const seen = new Set();
    for (const el of elements) {
      const name = el.tags?.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);

      const isCafe = el.tags?.amenity === 'cafe' || /カフェ|喫茶|珈琲|cafe/i.test(name);
      const dist = getDistanceKm(lat, lng, el.lat, el.lon);
      items.push({
        id: `osm-gourmet-${el.id}`,
        name,
        category: isCafe ? 'カフェ・スイーツ' : 'グルメ・食事',
        categoryType: isCafe ? 'cafe' : 'restaurant',
        icon: isCafe ? '☕' : '🍽️',
        lat: el.lat,
        lng: el.lon,
        distanceKm: dist,
        tag: isCafe ? '周辺のカフェ' : '周辺のレストラン',
        desc: `${name}（OpenStreetMap周辺の${isCafe ? 'カフェ' : '飲食店'}）`,
        imageUrl: null,
        imageSource: null,
        detailUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
        defaultStay: isCafe ? 45 : 60,
        sourceType: 'gourmet',
      });
      if (items.length >= limit) break;
    }
    return items;
  } catch {
    return [];
  }
}

/**
 * Wikipedia Geosearch による周辺観光名所・公園・寺社検索
 */
export async function fetchNearbyWikipediaSpots(lat, lng, radius = 5000, currentTitle = '', limit = 4) {
  try {
    const url = `https://ja.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=${radius}&ggslimit=15&prop=pageimages|extracts|coordinates|info&pithumbsize=1000&exintro=1&explaintext=1&exsentences=2&format=json&origin=*`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TabitomoTravelApp/1.0' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const pages = Object.values(data?.query?.pages || {});
    if (pages.length === 0) return [];

    // 除外ワード: 学校、病院、警察、消防、役所、道路、営業所、事件など
    const noiseRegex = /小学校|中学校|高等学校|高校|大学|幼稚園|保育園|病院|医院|診療所|警察署|交番|消防|市役所|区役所|役場|県道|国道|停車場線|IC|JCT|バイパス|営業所|車庫|バス停|変電所|団地|郵便局|霊園|墓地|選挙区|議会|事件|事故|花火大会/i;

    const currentNorm = (currentTitle || '').trim().toLowerCase();

    const filtered = pages.filter((p) => {
      const title = (p.title || '').trim();
      if (!title) return false;
      // 現在のメインスポット名と酷似しているものは除外
      const norm = title.toLowerCase();
      if (currentNorm && (norm.includes(currentNorm) || currentNorm.includes(norm))) {
        return false;
      }
      if (noiseRegex.test(title) || isNoiseSpot(title)) return false;
      return true;
    });

    return filtered.slice(0, limit).map((p) => {
      const pLat = p.coordinates?.[0]?.lat || lat;
      const pLng = p.coordinates?.[0]?.lon || lng;
      const dist = getDistanceKm(lat, lng, pLat, pLng);

      const title = p.title;
      let icon = '📍';
      let category = '散策';
      if (/海|浜|海岸|島|港|岬/i.test(title)) {
        icon = '🌊';
        category = '海・景勝地';
      } else if (/神社|大社|宮/i.test(title)) {
        icon = '⛩️';
        category = '寺社・名所';
      } else if (/寺|院|堂/i.test(title)) {
        icon = '🏮';
        category = '寺社・名所';
      } else if (/公園|庭園|植物園/i.test(title)) {
        icon = '🌿';
        category = '公園・自然';
      } else if (/美術館|博物館|記念館|館/i.test(title)) {
        icon = '🎨';
        category = '文化・見学';
      } else if (/山|岳|高原|峰|展望/i.test(title)) {
        icon = '⛰️';
        category = '展望・自然';
      }

      let desc = (p.extract || '').replace(/\s+/g, ' ').trim();
      if (desc.length > 140) desc = desc.slice(0, 140) + '…';
      if (!desc) desc = `${title}のスポット情報です。散策や立ち寄りに人気です。`;

      return {
        id: `wiki-geo-${p.pageid || Math.random().toString(36).slice(2, 8)}`,
        name: title,
        category,
        icon,
        lat: pLat,
        lng: pLng,
        distanceKm: dist,
        tag: category,
        desc,
        imageUrl: p.thumbnail?.source || null,
        imageSource: p.thumbnail?.source ? 'Wikipedia (Wikimedia Commons)' : null,
        detailUrl: p.fullurl || `https://ja.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        defaultStay: 40,
        sourceType: 'sightseeing',
        categoryType: 'sightseeing',
      };
    });
  } catch {
    return [];
  }
}

/**
 * 周辺スポットのハイブリッド検索（Wikipedia観光名所 ＋ ホットペッパーグルメ）
 * 観光地、レストラン、カフェの各カテゴリで絞り込めるよう十分に取得
 */
export async function fetchNearbySpotsHybrid(lat, lng, spotTitle = '', fallbackList = []) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return [];
  }

  // 並行取得（観光名所6件、周辺ホットペッパーグルメ12件、モール・施設名直接店舗検索8件）
  const cleanTitle = (spotTitle || '').trim();
  const titleSearchPromise =
    cleanTitle && cleanTitle.length >= 2 && !/駅$/.test(cleanTitle)
      ? searchGourmetFromHotpepper(cleanTitle, 8)
      : Promise.resolve([]);

  const [wikiSpots, hpGourmetSpots, facilityShops] = await Promise.all([
    fetchNearbyWikipediaSpots(lat, lng, 8000, spotTitle, 6),
    fetchNearbyHotpepperGourmet(lat, lng, 3, 12),
    titleSearchPromise,
  ]);

  // モール内店舗を最優先にしつつ、周辺店舗とマージ
  const allGourmet = [...facilityShops, ...hpGourmetSpots];
  let gourmetSpots = allGourmet;

  // ホットペッパーが空だった場合は OpenStreetMap Overpass API で周辺カフェ・飲食店を補完
  if (gourmetSpots.length === 0) {
    gourmetSpots = await fetchNearbyOverpassGourmet(lat, lng, 3500, 6);
  }

  const combined = [];
  const seenNames = new Set();

  // 観光名所とグルメをバランスよく追加（モール内店舗やグルメをたっぷり網羅）
  const maxLen = Math.max(wikiSpots.length, gourmetSpots.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < gourmetSpots.length && !seenNames.has(gourmetSpots[i].name)) {
      combined.push(gourmetSpots[i]);
      seenNames.add(gourmetSpots[i].name);
    }
    if (i < wikiSpots.length && !seenNames.has(wikiSpots[i].name)) {
      combined.push(wikiSpots[i]);
      seenNames.add(wikiSpots[i].name);
    }
  }

  // プリセットの周辺カフェ・飲食店（fallbackList）も、グルメが不足していればしっかり混ぜる
  const hasCafeInCombined = combined.some((c) => getNormalizedCategoryType(c) === 'cafe');
  const hasRestInCombined = combined.some((c) => getNormalizedCategoryType(c) === 'restaurant');
  if ((combined.length < 6 || !hasCafeInCombined || !hasRestInCombined) && Array.isArray(fallbackList) && fallbackList.length > 0) {
    for (const f of fallbackList) {
      if (!seenNames.has(f.name)) {
        combined.push({
          ...f,
          categoryType: getNormalizedCategoryType(f),
        });
        seenNames.add(f.name);
      }
      if (combined.length >= 10) break;
    }
  }

  return combined.map((item) => ({
    ...item,
    categoryType: getNormalizedCategoryType(item),
  }));
}

/**
 * 入力文字列が GoogleマップのURL かどうかを判定
 */
export function isGoogleMapsUrl(str) {
  if (!str || typeof str !== 'string') return false;
  const clean = str.trim();
  return (
    /https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(
      clean
    )
  );
}

/**
 * GoogleマップのURLからスポット名と緯度経度を抽出するパーサー
 */
export function parseGoogleMapsUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const url = rawUrl.trim();

  let name = '';
  let lat = null;
  let lng = null;

  // 1. /place/スポット名/@lat,lng または /place/スポット名/
  const placeMatch = url.match(/\/place\/([^/@?#]+)/);
  if (placeMatch && placeMatch[1]) {
    try {
      name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
    } catch {
      name = placeMatch[1].replace(/\+/g, ' ').trim();
    }
  }

  // 2. /search/スポット名
  if (!name) {
    const searchMatch = url.match(/\/search\/([^/@?#]+)/);
    if (searchMatch && searchMatch[1]) {
      try {
        name = decodeURIComponent(searchMatch[1].replace(/\+/g, ' ')).trim();
      } catch {
        name = searchMatch[1].replace(/\+/g, ' ').trim();
      }
    }
  }

  // 3. クエリパラメータ（q=... または query=...）
  if (!name) {
    const qMatch = url.match(/[?&](?:q|query)=([^&]+)/);
    if (qMatch && qMatch[1]) {
      try {
        const decoded = decodeURIComponent(qMatch[1].replace(/\+/g, ' ')).trim();
        if (!/^-?\d+\.\d+,-?\d+\.\d+$/.test(decoded)) {
          name = decoded;
        }
      } catch {}
    }
  }

  // 4. 座標抽出（@lat,lng または ?q=lat,lng または ?ll=lat,lng）
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    lat = parseFloat(atMatch[1]);
    lng = parseFloat(atMatch[2]);
  }

  if ((!lat || !lng)) {
    const coordParamMatch = url.match(/[?&](?:q|ll|daddr)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordParamMatch) {
      lat = parseFloat(coordParamMatch[1]);
      lng = parseFloat(coordParamMatch[2]);
    }
  }

  // 5. !3dlat!4dlng (Google Maps の内部データパラメータ)
  if ((!lat || !lng)) {
    const dataCoordMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataCoordMatch) {
      lat = parseFloat(dataCoordMatch[1]);
      lng = parseFloat(dataCoordMatch[2]);
    }
  }

  return { name, lat, lng, rawUrl: url };
}

/**
 * GoogleマップURLからスポット名・座標・高画質写真・解説をすべて自動解決
 * APIキー不要・短縮URL（maps.app.goo.gl）にも対応
 */
export async function resolveGoogleMapsSpot(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const input = rawInput.trim();
  if (!isGoogleMapsUrl(input)) return null;

  let finalUrl = input;
  let pageTitle = '';

  // 短縮URL（maps.app.goo.gl 等）の場合は、サーバー側でリダイレクト先を展開
  if (/goo\.gl/i.test(input)) {
    try {
      const res = await fetch(`/api/resolve-maps-url?url=${encodeURIComponent(input)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.finalUrl) finalUrl = data.finalUrl;
        if (data.title) pageTitle = data.title;
      }
    } catch (e) {
      console.warn('Failed to resolve short Google Maps URL:', e);
    }
  }

  // URLから情報抽出
  const parsed = parseGoogleMapsUrl(finalUrl);
  let name = parsed?.name || pageTitle || '';
  let lat = parsed?.lat || null;
  let lng = parsed?.lng || null;

  // もし座標が取れず名前がある場合は、Nominatimで座標を特定
  if (name && (!lat || !lng)) {
    try {
      const osmItems = await searchFromNominatim(name);
      if (osmItems.length > 0) {
        lat = parseFloat(osmItems[0].lat);
        lng = parseFloat(osmItems[0].lon);
      }
    } catch {}
  }

  // もし名前が取れず座標がある場合、Nominatimで逆引き
  if ((lat && lng) && !name) {
    try {
      const revUrl = `/api/osm/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`;
      const resRev = await fetch(revUrl, {
        headers: { 'User-Agent': 'TabitomoTravelApp/1.0' },
      });
      if (resRev.ok) {
        const revData = await resRev.json();
        name =
          revData.name ||
          revData.display_name?.split(',')?.[0]?.trim() ||
          'Googleマップ登録地';
      }
    } catch {}
  }

  if (!name && !lat) {
    name = pageTitle || 'Googleマップのスポット';
  }

  // Wikipedia & 楽天 & ホットペッパーから写真・解説・テーマを自動取得
  let extract = '';
  let imageUrl = null;
  let imageSource = null;

  if (name) {
    const wikiInfo = await fetchWikiInfo(name);
    if (wikiInfo) {
      extract = wikiInfo.extract || '';
      imageUrl = wikiInfo.imageUrl || null;
      imageSource = wikiInfo.imageSource || null;
      if (!lat || !lng) {
        lat = wikiInfo.lat;
        lng = wikiInfo.lng;
      }
    }

    if (!imageUrl) {
      const keys = getExternalApiKeys();
      const rakuten = await searchPhotoFromRakuten(name, keys);
      if (rakuten?.imageUrl) {
        imageUrl = rakuten.imageUrl;
        imageSource = '楽天トラベル';
      }
    }

    if (!imageUrl) {
      const gList = await searchGourmetFromHotpepper(name, 1);
      if (gList.length > 0 && gList[0].imageUrl) {
        imageUrl = gList[0].imageUrl;
        imageSource = 'ホットペッパーグルメ';
        if (!extract) extract = gList[0].extract;
      }
    }
  }

  if (!extract) {
    extract = `${name}（Googleマップから追加された目的地です）`;
  }

  const theme = detectWatercolorTheme(name, extract);

  return {
    id: `gmaps-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name,
    title: name,
    extract: extract,
    desc: extract,
    region: 'Googleマップ登録地',
    category: 'Googleマップ',
    categoryType: 'sightseeing',
    icon: '📍',
    lat: lat || 35.6812,
    lng: lng || 139.7671,
    hasRealCoord: Boolean(lat && lng),
    imageUrl,
    imageSource,
    detailUrl: finalUrl,
    googleMapsUrl: input,
    wikiUrl: finalUrl,
    theme,
    defaultStay: 50,
    sourceType: 'gmaps',
  };
}

// ------------------------------------------------------------
// 全国主要ランドマーク・駅・観光地の座標辞書（オフライン高速解決用）
// エリア属性（area）を持たせることで、同名・類似地名（例: 東京の銀座 vs 軽井沢の旧銀座）の誤爆を100%防止
// ------------------------------------------------------------
const PRESET_GEO_DICTIONARY = [
  // 軽井沢・信州
  { area: '軽井沢', keywords: ['旧軽井沢銀座通り', '旧軽井沢銀座', '旧軽銀座', '旧銀座通り', '旧銀座', '軽井沢銀座', '軽井沢銀座通り', '旧銀座散策'], lat: 36.3587, lng: 138.6345 },
  { area: '軽井沢', keywords: ['軽井沢高原教会', '高原教会'], lat: 36.3578, lng: 138.5877 },
  { area: '軽井沢', keywords: ['石の教会', '内村鑑三記念堂'], lat: 36.3571, lng: 138.5872 },
  { area: '軽井沢', keywords: ['ハルニレテラス', '星野エリア', 'ハルニレテラス散策'], lat: 36.3575, lng: 138.5900 },
  { area: '軽井沢', keywords: ['星野温泉 トンボの湯', 'トンボの湯', '星野温泉'], lat: 36.3585, lng: 138.5885 },
  { area: '軽井沢', keywords: ['丸山珈琲', '丸山珈琲 軽井沢本店', '丸山珈琲 ハルニレテラス店'], lat: 36.3541, lng: 138.5916 },
  { area: '軽井沢', keywords: ['沢村', 'ベーカリー＆レストラン 沢村', 'ベーカリー＆レストラン沢村', '軽井沢沢村', '沢村ベーカリー'], lat: 36.3582, lng: 138.6322 },
  { area: '軽井沢', keywords: ['雲場池'], lat: 36.3563, lng: 138.6272 },
  { area: '軽井沢', keywords: ['軽井沢駅', '軽井沢', '旧軽井沢', '軽井沢プリンスショッピングプラザ', '軽井沢アウトレット'], lat: 36.3425, lng: 138.6358 },
  { area: '軽井沢', keywords: ['白糸の滝', '白糸の滝（軽井沢）', '軽井沢白糸の滝'], lat: 36.4172, lng: 138.6015 },
  { area: '軽井沢', keywords: ['鬼押出し園'], lat: 36.4385, lng: 138.5303 },

  // 日光・栃木
  { area: '日光', keywords: ['日光東照宮', '東照宮', '日光山輪王寺', '輪王寺', '日光二荒山神社', '二荒山神社'], lat: 36.7580, lng: 139.5989 },
  { area: '日光', keywords: ['日光駅', '東武日光駅', '日光'], lat: 36.7473, lng: 139.6198 },
  { area: '日光', keywords: ['中禅寺湖'], lat: 36.7412, lng: 139.4820 },
  { area: '日光', keywords: ['華厳の滝', '華厳滝'], lat: 36.7381, lng: 139.5022 },
  { area: '日光', keywords: ['竜頭の滝'], lat: 36.7582, lng: 139.4447 },
  { area: '日光', keywords: ['湯滝', '湯ノ湖', '奥日光'], lat: 36.7925, lng: 139.4283 },
  { area: '日光', keywords: ['戦場ヶ原', '小田代原'], lat: 36.7728, lng: 139.4469 },
  { area: '日光', keywords: ['いろは坂', '第一いろは坂', '第二いろは坂', '明智平'], lat: 36.7444, lng: 139.5186 },
  { area: '日光', keywords: ['鬼怒川温泉', '鬼怒川温泉駅', '鬼怒川'], lat: 36.8322, lng: 139.7153 },

  // 東京・首都圏
  { area: '東京', keywords: ['東京駅', '東京', '八重洲', '丸の内'], lat: 35.6812, lng: 139.7671 },
  { area: '東京', keywords: ['新宿駅', '新宿'], lat: 35.6896, lng: 139.7006 },
  { area: '東京', keywords: ['渋谷駅', '渋谷', 'ハチ公'], lat: 35.6580, lng: 139.7016 },
  { area: '東京', keywords: ['池袋駅', '池袋'], lat: 35.7295, lng: 139.7109 },
  { area: '東京', keywords: ['上野駅', '上野', '上野公園', '上野恩賜公園', '上野動物園'], lat: 35.7140, lng: 139.7741 },
  { area: '東京', keywords: ['品川駅', '品川'], lat: 35.6284, lng: 139.7387 },
  { area: '東京', keywords: ['羽田空港'], lat: 35.5494, lng: 139.7798 },
  { area: '東京', keywords: ['成田空港'], lat: 35.7720, lng: 140.3929 },
  { area: '東京', keywords: ['浅草寺', '浅草', '雷門', '仲見世'], lat: 35.7148, lng: 139.7967 },
  { area: '東京', keywords: ['東京スカイツリー', 'スカイツリー', 'ソラマチ'], lat: 35.7100, lng: 139.8107 },
  { area: '東京', keywords: ['東京タワー'], lat: 35.6586, lng: 139.7454 },
  { area: '東京', keywords: ['明治神宮', '原宿'], lat: 35.6764, lng: 139.6993 },
  { area: '東京', keywords: ['お台場', '台場', 'レインボーブリッジ'], lat: 35.6298, lng: 139.7770 },
  { area: '東京', keywords: ['東京銀座', '銀座', '有楽町', '数寄屋橋'], lat: 35.6719, lng: 139.7648 },
  { area: '東京', keywords: ['六本木', '六本木ヒルズ'], lat: 35.6628, lng: 139.7292 },
  { area: '東京', keywords: ['高尾山'], lat: 35.6251, lng: 139.2437 },
  { area: '千葉', keywords: ['東京ディズニーランド', 'ディズニーランド', '舞浜'], lat: 35.6329, lng: 139.8804 },
  { area: '千葉', keywords: ['東京ディズニーシー', 'ディズニーシー'], lat: 35.6267, lng: 139.8851 },

  // 神奈川
  { area: '神奈川', keywords: ['横浜駅', '横浜'], lat: 35.4658, lng: 139.6227 },
  { area: '神奈川', keywords: ['みなとみらい', '赤レンガ倉庫', '横浜赤レンガ倉庫', '山下公園'], lat: 35.4526, lng: 139.6429 },
  { area: '鎌倉', keywords: ['鎌倉駅', '鎌倉', '鶴岡八幡宮', '小町通り'], lat: 35.3260, lng: 139.5564 },
  { area: '鎌倉', keywords: ['高徳院', '鎌倉大仏'], lat: 35.3168, lng: 139.5357 },
  { area: '江の島', keywords: ['江の島', '江ノ島', '江島神社'], lat: 35.3014, lng: 139.4811 },
  { area: '箱根', keywords: ['箱根湯本', '箱根湯本温泉', '箱根'], lat: 35.2332, lng: 139.1038 },
  { area: '箱根', keywords: ['大涌谷'], lat: 35.2427, lng: 139.0195 },
  { area: '箱根', keywords: ['芦ノ湖', '箱根神社', '元箱根'], lat: 35.2047, lng: 139.0256 },
  { area: '箱根', keywords: ['彫刻の森美術館'], lat: 35.2443, lng: 139.0514 },

  // 静岡・富士山
  { area: '富士山', keywords: ['富士山', '富士山頂'], lat: 35.3606, lng: 138.7274 },
  { area: '富士急', keywords: ['富士急ハイランド'], lat: 35.4869, lng: 138.7806 },
  { area: '富士五湖', keywords: ['河口湖', '忍野八海'], lat: 35.5228, lng: 138.7454 },
  { area: '富士五湖', keywords: ['山中湖'], lat: 35.4192, lng: 138.8788 },
  { area: '熱海', keywords: ['熱海駅', '熱海', '熱海温泉', '熱海サンビーチ'], lat: 35.0940, lng: 139.0730 },
  { area: '伊東', keywords: ['伊東', '城ヶ崎海岸', '大室山'], lat: 34.9753, lng: 139.0949 },

  // 群馬
  { area: '草津', keywords: ['草津温泉', '湯畑', '草津'], lat: 36.6206, lng: 138.5960 },
  { area: '伊香保', keywords: ['伊香保温泉', '伊香保石段街'], lat: 36.4988, lng: 138.9189 },

  // 京都・関西
  { area: '京都', keywords: ['京都駅', '京都'], lat: 34.9858, lng: 135.7588 },
  { area: '京都', keywords: ['清水寺', '産寧坂', '二年坂', '三年坂'], lat: 34.9949, lng: 135.7850 },
  { area: '京都', keywords: ['伏見稲荷大社', '伏見稲荷', '千本鳥居'], lat: 34.9671, lng: 135.7727 },
  { area: '京都', keywords: ['金閣寺', '鹿苑寺'], lat: 35.0394, lng: 135.7292 },
  { area: '京都', keywords: ['銀閣寺', '慈照寺', '哲学の道'], lat: 35.0272, lng: 135.7982 },
  { area: '京都', keywords: ['嵐山', '渡月橋', '天龍寺', '竹林の小径'], lat: 35.0129, lng: 135.6777 },
  { area: '京都', keywords: ['祇園', '八坂神社', '花見小路'], lat: 35.0037, lng: 135.7785 },
  { area: '京都', keywords: ['二条城'], lat: 35.0142, lng: 135.7482 },
  { area: '京都', keywords: ['錦市場'], lat: 35.0050, lng: 135.7653 },
  { area: '京都', keywords: ['下鴨神社', '鴨川'], lat: 35.0389, lng: 135.7731 },
  { area: '京都', keywords: ['宇治', '平等院', '平等院鳳凰堂'], lat: 34.8893, lng: 135.8077 },
  { area: '大阪', keywords: ['大阪駅', '梅田', '大阪'], lat: 34.7024, lng: 135.4959 },
  { area: '大阪', keywords: ['なんば', '難波', '道頓堀', '心斎橋'], lat: 34.6687, lng: 135.5013 },
  { area: '大阪', keywords: ['ユニバーサル・スタジオ・ジャパン', 'USJ'], lat: 34.6654, lng: 135.4323 },
  { area: '大阪', keywords: ['大阪城', '大阪城公園'], lat: 34.6873, lng: 135.5262 },
  { area: '大阪', keywords: ['通天閣', '新世界'], lat: 34.6525, lng: 135.5063 },
  { area: '大阪', keywords: ['あべのハルカス', '天王寺'], lat: 34.6460, lng: 135.5133 },
  { area: '奈良', keywords: ['奈良公園', '東大寺', '春日大社', '奈良'], lat: 34.6851, lng: 135.8398 },
  { area: '兵庫', keywords: ['神戸駅', '三宮', '神戸', 'メリケンパーク'], lat: 34.6946, lng: 135.1951 },
  { area: '兵庫', keywords: ['有馬温泉'], lat: 34.7972, lng: 135.2472 },
  { area: '兵庫', keywords: ['姫路城'], lat: 34.8394, lng: 134.6939 },

  // 中部・甲信越・北陸
  { area: '愛知', keywords: ['名古屋駅', '名古屋'], lat: 35.1709, lng: 136.8815 },
  { area: '愛知', keywords: ['名古屋城'], lat: 35.1856, lng: 136.8991 },
  { area: '愛知', keywords: ['熱田神宮'], lat: 35.1259, lng: 136.9090 },
  { area: '愛知', keywords: ['ジブリパーク'], lat: 35.1708, lng: 137.0898 },
  { area: '三重', keywords: ['伊勢神宮', '内宮', 'おかげ横丁', '伊勢'], lat: 34.4550, lng: 136.7258 },
  { area: '金沢', keywords: ['金沢駅', '金沢'], lat: 36.5780, lng: 136.6478 },
  { area: '金沢', keywords: ['兼六園'], lat: 36.5621, lng: 136.6627 },
  { area: '金沢', keywords: ['金沢21世紀美術館', '21世紀美術館'], lat: 36.5609, lng: 136.6582 },
  { area: '金沢', keywords: ['近江町市場'], lat: 36.5720, lng: 136.6560 },
  { area: '金沢', keywords: ['ひがし茶屋街'], lat: 36.5720, lng: 136.6660 },
  { area: '岐阜', keywords: ['白川郷'], lat: 36.2562, lng: 136.9066 },
  { area: '岐阜', keywords: ['飛騨高山', '高山'], lat: 36.1460, lng: 137.2522 },
  { area: '長野', keywords: ['上高地', '河童橋', '大正池'], lat: 36.2489, lng: 137.6377 },
  { area: '長野', keywords: ['松本城', '松本駅', '松本'], lat: 36.2388, lng: 137.9691 },
  { area: '長野', keywords: ['善光寺', '長野駅', '長野'], lat: 36.6617, lng: 138.1877 },
  { area: '白馬', keywords: ['白馬', '八方尾根', '白馬八方尾根'], lat: 36.6982, lng: 137.8617 },

  // 東北・北海道
  { area: '宮城', keywords: ['仙台駅', '仙台'], lat: 38.2601, lng: 140.8824 },
  { area: '宮城', keywords: ['松島'], lat: 38.3712, lng: 141.0664 },
  { area: '岩手', keywords: ['盛岡駅', '盛岡'], lat: 39.7036, lng: 141.1367 },
  { area: '青森', keywords: ['青森駅', '青森'], lat: 40.8299, lng: 140.7337 },
  { area: '青森', keywords: ['奥入瀬渓流', '十和田湖'], lat: 40.5284, lng: 140.9634 },
  { area: '北海道', keywords: ['札幌駅', '札幌', '大通公園', 'すすきの'], lat: 43.0687, lng: 141.3508 },
  { area: '北海道', keywords: ['小樽駅', '小樽', '小樽運河'], lat: 43.1997, lng: 141.0020 },
  { area: '北海道', keywords: ['函館駅', '函館', '函館山', '五稜郭'], lat: 41.7738, lng: 140.7264 },
  { area: '北海道', keywords: ['旭川駅', '旭川', '旭山動物園'], lat: 43.7684, lng: 142.4800 },
  { area: '北海道', keywords: ['富良野', '美瑛', '青い池'], lat: 43.4934, lng: 142.6141 },
  { area: '北海道', keywords: ['登別温泉'], lat: 42.5113, lng: 141.1444 },
  { area: '北海道', keywords: ['洞爺湖'], lat: 42.6000, lng: 140.8500 },

  // 中国・四国・九州・沖縄
  { area: '広島', keywords: ['広島駅', '広島', '原爆ドーム', '平和記念公園'], lat: 34.3955, lng: 132.4536 },
  { area: '広島', keywords: ['宮島', '厳島神社'], lat: 34.2959, lng: 132.3197 },
  { area: '島根', keywords: ['出雲大社', '出雲'], lat: 35.3995, lng: 132.6859 },
  { area: '岡山', keywords: ['倉敷美観地区', '倉敷'], lat: 34.5953, lng: 133.7719 },
  { area: '愛媛', keywords: ['道後温泉', '松山'], lat: 33.8521, lng: 132.7865 },
  { area: '香川', keywords: ['金刀比羅宮', 'こんぴらさん'], lat: 34.1848, lng: 133.8188 },
  { area: '福岡', keywords: ['博多駅', '博多', '福岡', '天神'], lat: 33.5902, lng: 130.4207 },
  { area: '福岡', keywords: ['太宰府天満宮', '太宰府'], lat: 33.5215, lng: 130.5349 },
  { area: '大分', keywords: ['別府温泉', '別府地獄めぐり', '別府'], lat: 33.3156, lng: 131.4770 },
  { area: '大分', keywords: ['由布院', '湯布院', '金鱗湖'], lat: 33.2647, lng: 131.3653 },
  { area: '熊本', keywords: ['熊本城', '熊本'], lat: 32.8062, lng: 130.7058 },
  { area: '熊本', keywords: ['阿蘇山', '草千里ヶ浜', '阿蘇'], lat: 32.8837, lng: 131.0505 },
  { area: '長崎', keywords: ['長崎駅', '長崎', 'グラバー園'], lat: 32.7530, lng: 129.8707 },
  { area: '沖縄', keywords: ['那覇空港', '那覇', '国際通り'], lat: 26.2153, lng: 127.6853 },
  { area: '沖縄', keywords: ['美ら海水族館'], lat: 26.6943, lng: 127.8779 },
  { area: '沖縄', keywords: ['首里城'], lat: 26.2170, lng: 127.7195 },
  { area: '沖縄', keywords: ['古宇利島'], lat: 26.7022, lng: 128.0267 },
  { area: '沖縄', keywords: ['宮古島'], lat: 24.7981, lng: 125.2811 },
  { area: '沖縄', keywords: ['石垣島'], lat: 24.3448, lng: 124.1572 },
];

/**
 * ローカル辞書からスポット名に対応する経緯度を高速検索
 * エリアヒント（旅行先やタイトル）を優先し、キーワードの長さ順にマッチさせることで同音異義語の誤爆を防ぐ
 */
export function findCoordinatesInLocalDictionary(spotName, areaHint = '') {
  if (!spotName || typeof spotName !== 'string') return null;
  const clean = spotName
    .replace(/^[\d\.\s・\-—]+/, '')
    .replace(/[（\(【\[].*?[）\)】\]]/g, '')
    .trim()
    .toLowerCase();
  if (!clean) return null;

  const cleanArea = (areaHint || '')
    .replace(/旅行|ドライブ|観光|しおり|女子旅|ひとり旅|秋の|春の|夏の|冬の/g, '')
    .trim()
    .toLowerCase();

  // 1. エリアヒントが指定されている場合、そのエリアに属する辞書エントリを最優先で検索
  if (cleanArea && cleanArea.length >= 2) {
    // 1-A: エリア一致エントリの中での完全一致
    for (const item of PRESET_GEO_DICTIONARY) {
      if (item.area && (cleanArea.includes(item.area.toLowerCase()) || item.area.toLowerCase().includes(cleanArea))) {
        for (const kw of item.keywords) {
          if (clean === kw.toLowerCase()) {
            return { lat: item.lat, lng: item.lng, name: kw, area: item.area };
          }
        }
      }
    }
    // 1-B: エリア一致エントリの中での部分一致（キーワード長降順）
    const areaEntries = PRESET_GEO_DICTIONARY.filter(
      (item) => item.area && (cleanArea.includes(item.area.toLowerCase()) || item.area.toLowerCase().includes(cleanArea))
    );
    const sortedAreaKw = [];
    for (const item of areaEntries) {
      for (const kw of item.keywords) {
        sortedAreaKw.push({ kw, lkw: kw.toLowerCase(), item });
      }
    }
    sortedAreaKw.sort((a, b) => b.lkw.length - a.lkw.length);
    for (const { kw, lkw, item } of sortedAreaKw) {
      if (clean === lkw || clean.includes(lkw) || (lkw.length >= 3 && lkw.includes(clean))) {
        return { lat: item.lat, lng: item.lng, name: kw, area: item.area };
      }
    }
  }

  // 2. 全辞書エントリの中での完全一致（Exact Match）最優先！
  for (const item of PRESET_GEO_DICTIONARY) {
    for (const kw of item.keywords) {
      if (clean === kw.toLowerCase()) {
        return { lat: item.lat, lng: item.lng, name: kw, area: item.area };
      }
    }
  }

  // 3. MAIN_SPOTS からの完全一致
  if (Array.isArray(MAIN_SPOTS)) {
    for (const ms of MAIN_SPOTS) {
      if (clean === (ms.name || '').toLowerCase()) {
        return { lat: ms.lat, lng: ms.lng, name: ms.name };
      }
    }
  }

  // 4. YORIMICHI_CANDIDATES からの完全一致
  if (Array.isArray(YORIMICHI_CANDIDATES)) {
    for (const yc of YORIMICHI_CANDIDATES) {
      if (clean === (yc.name || '').toLowerCase()) {
        return { lat: yc.lat, lng: yc.lng, name: yc.name };
      }
    }
  }

  // 5. 全辞書エントリのキーワード長降順マッチ（Longest Match）
  // ★重要: 短いキーワード（例: '銀座' 2文字）より長いキーワード（'旧軽井沢銀座通り' 9文字, '旧銀座' 3文字）を優先！
  const allDictKeywords = [];
  for (const item of PRESET_GEO_DICTIONARY) {
    for (const kw of item.keywords) {
      allDictKeywords.push({ kw, lkw: kw.toLowerCase(), item });
    }
  }
  allDictKeywords.sort((a, b) => b.lkw.length - a.lkw.length);

  for (const { kw, lkw, item } of allDictKeywords) {
    // 2文字以下の短いキーワード（'銀座', '日光', '東京'など）は、複合語の中に埋もれている場合は短絡マッチを弾く
    if (lkw.length <= 2) {
      if (clean === lkw) {
        return { lat: item.lat, lng: item.lng, name: kw, area: item.area };
      }
      if ((clean.startsWith(lkw) || clean.endsWith(lkw)) && clean.length <= 4) {
        return { lat: item.lat, lng: item.lng, name: kw, area: item.area };
      }
      continue;
    }

    if (clean.includes(lkw) || (lkw.length >= 3 && lkw.includes(clean))) {
      return { lat: item.lat, lng: item.lng, name: kw, area: item.area };
    }
  }

  // 6. MAIN_SPOTS & YORIMICHI_CANDIDATES からの部分一致（長さ降順）
  const candidates = [
    ...(Array.isArray(MAIN_SPOTS) ? MAIN_SPOTS : []),
    ...(Array.isArray(YORIMICHI_CANDIDATES) ? YORIMICHI_CANDIDATES : []),
  ];
  candidates.sort((a, b) => (b.name || '').length - (a.name || '').length);
  for (const c of candidates) {
    const lc = (c.name || '').toLowerCase();
    if (!lc) continue;
    if (lc.length <= 2) {
      if (clean === lc) return { lat: c.lat, lng: c.lng, name: c.name };
      continue;
    }
    if (clean.includes(lc) || (lc.length >= 3 && lc.includes(clean))) {
      return { lat: c.lat, lng: c.lng, name: c.name };
    }
  }

  return null;
}

/**
 * スポット名から実在する経緯度（lat, lng）を特定する関数
 * 1. オフライン高速辞書（エリア優先 & 最長一致）
 * 2. travelData の MAIN_SPOTS & YORIMICHI_CANDIDATES
 * 3. OpenStreetMap (Nominatim API) 検索
 * 4. Wikipedia GeoSearch
 * 5. エリアヒントに基づくフォールバック
 */
export async function resolveSpotCoordinates(rawName, areaHint = '') {
  if (!rawName || typeof rawName !== 'string') return null;

  const cleanName = rawName
    .replace(/^[\d\.\s・\-—]+/, '')
    .replace(/[（\(【\[].*?[）\)】\]]/g, '')
    .replace(/\s*-\s*.*$/, '')
    .trim();

  if (!cleanName) return null;

  // 1. ローカル辞書検索（エリアヒント付き・0ms 即時マッチ）
  const localMatch = findCoordinatesInLocalDictionary(cleanName, areaHint);
  if (localMatch) {
    return { lat: localMatch.lat, lng: localMatch.lng, source: 'dictionary' };
  }

  // 2. Nominatim検索（単体）
  try {
    const osmItems = await searchFromNominatim(cleanName);
    if (osmItems.length > 0) {
      const lat = parseFloat(osmItems[0].lat);
      const lng = parseFloat(osmItems[0].lon);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng, source: 'osm' };
      }
    }
  } catch {}

  // 3. エリアヒント（例: "軽井沢", "日光", "箱根"）がある場合、組み合わせ検索
  const cleanArea = (areaHint || '')
    .replace(/旅行|ドライブ|観光|しおり|女子旅|ひとり旅|秋の|春の|夏の|冬の/g, '')
    .trim();

  if (cleanArea && cleanArea.length >= 2 && !cleanName.includes(cleanArea)) {
    try {
      const comboQuery = `${cleanArea} ${cleanName}`;
      const osmItems = await searchFromNominatim(comboQuery);
      if (osmItems.length > 0) {
        const lat = parseFloat(osmItems[0].lat);
        const lng = parseFloat(osmItems[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, source: 'osm-combo' };
        }
      }
    } catch {}
  }

  // 4. Wikipedia GeoOnly検索
  try {
    const wikiItems = await searchWikiGeoOnly(cleanName);
    if (wikiItems.length > 0 && typeof wikiItems[0].lat === 'number') {
      return { lat: wikiItems[0].lat, lng: wikiItems[0].lng, source: 'wikipedia' };
    }
  } catch {}

  // 5. エリアヒント単体の座標をフォールバックとして取得
  if (cleanArea && cleanArea.length >= 2) {
    const areaMatch = findCoordinatesInLocalDictionary(cleanArea, '');
    if (areaMatch) {
      const offsetLat = (Math.random() - 0.5) * 0.015;
      const offsetLng = (Math.random() - 0.5) * 0.015;
      return {
        lat: areaMatch.lat + offsetLat,
        lng: areaMatch.lng + offsetLng,
        source: 'area-fallback',
      };
    }
  }

  return null;
}

/**
 * 旅程リスト（itinerary）全体のスポットを検査し、未設定の座標や誤ったピン位置を自動補正する関数
 */
export async function enrichTripSpotsWithCoordinates(itinerary, areaHint = '') {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return itinerary;

  let hasChanges = false;
  const result = [...itinerary];

  // まず既存スポットの誤座標補正（例: 軽井沢旅行なのに「旧銀座」「旧軽銀座」が東京の銀座 35.67... になっている場合等）
  for (let i = 0; i < result.length; i++) {
    const spot = result[i];
    if (!spot || !spot.name) continue;

    const isSuspectOldGinza = /旧銀座|旧軽井沢銀座|旧軽銀座|軽井沢銀座/i.test(spot.name);
    const isTokyoCoords =
      typeof spot.lat === 'number' &&
      spot.lat > 35.65 &&
      spot.lat < 35.70 &&
      typeof spot.lng === 'number' &&
      spot.lng > 139.74 &&
      spot.lng < 139.79;

    if (isSuspectOldGinza && isTokyoCoords) {
      result[i] = {
        ...spot,
        lat: 36.3587,
        lng: 138.6345,
      };
      hasChanges = true;
    }
  }

  // 即時辞書マッチで取れるものを一括解決
  for (let i = 0; i < result.length; i++) {
    const spot = result[i];
    const hasValidCoords =
      typeof spot.lat === 'number' &&
      typeof spot.lng === 'number' &&
      !isNaN(spot.lat) &&
      !isNaN(spot.lng);

    if (!hasValidCoords && spot.name) {
      const instantMatch = findCoordinatesInLocalDictionary(spot.name, areaHint);
      if (instantMatch) {
        result[i] = {
          ...spot,
          lat: instantMatch.lat,
          lng: instantMatch.lng,
        };
        hasChanges = true;
      }
    }
  }

  // 辞書で取れなかったものをオンライン検索（レート制限配慮で少し間隔を置く）
  for (let i = 0; i < result.length; i++) {
    const spot = result[i];
    const hasValidCoords =
      typeof spot.lat === 'number' &&
      typeof spot.lng === 'number' &&
      !isNaN(spot.lat) &&
      !isNaN(spot.lng);

    if (!hasValidCoords && spot.name) {
      const coords = await resolveSpotCoordinates(spot.name, areaHint);
      if (coords) {
        result[i] = {
          ...spot,
          lat: coords.lat,
          lng: coords.lng,
        };
        hasChanges = true;
      }
      // 短時間の待機
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  return hasChanges ? result : itinerary;
}

/**
 * 周辺の宿・ホテル・旅館を安全に検索（既存のグルメ検索とは完全分離）
 * 1. OpenStreetMap Overpass API (tourism=hotel|guest_house|motel|hostel|chalet)
 * 2. Wikipedia GeoSearch (ホテル・旅館・温泉などの宿泊施設、写真付き優先)
 * 3. 楽天トラベルAPI（キーがある場合）
 * 4. travelData からのフォールバック
 */
export async function fetchNearbyHotels(lat, lng, spotTitle = '', limit = 8) {
  const hotels = [];
  const seenNames = new Set();

  const addHotel = (h) => {
    if (!h || !h.name) return;
    const cleanName = h.name.trim();
    if (seenNames.has(cleanName)) return;
    seenNames.add(cleanName);
    hotels.push(h);
  };

  // 1. 楽天トラベルAPI（もしキーワードで宿がヒットすれば写真付きで追加）
  if (spotTitle) {
    try {
      const keys = getExternalApiKeys();
      if (keys.rakutenId) {
        const rakuten = await searchPhotoFromRakuten(spotTitle, keys);
        if (rakuten && rakuten.hotelName) {
          addHotel({
            id: `rakuten-hotel-${Date.now()}`,
            name: rakuten.hotelName,
            title: rakuten.hotelName,
            category: '宿泊',
            categoryType: 'hotel',
            icon: '🏨',
            lat: lat || 35.6812,
            lng: lng || 139.7671,
            distanceKm: 0.5,
            tag: 'ホテル・旅館',
            caption: '楽天トラベル掲載の周辺宿',
            desc: `${rakuten.hotelName}（楽天トラベル提携宿）`,
            imageUrl: rakuten.imageUrl ? String(rakuten.imageUrl).replace(/^http:\/\//i, 'https://') : null,
            imageSource: '楽天トラベル',
            detailUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rakuten.hotelName)}`,
            defaultStay: 60,
            sourceType: 'hotel',
          });
        }
      }
    } catch {}
  }

  // 2. OpenStreetMap Overpass API による周辺実在ホテルの高速取得（半径約6km）
  if (lat && lng) {
    try {
      const query = `[out:json][timeout:8];(node["tourism"~"^(hotel|guest_house|motel|hostel|chalet)$"]["name"](around:6000,${lat},${lng}););out 15;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const elements = data?.elements || [];
        for (const el of elements) {
          const name = el.tags?.name;
          if (!name) continue;
          const dist = getDistanceKm(lat, lng, el.lat, el.lon);
          const tourismType = el.tags?.tourism || 'hotel';
          const typeLabel =
            tourismType === 'guest_house'
              ? 'ゲストハウス・民宿'
              : tourismType === 'hostel'
              ? 'ホステル'
              : /旅館|温泉/i.test(name)
              ? '旅館・温泉宿'
              : 'ホテル';

          addHotel({
            id: `osm-hotel-${el.id}`,
            name,
            title: name,
            category: '宿泊',
            categoryType: 'hotel',
            icon: '🏨',
            lat: el.lat,
            lng: el.lon,
            distanceKm: dist,
            tag: typeLabel,
            caption: `スポットから約${dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}`,
            desc: `${name}（周辺の${typeLabel}）`,
            imageUrl: null,
            imageSource: null,
            detailUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
            defaultStay: 60,
            sourceType: 'hotel',
          });
          if (hotels.length >= limit) break;
        }
      }
    } catch (osmErr) {
      console.warn('Overpass hotel error:', osmErr);
    }
  }

  // 3. Wikipedia GeoSearch による写真付きホテル・旅館・温泉の補完取得（半径約10km）
  if (lat && lng && hotels.length < limit) {
    try {
      const wikiGeoUrl = `https://ja.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=10000&gslimit=20&format=json&origin=*`;
      const resWiki = await fetch(wikiGeoUrl);
      if (resWiki.ok) {
        const dataWiki = await resWiki.json();
        const pages = dataWiki?.query?.geosearch || [];
        const hotelPages = pages.filter((p) =>
          /ホテル|旅館|温泉|リゾート|ペンション|民宿|ステーションホテル|グランドホテル|プリンスホテル|ドーミーイン/i.test(
            p.title
          )
        );

        for (const p of hotelPages) {
          const dist = getDistanceKm(lat, lng, p.lat, p.lon);
          // サムネイルと要約を取得
          let img = null;
          let extract = '';
          try {
            const detailRes = await fetch(
              `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
                p.title
              )}&prop=extracts|pageimages&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=600&format=json&origin=*`
            );
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              const pageObj = Object.values(detailData?.query?.pages || {})[0];
              img = pageObj?.thumbnail?.source || null;
              extract = pageObj?.extract || '';
            }
          } catch {}

          addHotel({
            id: `wiki-hotel-${p.pageid}`,
            name: p.title,
            title: p.title,
            category: '宿泊',
            categoryType: 'hotel',
            icon: '🏨',
            lat: p.lat,
            lng: p.lon,
            distanceKm: dist,
            tag: /温泉/i.test(p.title) ? '温泉宿・旅館' : 'ホテル',
            caption: `スポットから約${dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}`,
            desc: extract
              ? extract.length > 120
                ? extract.slice(0, 120) + '…'
                : extract
              : `${p.title}（周辺の宿泊施設）`,
            imageUrl: img ? String(img).replace(/^http:\/\//i, 'https://') : null,
            imageSource: img ? 'Wikipedia' : null,
            detailUrl: `https://ja.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
            defaultStay: 60,
            sourceType: 'hotel',
          });
          if (hotels.length >= limit) break;
        }
      }
    } catch (wikiErr) {
      console.warn('Wiki hotel error:', wikiErr);
    }
  }

  // 4. travelData (MAIN_SPOTS) からの近隣宿泊・温泉スポット抽出（フォールバック）
  if (hotels.length === 0 && MAIN_SPOTS && Array.isArray(MAIN_SPOTS)) {
    const nearbySp = MAIN_SPOTS.filter((s) => {
      if (!/温泉|宿|ホテル|リゾート/i.test(s.name + (s.tag || '') + (s.desc || ''))) return false;
      if (!lat || !lng || !s.lat || !s.lng) return true;
      const d = getDistanceKm(lat, lng, s.lat, s.lng);
      return d <= 60;
    }).slice(0, 4);

    for (const s of nearbySp) {
      const dist = lat && lng && s.lat && s.lng ? getDistanceKm(lat, lng, s.lat, s.lng) : null;
      addHotel({
        id: `main-hotel-${s.id}`,
        name: s.name,
        title: s.name,
        category: '宿泊',
        categoryType: 'hotel',
        icon: '🏨',
        lat: s.lat,
        lng: s.lng,
        distanceKm: dist,
        tag: s.tag || 'ホテル・温泉宿',
        caption: dist ? `スポットから約${dist.toFixed(1)}km` : '人気おすすめ宿・温泉',
        desc: s.desc || `${s.name}（おすすめの宿泊・温泉スポット）`,
        imageUrl: s.imageUrl ? String(s.imageUrl).replace(/^http:\/\//i, 'https://') : null,
        imageSource: s.imageSource || null,
        detailUrl: s.detailUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name)}`,
        defaultStay: 60,
        sourceType: 'hotel',
      });
    }
  }

  // 写真付きのものを優先しつつ距離順に整列
  hotels.sort((a, b) => {
    if (a.imageUrl && !b.imageUrl) return -1;
    if (!a.imageUrl && b.imageUrl) return 1;
    return (a.distanceKm || 999) - (b.distanceKm || 999);
  });

  return hotels.slice(0, limit);
}


