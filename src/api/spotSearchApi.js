// ------------------------------------------------------------
// タビトモ — スポット検索 & 高画質写真マルチ取得サービス
// 1. OpenStreetMap (Nominatim API): 実在する観光スポット・ランドマーク・座標の特定（完全無料・キー不要）
// 2. Wikipedia API: 観光地の詳細な解説文・高解像度写真の取得（代表写真＋記事内深掘り）
// 3. 楽天トラベルAPI: 周辺宿・観光施設写真の自動穴埋め
// 4. 自然・風景・観光地の高画質スマートフォールバック
// ------------------------------------------------------------

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
              imageUrl: hotelInfo.hotelImageUrl,
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
 */
async function fetchWikiInfo(spotName) {
  try {
    const url = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      spotName
    )}&prop=pageimages|extracts|coordinates|info&pithumbsize=1000&exintro=1&explaintext=1&exsentences=3&inprop=url&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const page = Object.values(data?.query?.pages || {})[0];
    if (!page || page.missing) return null;

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

  // プロキシ優先、失敗時は公式URL
  const endpoints = [
    `/api/osm/search?q=${encodeURIComponent(
      clean
    )}&format=json&countrycodes=jp&addressdetails=1&limit=8&accept-language=ja`,
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      clean
    )}&format=json&countrycodes=jp&addressdetails=1&limit=8&accept-language=ja`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'TabitomoTravelApp/1.0 (contact: support@tabitomo.local)',
        },
      });
      if (!res.ok) continue;
      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) continue;

      // 除外すべきノイズカテゴリ（理髪店、バス停単体、信号など）
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

      const filtered = items.filter((item) => {
        if (ignoreTypes.has(item.type)) return false;
        return true;
      });

      return filtered;
    } catch {
      // 次のURLへ
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

    // 写真と解説の取得（Wikipedia ＋ 楽天）
    const wikiInfo = await fetchWikiInfo(name);

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

    results.push({
      id: `osm-${item.osm_id || Math.random().toString(36).slice(2, 8)}`,
      name,
      title: name,
      extract,
      region: region || '日本国内',
      category: item.type || item.class || '観光スポット',
      categoryType: 'sightseeing',
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

  // Step 2: もしヒットが少ない場合は、Wikipediaの「座標付き地理記事（馬や辞書用語は完全除外）」で補完
  if (results.length < 3) {
    const wikiGeo = await searchWikiGeoOnly(clean);
    for (const w of wikiGeo) {
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
  }

  // Step 3: ホットペッパーグルメAPIによる飲食店・カフェ検索も並行取得して結合
  try {
    const gourmetResults = await searchGourmetFromHotpepper(clean, 6);
    if (gourmetResults && gourmetResults.length > 0) {
      // 観光地とグルメをブレンドして返却（重複なし）
      for (const g of gourmetResults) {
        if (!seenNames.has(g.name)) {
          results.push(g);
          seenNames.add(g.name);
        }
      }
    }
  } catch {
    // グルメ検索エラー時は観光地のみで安全に継続
  }

  return results;
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
  { name: '軽井沢プリンスショッピングプラザ', kana: 'かるいざわ', region: '長野県 軽井沢町', category: 'リゾート・避暑地' },
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
 * - アプリ内人気スポット辞書（ひらがな・漢字の高速マッチ）
 * - Nominatim クイック検索（漢字入力時・マイナー施設も網羅）
 */
export async function fetchSearchSuggestions(rawQuery) {
  const query = (rawQuery || '').trim().toLowerCase();
  if (!query) return [];

  const suggestions = [];
  const seen = new Set();

  // 1. アプリ内スポット辞書マッチ（超高速・ひらがな/漢字対応）
  for (const s of POPULAR_SPOTS_DICT) {
    const hitName = s.name.toLowerCase().includes(query);
    const hitKana = s.kana.includes(query);
    if (hitName || hitKana) {
      if (!seen.has(s.name)) {
        seen.add(s.name);
        suggestions.push({
          name: s.name,
          region: s.region,
          category: s.category,
          source: 'preset',
        });
      }
    }
    if (suggestions.length >= 5) break;
  }

  // 2. 2文字以上なら Nominatim クイック検索（追加の候補を補完）
  if (query.length >= 2 && suggestions.length < 5) {
    try {
      const osmUrl = `/api/osm/search?q=${encodeURIComponent(
        query
      )}&format=json&countrycodes=jp&addressdetails=1&limit=4&accept-language=ja`;
      const res = await fetch(osmUrl, {
        headers: { 'User-Agent': 'TabitomoTravelApp/1.0' },
      });
      if (res.ok) {
        const osmData = await res.json();
        if (Array.isArray(osmData)) {
          for (const item of osmData) {
            let name = item.name || item.display_name.split(',')[0].trim();
            if (item.class === 'railway' && item.type === 'station' && !name.endsWith('駅')) {
              name = `${name}駅`;
            }
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
        }
      }
    } catch {
      // ネットワーク失敗時は辞書マッチのみで安全に応答
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
 * ホットペッパーグルメAPIによるキーワード検索（目的地検索でレストラン・カフェもヒット）
 */
export async function searchGourmetFromHotpepper(keyword, limit = 8) {
  const { hotpepperKey } = getExternalApiKeys();
  if (!hotpepperKey || !keyword || !keyword.trim()) return [];

  const clean = keyword.trim();
  const endpoints = [
    `/api/hotpepper/hotpepper/gourmet/v1/?key=${encodeURIComponent(
      hotpepperKey
    )}&keyword=${encodeURIComponent(clean)}&format=json&count=${limit * 2}`,
    `https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?key=${encodeURIComponent(
      hotpepperKey
    )}&keyword=${encodeURIComponent(clean)}&format=json&count=${limit * 2}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const shops = data?.results?.shop || [];
      if (shops.length === 0) continue;

      return shops.slice(0, limit).map((s) => {
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
          category: isCafe ? 'カフェ・スイーツ' : genreName,
          categoryType: catType, // 'cafe' | 'restaurant'
          icon,
          lat: shopLat,
          lng: shopLng,
          hasRealCoord: true,
          imageUrl: s.photo?.pc?.l || s.photo?.pc?.m || null,
          imageSource: 'ホットペッパーグルメ',
          wikiUrl: s.urls?.pc || null,
          detailUrl: s.urls?.pc || null,
          theme: {
            type: isCafe ? 'cafe' : 'nature',
            label: isCafe ? 'カフェ・スイーツ' : (genreName || 'レストラン'),
            icon,
            gradient: isCafe
              ? 'linear-gradient(135deg, #f7f1ea 0%, #eddccf 100%)'
              : 'linear-gradient(135deg, #fbf5ef 0%, #f4e8dc 100%)',
            color: isCafe ? '#a07050' : '#b25d3b',
          },
          defaultStay: isCafe ? 45 : 60,
          sourceType: 'gourmet',
        };
      });
    } catch {
      // 次のURLへフォールバック
    }
  }

  return [];
}

/**
 * ホットペッパーグルメAPIによる周辺飲食店・カフェ検索
 */
export async function fetchNearbyHotpepperGourmet(lat, lng, range = 5, limit = 8) {
  const { hotpepperKey } = getExternalApiKeys();
  if (!hotpepperKey) return [];

  const endpoints = [
    `/api/hotpepper/hotpepper/gourmet/v1/?key=${encodeURIComponent(
      hotpepperKey
    )}&lat=${lat}&lng=${lng}&range=${range}&format=json&count=${limit * 2}`,
    `https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?key=${encodeURIComponent(
      hotpepperKey
    )}&lat=${lat}&lng=${lng}&range=${range}&format=json&count=${limit * 2}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const shops = data?.results?.shop || [];
      if (shops.length === 0) continue;

      return shops.slice(0, limit).map((s) => {
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
        const dist = getDistanceKm(lat, lng, shopLat, shopLng);

        const descParts = [];
        if (s.catch) descParts.push(s.catch);
        if (s.genre?.name) descParts.push(`【${s.genre.name}】`);
        if (s.budget?.name) descParts.push(`予算: ${s.budget.name}`);
        if (s.open) descParts.push(`営業: ${s.open}`);

        return {
          id: `hp-${s.id}`,
          name: s.name,
          category: isCafe ? 'カフェ・スイーツ' : genreName,
          categoryType: catType, // 'cafe' | 'restaurant'
          icon,
          lat: shopLat,
          lng: shopLng,
          distanceKm: dist,
          tag: s.genre?.catch || genreName,
          desc: descParts.join(' / ') || s.address,
          address: s.address,
          imageUrl: s.photo?.pc?.l || s.photo?.pc?.m || null,
          imageSource: 'ホットペッパーグルメ',
          detailUrl: s.urls?.pc || null,
          defaultStay: isCafe ? 45 : 60,
          sourceType: 'gourmet',
        };
      });
    } catch {
      // 次のURLへフォールバック
    }
  }

  return [];
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

    // 除外ワード: 学校、病院、警察、消防、役所、道路、事件など
    const noiseRegex = /小学校|中学校|高等学校|高校|大学|幼稚園|保育園|病院|医院|診療所|警察署|交番|消防|市役所|区役所|役場|県道|国道|IC|JCT|バイパス|郵便局|霊園|墓地|選挙区|議会|事件|事故|花火大会/i;

    const currentNorm = (currentTitle || '').trim().toLowerCase();

    const filtered = pages.filter((p) => {
      const title = (p.title || '').trim();
      if (!title) return false;
      // 現在のメインスポット名と酷似しているものは除外
      const norm = title.toLowerCase();
      if (currentNorm && (norm.includes(currentNorm) || currentNorm.includes(norm))) {
        return false;
      }
      if (noiseRegex.test(title)) return false;
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

  // 並行取得（観光地6件、グルメ・カフェ8件）
  const [wikiSpots, gourmetSpots] = await Promise.all([
    fetchNearbyWikipediaSpots(lat, lng, 8000, spotTitle, 6),
    fetchNearbyHotpepperGourmet(lat, lng, 5, 8),
  ]);

  const combined = [];
  const seenNames = new Set();

  // 観光名所とグルメを交互に追加（名所、グルメ、名所、グルメ…）
  const maxLen = Math.max(wikiSpots.length, gourmetSpots.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < wikiSpots.length && !seenNames.has(wikiSpots[i].name)) {
      combined.push(wikiSpots[i]);
      seenNames.add(wikiSpots[i].name);
    }
    if (i < gourmetSpots.length && !seenNames.has(gourmetSpots[i].name)) {
      combined.push(gourmetSpots[i]);
      seenNames.add(gourmetSpots[i].name);
    }
  }

  // もしAPIで両方とも少なかった場合（山奥や離島など）：安全なフォールバック
  if (combined.length < 3 && Array.isArray(fallbackList) && fallbackList.length > 0) {
    for (const f of fallbackList) {
      if (!seenNames.has(f.name)) {
        combined.push({
          ...f,
          categoryType: f.categoryType || 'sightseeing',
        });
        seenNames.add(f.name);
      }
      if (combined.length >= 6) break;
    }
  }

  return combined;
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

