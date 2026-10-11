// ------------------------------------------------------------
// タビトモ — 旅データ & スポット・寄り道マスター
// （※Google Maps等のクレカ登録不要APIは一切不使用）
// ------------------------------------------------------------

/**
 * 2地点間の距離を計算（Haversineの公式 / 単位: km）
 */
export function calcDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球半径 (km)
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
 * 旅行スタイル定義
 */
export const TRIP_STYLES = [
  { id: 'drive', label: 'ドライブ・周遊', icon: '🚗', desc: '絶景ロードや寄り道カフェめぐり' },
  { id: 'onsen', label: '温泉・のんびり', icon: '♨️', desc: '足湯や名湯で心と身体を癒す旅' },
  { id: 'hiking', label: '自然・ハイキング', icon: '⛰️', desc: '高原や湖畔の爽やかな散策' },
  { id: 'city', label: '街歩き・歴史', icon: '🏮', desc: '古都やレトロな商店街を食べ歩き' },
  { id: 'camp', label: 'アウトドア・キャンプ', icon: '🏕️', desc: '星空と焚き火を楽しむ自然体験' },
];

export const styleInfo = (id) => TRIP_STYLES.find((s) => s.id === id) ?? TRIP_STYLES[0];

/**
 * メインスポット候補マスター（ワンタップ候補・キーワード検索対象）
 */
export const MAIN_SPOTS = [
  {
    id: 'spot-hakone',
    name: '箱根湯本温泉',
    area: '神奈川県・箱根',
    lat: 35.2332,
    lng: 139.1038,
    style: 'onsen',
    tag: '温泉・食べ歩き',
    desc: '温泉街の風情と名物グルメが楽しめる箱根の玄関口。',
    climateMemo: '山間部のため夕方から急に冷え込みます。羽織りものを1枚。',
    highTemp: 18,
    lowTemp: 10,
    elevation: '標高約100m',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Hakone_Yumoto_Station_201605.jpg/1000px-Hakone_Yumoto_Station_201605.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'spot-kamikochi',
    name: '上高地・河童橋',
    area: '長野県・北アルプス',
    lat: 36.2489,
    lng: 137.6377,
    style: 'hiking',
    tag: '北アルプスの絶景',
    desc: '清流梓川と穂高連峰を望む日本屈指の山岳景勝地。',
    climateMemo: '標高約1,500mの高地。朝晩は冷え込みが厳しく防寒着が必須。',
    highTemp: 13,
    lowTemp: 3,
    elevation: '標高約1,500m',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Kappa-bashi_bridge_Kamikochi_02.JPG/1000px-Kappa-bashi_bridge_Kamikochi_02.JPG',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'spot-karuizawa',
    name: '軽井沢・旧軽銀座',
    area: '長野県・浅間山麓',
    lat: 36.3575,
    lng: 138.6358,
    style: 'drive',
    tag: '高原リゾート・散策',
    desc: '木漏れ日の美しい並木道と歴史あるベーカリーやカフェが点在。',
    climateMemo: '高原特有の爽やかさ。日陰は肌寒いため長袖やカーディガン推奨。',
    highTemp: 16,
    lowTemp: 6,
    elevation: '標高約1,000m',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Karuizawa-Ginza_01.JPG/1000px-Karuizawa-Ginza_01.JPG',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'spot-fuji',
    name: '富士五湖・河口湖大石公園',
    area: '山梨県・富士山麓',
    lat: 35.5228,
    lng: 138.7454,
    style: 'drive',
    tag: '富士山と湖のパノラマ',
    desc: 'ラベンダーやコキア越しに雄大な富士山を望む人気ビュースポット。',
    climateMemo: '湖畔の風が強く体感温度が下がります。ウインドブレーカーがあると快適。',
    highTemp: 17,
    lowTemp: 7,
    elevation: '標高約850m',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Lake_Kawaguchi_and_Mt_Fuji_from_Oishi_Park.jpg/1000px-Lake_Kawaguchi_and_Mt_Fuji_from_Oishi_Park.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'spot-nikko',
    name: '日光東照宮',
    area: '栃木県・日光',
    lat: 36.7580,
    lng: 139.5989,
    style: 'city',
    tag: '世界遺産・歴史探訪',
    desc: '豪華絢爛な陽明門や杉並木が厳かな歴史と四季を感じさせる名所。',
    climateMemo: '石段や砂利道が多いため履き慣れたスニーカー必須。山沿いの急な雨に折りたたみ傘を。',
    highTemp: 16,
    lowTemp: 8,
    elevation: '標高約630m',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Yomeimon_of_Nikko_Tosho-gu_Shrine.jpg/1000px-Yomeimon_of_Nikko_Tosho-gu_Shrine.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'spot-kyoto',
    name: '京都・嵐山渡月橋',
    area: '京都府・嵐山',
    lat: 35.0129,
    lng: 135.6777,
    style: 'city',
    tag: '風情ある竹林と川の景色',
    desc: '桂川にかかる木製欄干の橋。四季折々の山々と古都の風情が広がります。',
    climateMemo: '盆地気候のため昼夜の寒暖差があります。歩きやすい靴で街歩きを。',
    highTemp: 21,
    lowTemp: 12,
    elevation: '標高約35m',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Togetsukyo_Bridge_in_Kyoto.jpg/1000px-Togetsukyo_Bridge_in_Kyoto.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'spot-utsukushi',
    name: '美ヶ原高原・王ヶ頭',
    area: '長野県・八ヶ岳中信高原',
    lat: 36.2263,
    lng: 138.1158,
    style: 'hiking',
    tag: '標高2000mの大パノラマ',
    desc: '雲海と広大な牧草地が広がる雲上の天空スポット。',
    climateMemo: '標高2,000mの稜線は強風注意。フリース＋防風シェルを重ね着してください。',
    highTemp: 11,
    lowTemp: 2,
    elevation: '標高約2,034m',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Utsukushigahara_Plateau_201708.jpg/1000px-Utsukushigahara_Plateau_201708.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
];

/**
 * 寄り道スポットマスター（道の駅、カフェ、展望台、足湯など）
 * 自前の距離計算ロジックでメインスポットから半径5〜15km圏内を自動抽出する
 */
export const YORIMICHI_CANDIDATES = [
  // --- 箱根周辺 ---
  {
    id: 'yori-h1',
    name: '大涌谷・黒たまご館',
    category: '展望台',
    icon: '🌋',
    lat: 35.2427,
    lng: 139.0195,
    tag: '富士山展望＆名物',
    desc: '白煙上がる大涌谷で1つ食べると7年長生きすると言われる黒たまごを堪能。',
    defaultStay: 50,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/161223_Owakudani_Hakone_Japan09s3.jpg/960px-161223_Owakudani_Hakone_Japan09s3.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-h2',
    name: '箱根神社・平和の鳥居',
    category: '散策',
    icon: '⛩️',
    lat: 35.2047,
    lng: 139.0256,
    tag: '芦ノ湖畔のパワースポット',
    desc: '湖に浮かぶような朱色の鳥居が幻想的な名所。境内は巨木に囲まれています。',
    defaultStay: 45,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/Hakonejinja_-02.jpg/960px-Hakonejinja_-02.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-h3',
    name: 'Bakery & Table 東芦ノ湖',
    category: 'カフェ',
    icon: '☕',
    lat: 35.2023,
    lng: 139.0227,
    tag: '足湯テラス席あり',
    desc: '芦ノ湖を一望するテラスの足湯に浸かりながら焼きたてパンと珈琲を。',
    defaultStay: 60,
    imageUrl: null,
  },
  {
    id: 'yori-h4',
    name: '富士屋ホテル ベーカリーPICOT',
    category: 'グルメ',
    icon: '🥐',
    lat: 35.2415,
    lng: 139.0556,
    tag: '伝統のアップルパイ',
    desc: '明治創業の老舗ホテル直営。名物クラシックカレーパンが旅の軽食にぴったり。',
    defaultStay: 30,
    imageUrl: null,
  },
  {
    id: 'yori-h5',
    name: '箱根湯寮（日帰り温泉＆足湯）',
    category: '足湯',
    icon: '♨️',
    lat: 35.2365,
    lng: 139.0965,
    tag: '里山風情の湯処',
    desc: '箱根湯本駅からすぐの森に佇む古民家風の温泉。ドライブ帰りのひと休みに最適。',
    defaultStay: 60,
    imageUrl: null,
  },

  // --- 上高地周辺 ---
  {
    id: 'yori-k1',
    name: '大正池・立ち枯れの木',
    category: '散策',
    icon: '🌊',
    lat: 36.2305,
    lng: 137.6190,
    tag: '鏡のような湖面',
    desc: '早朝の靄と焼岳の映り込みが息を呑むほど美しい上高地のプロローグ。',
    defaultStay: 40,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/Taisho_Pond_2011-09.jpg/960px-Taisho_Pond_2011-09.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-k2',
    name: '明神池・嘉門次小屋',
    category: 'グルメ',
    icon: '🐟',
    lat: 36.2625,
    lng: 137.6622,
    tag: '囲炉裏の岩魚塩焼き',
    desc: '河童橋から歩いて約1時間。炭火でじっくり焼いた香ばしい岩魚が名物。',
    defaultStay: 50,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/150920_Myojin-ike_Kamikochi_Japan01n.jpg/960px-150920_Myojin-ike_Kamikochi_Japan01n.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-k3',
    name: '道の駅 風穴の里',
    category: '道の駅',
    icon: '🏡',
    lat: 36.1472,
    lng: 137.7410,
    tag: '信州手打ちそば＆特産品',
    desc: '天然の冷蔵庫「風穴」が見学できる道の駅。お土産やドライブ休憩に。',
    defaultStay: 45,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Fuketsu_no_sato.jpg/960px-Fuketsu_no_sato.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-k4',
    name: '平湯温泉 足湯カフェ',
    category: '足湯',
    icon: '♨️',
    lat: 36.1915,
    lng: 137.5552,
    tag: '奥飛騨の天然温泉',
    desc: '安房トンネルを抜けた奥飛騨のバスターミナル周辺で温かい足湯を楽しめます。',
    defaultStay: 35,
    imageUrl: null,
  },

  // --- 軽井沢周辺 ---
  {
    id: 'yori-ka1',
    name: 'ハルニレテラス・星野エリア',
    category: 'カフェ',
    icon: '☕',
    lat: 36.3533,
    lng: 138.5910,
    tag: '清流沿いのウッドデッキ',
    desc: '自生のハルニレの木立に囲まれた木製デッキに名店カフェやジェラート店が集まる。',
    defaultStay: 60,
    imageUrl: null,
  },
  {
    id: 'yori-ka2',
    name: '白糸の滝',
    category: '展望台',
    icon: '💧',
    lat: 36.4172,
    lng: 138.6015,
    tag: '幾筋もの清らかなカーテン',
    desc: '岩肌から湧き出る地下水が糸のように流れ落ちる癒しのマイナスイオンスポット。',
    defaultStay: 45,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/Karuizawa_shiraito-no-taki03s3200.jpg/960px-Karuizawa_shiraito-no-taki03s3200.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-ka3',
    name: 'ベーカリー＆レストラン 沢村',
    category: 'カフェ',
    icon: '🥖',
    lat: 36.3582,
    lng: 138.6322,
    tag: '天然酵母の焼きたてパン',
    desc: '旧軽井沢の緑に囲まれたテラスで芳醇なパンとスペシャリティコーヒーを。',
    defaultStay: 45,
    imageUrl: null,
  },
  {
    id: 'yori-ka4',
    name: '雲場池（スワンレイク）',
    category: '散策',
    icon: '🌿',
    lat: 36.3470,
    lng: 138.6255,
    tag: '水鏡の遊歩道',
    desc: '新緑や紅葉が池の水面に鮮やかに映り込む、静けさに包まれた散歩道。',
    defaultStay: 40,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/160729_Kumoba-ike_Karuizawa_Japan05s3.jpg/960px-160729_Kumoba-ike_Karuizawa_Japan05s3.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },

  // --- 富士五湖周辺 ---
  {
    id: 'yori-f1',
    name: '道の駅 かつやま',
    category: '道の駅',
    icon: '🏡',
    lat: 35.5050,
    lng: 138.7280,
    tag: '湖畔芝生広場',
    desc: '河口湖の南岸にあり、目の前に広がる湖畔公園で深呼吸できる道の駅。',
    defaultStay: 40,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Michinoeki_Katsuyama.JPG/960px-Michinoeki_Katsuyama.JPG',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-f2',
    name: '忍野八海（湧水池めぐり）',
    category: '散策',
    icon: '💧',
    lat: 35.4605,
    lng: 138.8327,
    tag: '富士の清冽な雪解け水',
    desc: '国指定の天然記念物。透明度抜群の池と茅葺き屋根の情緒ある風景。',
    defaultStay: 60,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/231028_Waku-ike_Oshino_Hakkai_springs_Oshino_Yamanashi_pref_Japan01s3.jpg/960px-231028_Waku-ike_Oshino_Hakkai_springs_Oshino_Yamanashi_pref_Japan01s3.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-f3',
    name: '新倉山浅間公園（五重塔と富士山）',
    category: '展望台',
    icon: '🗻',
    lat: 35.5015,
    lng: 138.8015,
    tag: '日本を象徴する絶景',
    desc: '五重塔「忠霊塔」と富士山が1枚に収まる、世界的に有名な展望台。',
    defaultStay: 50,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/Chuurei-tou_Fujiyoshida_17025277650_c59733d6ba_o.jpg/960px-Chuurei-tou_Fujiyoshida_17025277650_c59733d6ba_o.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-f4',
    name: 'ほうとう不動 東恋路店',
    category: 'グルメ',
    icon: '🍲',
    lat: 35.4950,
    lng: 138.7565,
    tag: '白い雲のような建築',
    desc: 'かぼちゃの甘みとコシのある太麺が身体を温める、山梨名物の熱々ほうとう。',
    defaultStay: 50,
    imageUrl: null,
  },

  // --- 日光周辺 ---
  {
    id: 'yori-n1',
    name: '華厳の滝・観瀑台',
    category: '展望台',
    icon: '🌊',
    lat: 36.7380,
    lng: 139.5020,
    tag: '日本三名瀑の大迫力',
    desc: '中禅寺湖の水が一気に97m落下する大瀑布。エレベーターで行く観瀑台が迫力満点。',
    defaultStay: 45,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Kegon_Taki.jpg/960px-Kegon_Taki.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-n2',
    name: '日光ぷりん亭',
    category: 'カフェ',
    icon: '🍮',
    lat: 36.7540,
    lng: 139.6050,
    tag: '古民家の特製プリン',
    desc: '日光霧降高原大笹牧場の牛乳を使用したとろけるプリンが食べ歩きに大人気。',
    defaultStay: 30,
    imageUrl: null,
  },
  {
    id: 'yori-n3',
    name: '中禅寺湖畔 イタリア大使館別荘記念公園',
    category: '散策',
    icon: '☕',
    lat: 36.7265,
    lng: 139.4930,
    tag: '杉皮張りのモダン別荘',
    desc: '歴代大使が愛した湖畔の避暑地。縁側のようなテラスから湖をのんびり眺められます。',
    defaultStay: 50,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/170825_Italian_Embassy_Villa_Memorial_Park03s3.jpg/960px-170825_Italian_Embassy_Villa_Memorial_Park03s3.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },

  // --- 京都嵐山周辺 ---
  {
    id: 'yori-ky1',
    name: '竹林の小径',
    category: '散策',
    icon: '🎋',
    lat: 35.0165,
    lng: 135.6710,
    tag: '緑のトンネルと笹の音',
    desc: '野宮神社から大河内山荘へ続く竹林。朝の澄んだ空気の中で歩くのが最高です。',
    defaultStay: 40,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/2021_Sagano_Bamboo_forest_in_Arashiyama%2C_Kyoto%2C_Japan.jpg/960px-2021_Sagano_Bamboo_forest_in_Arashiyama%2C_Kyoto%2C_Japan.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-ky2',
    name: '％ ARABICA Kyoto Arashiyama',
    category: 'カフェ',
    icon: '☕',
    lat: 35.0135,
    lng: 135.6765,
    tag: '渡月橋を望む人気ラテ',
    desc: '桂川のほとりに佇む真っ白なロースタリーカフェ。淹れたてラテ片手に川沿い散歩を。',
    defaultStay: 30,
    imageUrl: null,
  },
  {
    id: 'yori-ky3',
    name: '嵐電嵐山駅「駅の足湯」',
    category: '足湯',
    icon: '♨️',
    lat: 35.0152,
    lng: 135.6775,
    tag: 'ホーム内にある天然温泉',
    desc: '電車を眺めながら足湯に浸かれる名所。オリジナルタオル付きで手ぶらOK。',
    defaultStay: 30,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Arashiyama_Station.JPG/960px-Arashiyama_Station.JPG',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-ky4',
    name: '嵯峨野トロッコ列車 嵐山駅',
    category: '観光',
    icon: '🚂',
    lat: 35.0180,
    lng: 135.6695,
    tag: '保津川渓谷を走るレトロ列車',
    desc: '渓谷美を間近に感じられるクラシックな観光列車。オープン車両の風が心地よい。',
    defaultStay: 50,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Truck-Arashiyama-Station_01.jpg/960px-Truck-Arashiyama-Station_01.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },

  // --- 美ヶ原周辺 ---
  {
    id: 'yori-u1',
    name: '道の駅 美ヶ原高原美術館',
    category: '道の駅',
    icon: '🏡',
    lat: 36.2370,
    lng: 138.1400,
    tag: '日本最高所の道の駅',
    desc: '標高2,000mにある道の駅。信州の特産品や展望テラスからの大雲海が圧巻。',
    defaultStay: 45,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/250426_Utsukushi-ga-hara_Open-Air_Museum_Ueda_Nagano_pref_Japan13s3.jpg/960px-250426_Utsukushi-ga-hara_Open-Air_Museum_Ueda_Nagano_pref_Japan13s3.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-u2',
    name: '山本小屋ふるさと館（牧場カフェ）',
    category: 'カフェ',
    icon: '🥛',
    lat: 36.2290,
    lng: 138.1280,
    tag: '濃厚ソフトクリーム',
    desc: '高原トレッキングの拠点。ジャージー牛の搾りたて牛乳と高原ソフトが絶品。',
    defaultStay: 35,
    imageUrl: null,
  },
  {
    id: 'yori-u3',
    name: '扉峠 展望休憩所',
    category: '展望台',
    icon: '🚗',
    lat: 36.1950,
    lng: 138.1020,
    tag: 'ビーナスラインの峠道',
    desc: 'ワインディングロードの合間に広がるアルプスの眺望。愛車の撮影にも人気。',
    defaultStay: 25,
    imageUrl: null,
  },
  // --- 白馬周辺 ---
  {
    id: 'yori-hk1',
    name: '道の駅 白馬',
    category: '道の駅',
    icon: '🏡',
    lat: 36.6710,
    lng: 137.8540,
    tag: '北アルプス展望＆信州そば',
    desc: '白馬三山を望む絶景の道の駅。手打ちそばやおやき、地場野菜が揃います。',
    defaultStay: 45,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Michinoeki_hakuba.jpg/960px-Michinoeki_hakuba.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-hk2',
    name: '白馬ジャンプ競技場（展望エレベーター）',
    category: '展望台',
    icon: '⛷️',
    lat: 36.6970,
    lng: 137.8480,
    tag: '長野五輪の感動を体感',
    desc: 'ラージヒル・ノーマルヒルのスタートタワーへ登れる展望スポット。スリル満点。',
    defaultStay: 40,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Hakuba_Jumping_Stadium20250822f.jpg/960px-Hakuba_Jumping_Stadium20250822f.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-hk3',
    name: '白馬八方温泉 みみずくの湯（露天風呂）',
    category: '足湯',
    icon: '♨️',
    lat: 36.7020,
    lng: 137.8580,
    tag: '天然水素泉・美肌の湯',
    desc: '日本有数の強アルカリ天然温泉。白馬三山を眺めながらゆったり温まる名湯。',
    defaultStay: 60,
    imageUrl: null,
  },
  {
    id: 'yori-hk4',
    name: 'THE NORTH FACE GRAVITY HAKUBA カフェ',
    category: 'カフェ',
    icon: '☕',
    lat: 36.7000,
    lng: 137.8620,
    tag: '山小屋風アウトドアカフェ',
    desc: '大きな窓から北アルプスを望むカフェスペース。淹れたて珈琲でリラックス。',
    defaultStay: 35,
    imageUrl: null,
  },

  // --- 草津温泉周辺 ---
  {
    id: 'yori-ks1',
    name: '西の河原公園・大露天風呂',
    category: '散策',
    icon: '♨️',
    lat: 36.6210,
    lng: 138.5910,
    tag: '湯川が流れる大庭園',
    desc: 'あちこちから温泉が湧き出す幻想的な河原。圧倒的開放感の大露天風呂が隣接。',
    defaultStay: 50,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/%E8%8D%89%E6%B4%A5%E3%83%BB%E8%A5%BF%E3%81%AE%E6%B2%B3%E5%8E%9F%E5%85%AC%E5%9C%92_-_panoramio.jpg/960px-%E8%8D%89%E6%B4%A5%E3%83%BB%E8%A5%BF%E3%81%AE%E6%B2%B3%E5%8E%9F%E5%85%AC%E5%9C%92_-_panoramio.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-ks2',
    name: '道の駅 運動茶屋公園',
    category: '道の駅',
    icon: '🏡',
    lat: 36.6110,
    lng: 138.6040,
    tag: '草津温泉の玄関口',
    desc: 'ロマンチック街道沿いにあり、特産品ショップやつつじ園が美しい休憩スポット。',
    defaultStay: 40,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Michinoeki_kusatsu_undojaya_park.jpg/960px-Michinoeki_kusatsu_undojaya_park.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-ks3',
    name: '草津熱帯圏',
    category: '観光',
    icon: '🐒',
    lat: 36.6230,
    lng: 138.6010,
    tag: '地熱利用のドーム動植物園',
    desc: '温泉熱を利用した巨大ドーム。カピバラや可愛い動物たちとの触れ合いが人気。',
    defaultStay: 45,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Kusatsu_Nettaiken.JPG/960px-Kusatsu_Nettaiken.JPG',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },

  // --- 熱海・伊豆周辺 ---
  {
    id: 'yori-at1',
    name: '来宮神社（国指定天然記念物・大楠）',
    category: '散策',
    icon: '⛩️',
    lat: 35.1000,
    lng: 139.0660,
    tag: '樹齢2100年の御神木',
    desc: '本州随一の巨樹が息づくパワースポット。モダンな境内カフェも充実。',
    defaultStay: 45,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Kinomiya_Shrine_Haiden.jpg/960px-Kinomiya_Shrine_Haiden.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-at2',
    name: '道の駅 伊東マリンタウン',
    category: '道の駅',
    icon: '🏡',
    lat: 34.9810,
    lng: 139.0960,
    tag: '海沿い無料足湯＆海鮮',
    desc: 'カラフルな建物が並ぶ海沿いの道の駅。全長43mの海が見える無料足湯が最高。',
    defaultStay: 60,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/Michinoeki-Ito-Marinetown-1.JPG/960px-Michinoeki-Ito-Marinetown-1.JPG',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-at3',
    name: '熱海サンビーチ・親水公園',
    category: '散策',
    icon: '🌊',
    lat: 35.0940,
    lng: 139.0730,
    tag: '南国情緒漂うパームツリー',
    desc: '青い海と白い砂浜が広がる熱海のシンボル。夜は幻想的なライトアップも。',
    defaultStay: 35,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/be/%E7%86%B1%E6%B5%B701.JPG',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },

  // --- 金沢周辺 ---
  {
    id: 'yori-kz1',
    name: '近江町市場（金沢市民の台所）',
    category: 'グルメ',
    icon: '🐟',
    lat: 36.5720,
    lng: 136.6560,
    tag: '日本海の新鮮海鮮丼',
    desc: '鮮魚や加賀野菜がずらりと並ぶ活気ある市場。旬の海鮮丼や食べ歩きに最適。',
    defaultStay: 60,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Omicho-ichiba_%E8%BF%91%E6%B1%9F%E7%94%BA%E5%B8%82%E5%A0%B4_A091185.JPG/960px-Omicho-ichiba_%E8%BF%91%E6%B1%9F%E7%94%BA%E5%B8%82%E5%A0%B4_A091185.JPG',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-kz2',
    name: 'ひがし茶屋街',
    category: '散策',
    icon: '🏮',
    lat: 36.5720,
    lng: 136.6660,
    tag: '金箔ソフト＆出格子',
    desc: '江戸時代の風情を残す石畳の茶屋街。金箔ソフトや和カフェめぐりが大人気。',
    defaultStay: 50,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Higashiyamahigashi_2015.JPG/960px-Higashiyamahigashi_2015.JPG',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },

  // --- 富士吉田・富士急周辺 ---
  {
    id: 'yori-fy1',
    name: '道の駅 富士吉田',
    category: '道の駅',
    icon: '🏡',
    lat: 35.4670,
    lng: 138.8070,
    tag: '富士山天然水汲み場＆うどん',
    desc: '富士山の湧水が無料で汲める大人気道の駅。吉田のうどんも味わえます。',
    defaultStay: 45,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/Michinoeki_Fujiyoshida.JPG/960px-Michinoeki_Fujiyoshida.JPG',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
  {
    id: 'yori-fy2',
    name: '新倉山浅間公園（忠霊塔展望台）',
    category: '展望台',
    icon: '🗻',
    lat: 35.5015,
    lng: 138.8015,
    tag: '富士山と五重塔の絶景',
    desc: '世界中から旅行者が訪れるパノラマ名所。階段を上った先の景色は圧巻。',
    defaultStay: 50,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/Chuurei-tou_Fujiyoshida_17025277650_c59733d6ba_o.jpg/960px-Chuurei-tou_Fujiyoshida_17025277650_c59733d6ba_o.jpg',
    imageSource: 'Wikipedia (Wikimedia Commons)',
  },
];

/**
 * 指定のメインスポット（または緯度経度）から、半径 minKm 〜 maxKm 圏内の寄り道スポットを検索
 * 固定データで見つからない場合も、距離自動拡張 ＋ 周辺スマート生成により全国100%必ず提案する
 */
export function findNearbyYorimichi(lat, lng, minKm = 0.1, maxKm = 18.0, spotName = '') {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return [];
  }

  // 1. まず標準範囲（0.1km〜15km）で既存マスターから検索
  let hits = YORIMICHI_CANDIDATES.map((y) => {
    const dist = calcDistanceKm(lat, lng, y.lat, y.lng);
    return { ...y, distanceKm: dist };
  }).filter((y) => y.distanceKm >= minKm && y.distanceKm <= Math.min(maxKm, 15.0));

  hits.sort((a, b) => a.distanceKm - b.distanceKm);

  // 3. それでも2件未満の場合（固定リスト未登録の地域）：
  // メインスポットの近隣座標（数km〜十数km）に合わせたリアルな周辺寄り道をスマート補完！
  if (hits.length < 3) {
    const baseName = (spotName || '現地').replace(/(温泉|高原|山|湖|公園|神社|寺)$/, '');
    const dynamicTemplates = [
      {
        name: `道の駅 ${baseName}街道（地域特産）`,
        category: '道の駅',
        icon: '🏡',
        dLat: 0.035,
        dLng: 0.042,
        dist: 5.2,
        tag: '地元名産品＆ドライブ休憩',
        desc: `${baseName}周辺の旬の特産品や名物グルメが揃う人気の道の駅。`,
        imageUrl: null,
        defaultStay: 40,
      },
      {
        name: `${baseName}パノラマ展望テラス`,
        category: '展望台',
        icon: '⛰️',
        dLat: -0.028,
        dLng: 0.038,
        dist: 4.8,
        tag: '開放感あふれる絶景ポイント',
        desc: '周囲の大自然や山並みを一望できる展望デッキ。記念写真の撮影に最適。',
        imageUrl: null,
        defaultStay: 30,
      },
      {
        name: `森の焙煎所 ${baseName}カフェ`,
        category: 'カフェ',
        icon: '☕',
        dLat: 0.022,
        dLng: -0.025,
        dist: 3.6,
        tag: 'こだわりの自家焙煎珈琲',
        desc: '旅の合間にほっと一息つける隠れ家カフェ。手作りスイーツがおすすめ。',
        imageUrl: null,
        defaultStay: 45,
      },
      {
        name: `${baseName}郷の湯（日帰り足湯）`,
        category: '足湯',
        icon: '♨️',
        dLat: -0.032,
        dLng: -0.030,
        dist: 4.5,
        tag: '旅の疲れを癒やす湯処',
        desc: 'ドライブや散策の途中に立ち寄れる天然の足湯。気軽にリフレッシュ。',
        imageUrl: null,
        defaultStay: 35,
      },
    ];

    const needed = 3 - hits.length;
    for (let i = 0; i < needed && i < dynamicTemplates.length; i++) {
      const tmpl = dynamicTemplates[i];
      const genLat = Math.round((lat + tmpl.dLat) * 10000) / 10000;
      const genLng = Math.round((lng + tmpl.dLng) * 10000) / 10000;
      const realDist = calcDistanceKm(lat, lng, genLat, genLng);

      hits.push({
        id: `dyn-yori-${i}-${Math.round(lat * 100)}`,
        name: tmpl.name,
        category: tmpl.category,
        icon: tmpl.icon,
        lat: genLat,
        lng: genLng,
        imageUrl: tmpl.imageUrl,
        tag: tmpl.tag,
        desc: tmpl.desc,
        defaultStay: tmpl.defaultStay,
        distanceKm: realDist,
      });
    }

    hits.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return hits.slice(0, 4);
}

/**
 * カテゴリ定義
 */
export const GEAR_CATEGORIES = [
  { id: 'wear', label: 'ウェア・服装' },
  { id: 'gear', label: 'ギア・道具' },
  { id: 'daily', label: '日用品・小物' },
];

export const gearCategoryLabel = (id) =>
  GEAR_CATEGORIES.find((c) => c.id === id)?.label ?? '日用品・小物';

/**
 * アイテム辞書（手持ちとの照合用・エイリアス対応）
 */
export const ITEM_DICTIONARY = {
  // 基本・必需品
  スマホ充電器: { category: 'daily', aliases: ['充電器', 'スマホ充電ケーブル', '充電コード', '充電器一式'] },
  モバイルバッテリー: { category: 'daily', aliases: ['バッテリー', '充電器', 'ポータブル充電器'] },
  健康保険証: { category: 'daily', aliases: ['保険証', 'マイナンバーカード', '身分証明書'] },
  財布: { category: 'daily', aliases: ['小銭入れ', '現金', 'クレジットカード', 'サイフ'] },
  常備薬: { category: 'daily', aliases: ['胃腸薬', '絆創膏', '痛み止め', '頭痛薬', '目薬'] },
  着替え: { category: 'wear', aliases: ['着替えセット', '服', 'インナー', '下着', '靴下'] },
  洗面用具: { category: 'daily', aliases: ['スキンケア', '歯ブラシ', '化粧水', 'メイク落とし', '洗顔料'] },
  パジャマ: { category: 'wear', aliases: ['部屋着', '寝間着', 'スリープウェア', 'リラックスウェア'] },

  // 天候・季節・ウェア
  折りたたみ傘: { category: 'daily', aliases: ['傘', '雨具', '晴雨兼用傘', '日傘'] },
  薄手の羽織りもの: { category: 'wear', aliases: ['カーディガン', '羽織りもの', '薄手ジャケット', '長袖シャツ', 'シャツ'] },
  ウインドブレーカー: { category: 'wear', aliases: ['防風ジャケット', 'シェル', 'マウンテンパーカー'] },
  防寒シェル: { category: 'wear', aliases: ['シェル', 'ハードシェル', 'マウンテンパーカー', '防風ジャケット'] },
  フリース: { category: 'wear', aliases: ['厚手フリース', 'ボア'] },
  薄手ダウン: { category: 'wear', aliases: ['ライトダウン', 'インナーダウン'] },
  ダウンコート: { category: 'wear', aliases: ['ダウンジャケット', '厚手ダウン', 'コート'] },
  ヒートテック: { category: 'wear', aliases: ['保温インナー', '暖かインナー', '極暖'] },
  貼るカイロ: { category: 'daily', aliases: ['カイロ', '使い捨てカイロ', 'マグマ'] },
  手袋: { category: 'wear', aliases: ['グローブ', '手ぶくろ'] },
  マフラー: { category: 'wear', aliases: ['ストール', 'スヌード', 'ネックウォーマー'] },
  ニット帽: { category: 'wear', aliases: ['ビーニー', '毛糸の帽子'] },
  耳当て: { category: 'wear', aliases: ['イヤーマフ'] },

  // 夏・紫外線・熱中症対策
  日焼け止め: { category: 'daily', aliases: ['サンスクリーン', 'UVクリーム', '日焼けどめ'] },
  帽子: { category: 'wear', aliases: ['キャップ', 'ハット', 'サファリハット'] },
  サングラス: { category: 'daily', aliases: ['めがね', 'UVサングラス'] },
  ハンディファン: { category: 'daily', aliases: ['携帯扇風機', '手持ち扇風機', '扇子', 'うちわ'] },
  汗拭きシート: { category: 'daily', aliases: ['ボディシート', '制汗シート', 'クールシート'] },
  速乾Tシャツ: { category: 'wear', aliases: ['ドライTシャツ', '機能性インナー'] },

  // 保湿・ケア・衛生
  保湿ケア用品: { category: 'daily', aliases: ['リップクリーム', 'ハンドクリーム', '保湿クリーム', 'リップ'] },
  ウェットティッシュ: { category: 'daily', aliases: ['除菌シート', 'アルコールシート', 'おてふき'] },
  虫よけスプレー: { category: 'daily', aliases: ['虫除け', 'ハッカ油'] },

  // 乗り物・スポット・スタイル
  スニーカー: { category: 'wear', aliases: ['運動靴', 'ウォーキングシューズ', '歩きやすい靴'] },
  トレッキングシューズ: { category: 'wear', aliases: ['登山靴', 'トレッキング靴', 'ハイキングシューズ'] },
  サンダル: { category: 'wear', aliases: ['ビーチサンダル', 'スポーツサンダル', 'つっかけ'] },
  温泉タオル: { category: 'daily', aliases: ['フェイスタオル', '手ぬぐい', 'タオル', 'バスタオル'] },
  着替え用ビニール袋: { category: 'daily', aliases: ['ビニール袋', 'ランドリーバッグ', 'ジップロック'] },
  小銭入れ: { category: 'daily', aliases: ['小銭', 'コインケース', 'お賽銭入れ'] },
  御朱印帳: { category: 'daily', aliases: ['ご朱印帳', '納経帳'] },
  防水スマホケース: { category: 'gear', aliases: ['防水ケース', '防水ポーチ', 'スマホ防水'] },
  ETCカード: { category: 'gear', aliases: ['ETC', 'etcカード'] },
  運転免許証: { category: 'daily', aliases: ['免許証', '免許'] },
  車載スマホホルダー: { category: 'gear', aliases: ['スマホホルダー', '車載ホルダー'] },
  酔い止め薬: { category: 'daily', aliases: ['トラベルミン', 'アネロン', '酔い止め'] },
  エコバッグ: { category: 'daily', aliases: ['買い物袋', 'マイバッグ', 'サブバッグ'] },
  水筒: { category: 'gear', aliases: ['ボトル', 'マイボトル', 'タンブラー'] },
  自撮り棒・三脚: { category: 'gear', aliases: ['自撮り棒', 'セルカ棒', '三脚', 'スタンド'] },
  ポータブルクッション: { category: 'gear', aliases: ['クッション', '座布団', '折りたたみ座布団'] },
};

/**
 * 旅先の日程・スポット・スタイルから気候・天候イメージ・推奨バッグを診断
 * 複数泊（連泊）の日程シミュレーションにも対応
 */
export function diagnoseTripWeatherAndBag(trip) {
  const dateStr = trip?.date || '2026-10-18';
  let month = 10;
  let startYear = 2026;
  let startDay = 18;

  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      startYear = parseInt(parts[0], 10) || 2026;
      month = parseInt(parts[1], 10) || 10;
      startDay = parseInt(parts[2], 10) || 18;
    } else if (parts.length >= 2) {
      month = parseInt(parts[1], 10) || 10;
    }
  }

  // 泊数・日数（未設定時はデフォルト2日=1泊2日）
  const stayDays = Math.max(1, Math.min(7, parseInt(trip?.stayDays, 10) || 2));
  const stayLabel =
    stayDays === 1
      ? '日帰り'
      : stayDays === 2
      ? '1泊2日'
      : stayDays === 3
      ? '2泊3日'
      : stayDays === 4
      ? '3泊4日'
      : `${stayDays - 1}泊${stayDays}日`;

  // 1. 季節判定
  let season = 'autumn';
  let seasonLabel = '秋（行楽・紅葉）';
  let seasonIcon = '🍂';
  let photoUrl = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'; // 爽やかな秋空と山

  if (month >= 3 && month <= 5) {
    season = 'spring';
    seasonLabel = '春（桜・新緑）';
    seasonIcon = '🌸';
    photoUrl = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80';
  } else if (month >= 6 && month <= 8) {
    season = 'summer';
    seasonLabel = '夏（初夏・青空）';
    seasonIcon = '☀️';
    photoUrl = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
  } else if (month === 12 || month <= 2) {
    season = 'winter';
    seasonLabel = '冬（澄んだ冬空）';
    seasonIcon = '❄️';
    photoUrl = 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=1200&q=80';
  }

  // 2. 旅程全体の全スポットを総合スキャン（メイン固定概念を完全撤廃！）
  const itinerary = trip?.itinerary || [];

  const isMountainText = (t) => /山|岳|高原|美ヶ原|白馬|富士|アルプス|標高|ハイキング|トレッキング|登山/.test(t);
  const isOnsenText = (t) => /温泉|湯|露天|足湯|サウナ|スパ/.test(t);
  const isBeachText = (t) => /海|浜|ビーチ|島|江の島|湘南|海岸|川|ラフティング|カヤック|シュノーケル|プール/.test(t);
  const isShrineText = (t) => /神社|寺|大社|神宮|城|参拝|大仏|観音/.test(t);

  // 全日程の中から特定ジャンルに当てはまるスポットを漏れなく抽出
  const mountainSpots = itinerary.filter((s) => isMountainText(`${s.name} ${s.category || ''} ${s.memo || ''}`));
  const onsenSpots = itinerary.filter((s) => isOnsenText(`${s.name} ${s.category || ''} ${s.memo || ''}`) || trip?.style === 'onsen');
  const beachSpots = itinerary.filter((s) => isBeachText(`${s.name} ${s.category || ''} ${s.memo || ''}`));
  const shrineSpots = itinerary.filter((s) => isShrineText(`${s.name} ${s.category || ''} ${s.memo || ''}`));

  // 3. 気温推定の基準（月別平均）
  const monthlyTemp = [
    { high: 10, low: 2 },  // 1月
    { high: 11, low: 3 },  // 2月
    { high: 14, low: 5 },  // 3月
    { high: 19, low: 10 }, // 4月
    { high: 23, low: 15 }, // 5月
    { high: 26, low: 19 }, // 6月
    { high: 30, low: 23 }, // 7月
    { high: 32, low: 25 }, // 8月
    { high: 27, low: 20 }, // 9月
    { high: 22, low: 14 }, // 10月
    { high: 16, low: 8 },  // 11月
    { high: 12, low: 4 },  // 12月
  ];
  const baseTemp = monthlyTemp[month - 1] || { high: 20, low: 12 };

  // 4. 連泊・日別ごとの滞在エリア特定＆天気シミュレーション
  const weatherIcons = ['☀️', '⛅', '🌤️', '🌧️'];
  const weatherNames = ['晴れ', '曇りのち晴れ', '穏やかな晴れ', '一時雨'];
  const dailyForecasts = [];

  const baseDateObj = new Date(startYear, month - 1, startDay);
  const weekDaysJp = ['日', '月', '火', '水', '木', '金', '土'];

  for (let d = 0; d < stayDays; d++) {
    const dayNumber = d + 1;
    const curDate = new Date(baseDateObj);
    curDate.setDate(baseDateObj.getDate() + d);
    const mStr = curDate.getMonth() + 1;
    const dStr = curDate.getDate();
    const dayName = weekDaysJp[curDate.getDay()];

    // その日（dayNumber）のスポット一覧
    const daySpots = itinerary.filter((s) => (s.day || 1) === dayNumber);

    // その日の代表エリア名の決定
    let areaName = '';
    if (daySpots.length > 0) {
      const first = daySpots[0];
      const cleanName = (first.name || 'スポット').replace(/（.*?）|\(.*?\)/g, '').trim();
      areaName = daySpots.length === 1 ? cleanName : `${cleanName} 周辺`;
    } else {
      areaName = trip?.title ? `${trip.title}` : `${dayNumber}日目の滞在地`;
    }

    // その日のスポットに高原や山岳・海・温泉があるか
    const isDayHighland = daySpots.some((s) => isMountainText(`${s.name} ${s.category || ''} ${s.memo || ''}`));
    const isDayBeach = daySpots.some((s) => isBeachText(`${s.name} ${s.category || ''} ${s.memo || ''}`));
    const isDayOnsen = daySpots.some((s) => isOnsenText(`${s.name} ${s.category || ''} ${s.memo || ''}`));

    // その日の基準気温（標高補正）
    let dayBaseHigh = baseTemp.high;
    let dayBaseLow = baseTemp.low;
    if (isDayHighland) {
      dayBaseHigh = Math.max(0, dayBaseHigh - 5);
      dayBaseLow = Math.max(-8, dayBaseLow - 6);
    }

    // 日ごとの自然な揺らぎ（±1〜2℃）
    const tempVariance = ((d * 3 + month) % 5) - 2;
    const dayHigh = dayBaseHigh + tempVariance;
    const dayLow = dayBaseLow + Math.floor(tempVariance / 2);

    // 天候パターンのシミュレーション
    const weatherIndex = (d + month) % 4;
    const wIcon = weatherIcons[weatherIndex];
    const wName = weatherNames[weatherIndex];
    const rainProb = weatherIndex === 3 ? 60 : weatherIndex === 1 ? 20 : 10;

    // その日の服装・気候アドバイス
    let dayAdvice = '';
    if (isDayHighland) {
      dayAdvice = `標高の高い山岳・高原エリアです。街中より冷え込むため（最低${dayLow}℃）、風を通さない上着が必須です。`;
    } else if (rainProb >= 40) {
      dayAdvice = `雨の予報があります（降水確率${rainProb}%）。折りたたみ傘や撥水のアウター・靴をご準備ください。`;
    } else if (dayHigh - dayLow >= 9) {
      dayAdvice = `寒暖差が約${dayHigh - dayLow}℃あります（最高${dayHigh}℃ / 最低${dayLow}℃）。脱ぎ着しやすい羽織りものが便利です。`;
    } else if (season === 'summer') {
      dayAdvice = `日中は${dayHigh}℃まで上がります。紫外線対策と水分補給を心がけてください。`;
    } else if (season === 'winter') {
      dayAdvice = `朝晩は${dayLow}℃まで底冷えします。しっかり防寒してお出かけください。`;
    } else {
      dayAdvice = `過ごしやすい気候の予報です。観光や散策を快適に楽しめます。`;
    }

    dailyForecasts.push({
      dayNumber,
      dateLabel: `${mStr}/${dStr} (${dayName})`,
      areaName,
      spotsCount: daySpots.length,
      spots: daySpots,
      weather: wName,
      icon: wIcon,
      high: dayHigh,
      low: dayLow,
      tempDiff: dayHigh - dayLow,
      rainProb,
      isHighland: isDayHighland,
      isBeach: isDayBeach,
      isOnsen: isDayOnsen,
      advice: dayAdvice,
    });
  }

  // 5. 旅全体の気候レンジとワースト条件（荷物準備に必須！）
  const overallHigh = Math.max(...dailyForecasts.map((f) => f.high));
  const overallLow = Math.min(...dailyForecasts.map((f) => f.low));
  const tempDiff = overallHigh - overallLow;
  const hasRainForecast = dailyForecasts.some((f) => f.rainProb >= 40);

  // 最も寒い日
  const coldestDay = [...dailyForecasts].sort((a, b) => a.low - b.low)[0];
  // 最も暑い日
  const hottestDay = [...dailyForecasts].sort((a, b) => b.high - a.high)[0];
  // 雨予報の日リスト
  const rainyDays = dailyForecasts.filter((f) => f.rainProb >= 40);

  // 総合天気テキストとアドバイス
  let weatherText = `${stayLabel}の予報: 晴れベース`;
  let adviceText = '';

  if (mountainSpots.length > 0) {
    weatherText = `山岳・高原エリアを含む旅程（最低 ${overallLow}℃）`;
    adviceText = `「${coldestDay?.areaName}」など冷え込むスポットがあります。風を通さない防寒着を必ずご用意ください。`;
    photoUrl = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80';
  } else if (hasRainForecast) {
    weatherText = `期間中に雨の予報あり（${rainyDays.map((r) => `${r.dayNumber}日目`).join('・')}）`;
    adviceText = `雨が降るエリアがあります。折りたたみ傘や防水の羽織りものを必ずご用意ください。`;
  } else if (tempDiff >= 9) {
    weatherText = `寒暖差 ${tempDiff}℃ に注意（最高${overallHigh}℃ / 最低${overallLow}℃）`;
    adviceText = `朝晩と日中の気温差が大きいため、簡単に脱ぎ着できる上着が重宝します。`;
  } else if (season === 'summer') {
    weatherText = `最高 ${overallHigh}℃ の夏の陽気`;
    adviceText = `紫外線対策（日焼け止め・帽子）とこまめな水分補給をお忘れなく。`;
  } else if (season === 'winter') {
    weatherText = `最低 ${overallLow}℃ の冬晴れ・底冷え`;
    adviceText = `朝晩は冷え込みます。保温インナーやカイロなど万全の防寒対策を。`;
  } else {
    weatherText = `穏やかで過ごしやすい気候（${overallLow}℃〜${overallHigh}℃）`;
    adviceText = `行楽日和の予報です。急な気温変化に備えて薄手の上着があると安心です。`;
  }

  // 6. 推奨バッグの判定（泊数・スタイル）
  const isDrive = trip?.style === 'drive';

  let bagInfo = {
    type: 'ボストンバッグ または 機内持ち込みキャリー',
    capacity: '約 25〜30 L',
    icon: '🧳',
    advice: '1泊分の着替え＋お土産がすっぽり入る標準サイズ。',
  };

  if (stayDays === 1) {
    bagInfo = {
      type: 'デイパック / リュック',
      capacity: '約 15〜20 L',
      icon: '🎒',
      advice: '日帰り旅に最適。身軽に両手が空くリュックとお土産用エコバッグが便利です。',
    };
  } else if (stayDays === 2) {
    if (isDrive) {
      bagInfo = {
        type: 'ボストンバッグ / トート',
        capacity: '約 25〜30 L',
        icon: '👜',
        advice: '車のトランクや後部座席に積み下ろししやすい柔らかいバッグが快適です。',
      };
    } else {
      bagInfo = {
        type: 'ボストンバッグ または 小型キャリー',
        capacity: '約 25〜30 L',
        icon: '🧳',
        advice: '1泊分の着替え＋お土産が入る標準サイズ。移動が多いならキャリーもおすすめ。',
      };
    }
  } else if (stayDays === 3) {
    bagInfo = {
      type: '機内持ち込みキャリー または 大容量ボストン',
      capacity: '約 35〜40 L',
      icon: '🧳',
      advice: '2泊分の着替えやお土産スペースも確保できる定番サイズ。キャスター付きが疲れにくいです。',
    };
  } else {
    bagInfo = {
      type: '中型キャリーケース',
      capacity: '約 45〜60 L',
      icon: '🧳',
      advice: '3泊以上の着替えが余裕で収まるサイズ。お土産や予備の靴も収納できます。',
    };
  }

  // 表示用エリア名サマリー
  const displaySpotName =
    itinerary.length > 0
      ? dailyForecasts.map((d) => d.areaName).filter(Boolean).slice(0, 2).join('・')
      : trip?.title || '旅の目的地';

  return {
    season,
    seasonLabel,
    seasonIcon,
    photoUrl,
    highTemp: overallHigh,
    lowTemp: overallLow,
    tempDiff,
    weatherText,
    adviceText,
    bagInfo,
    isHighland: mountainSpots.length > 0,
    isOnsen: onsenSpots.length > 0,
    isBeach: beachSpots.length > 0,
    mountainSpots,
    onsenSpots,
    beachSpots,
    shrineSpots,
    month,
    stayDays,
    stayLabel,
    dailyForecasts,
    hasRainForecast,
    coldestDay,
    hottestDay,
    rainyDays,
    displaySpotName,
    hasSpots: itinerary.length > 0,
  };
}

/**
 * 目的地・季節・スタイルに応じたフル持ち物リスト（必須 ＆ あると安心）を自動生成
 */
export function generateFullPackingList(trip) {
  const diag = diagnoseTripWeatherAndBag(trip);
  const items = [];

  const addItem = ({ name, priority, reason, reasonTag }) => {
    if (!items.some((i) => i.name === name)) {
      items.push({
        id: `pack-${items.length + 1}-${name}`,
        name,
        priority, // 'must' (必須) または 'nice' (あると安心)
        reason,
        reasonTag,
        category: ITEM_DICTIONARY[name]?.category ?? 'daily',
      });
    }
  };

  // ==========================================
  // 1. 🔥 必須アイテム（忘れると旅行が困るもの）
  // ==========================================

  // 基本必需品
  addItem({
    name: 'スマートフォン充電器',
    priority: 'must',
    reason: '写真撮影やナビ・調べもので電池消耗',
    reasonTag: '必須・基本',
  });
  addItem({
    name: 'モバイルバッテリー',
    priority: 'must',
    reason: '外出先でのバッテリー切れを確実に防止',
    reasonTag: '必須・基本',
  });
  addItem({
    name: '健康保険証',
    priority: 'must',
    reason: '旅先での急な体調不良やケガへの備え',
    reasonTag: '必須・基本',
  });
  addItem({
    name: '財布',
    priority: 'must',
    reason: '現地での現金決済（コインパーキング・自販機・寺社）',
    reasonTag: '必須・基本',
  });
  addItem({
    name: '常備薬',
    priority: 'must',
    reason: '飲み慣れた胃腸薬・痛み止め・絆創膏',
    reasonTag: '必須・基本',
  });

  // ドライブ連動の必須
  if (trip?.style === 'drive') {
    addItem({
      name: '運転免許証',
      priority: 'must',
      reason: 'レンタカー・マイカー運転の必須携行品',
      reasonTag: 'ドライブ必須',
    });
    addItem({
      name: 'ETCカード',
      priority: 'must',
      reason: '高速道路のスムーズな料金所通過に',
      reasonTag: 'ドライブ必須',
    });
  }

  // 宿泊・日数連動の必須
  const clothingReason =
    diag.stayDays === 1
      ? '予備のインナー・靴下（日帰り用）'
      : `インナー・下着・着替え（${diag.stayLabel}分）`;
  addItem({
    name: '着替え',
    priority: 'must',
    reason: clothingReason,
    reasonTag: diag.stayLabel,
  });

  // 天候・雨対策
  const umbrellaReason = diag.hasRainForecast
    ? `期間中に雨予報（${diag.rainyDays.map((r) => `${r.dayNumber}日目`).join('・')}）あり。濡れ対策に必須`
    : '旅先での急な天候変化や夕立に備えて';
  addItem({
    name: '折りたたみ傘',
    priority: 'must',
    reason: umbrellaReason,
    reasonTag: '天候・雨対策',
  });

  // ⛰️ 山岳・ハイキングスポットが含まれる場合の必須（全スポット総合判定！）
  if (diag.mountainSpots.length > 0) {
    const targetSpot = diag.mountainSpots[0];
    addItem({
      name: 'トレッキングシューズ',
      priority: 'must',
      reason: `「${targetSpot.name}」などの山岳・ハイキング散策で足を保護・滑り止め`,
      reasonTag: '登山・ハイキング',
    });
    addItem({
      name: 'ウインドブレーカー',
      priority: 'must',
      reason: `「${targetSpot.name}」などの山間部での急な冷え込み・強風を遮断`,
      reasonTag: '山岳・防風',
    });
  }

  // 寒冷地・冬・高山での必須防寒
  if (diag.lowTemp <= 8 || diag.season === 'winter' || diag.isHighland) {
    const coldSpotName = diag.coldestDay?.areaName || '現地';
    addItem({
      name: '防寒シェル',
      priority: 'must',
      reason: `${coldSpotName}（最低${diag.lowTemp}℃）の冷え込み・強風を遮る`,
      reasonTag: '寒冷地防寒',
    });
    addItem({
      name: 'ヒートテック',
      priority: 'must',
      reason: '朝晩や屋外散策での底冷えを防止',
      reasonTag: '保温インナー',
    });
  }

  // ==========================================
  // 2. ✨ あると安心・快適（余裕があれば持っていく）
  // ==========================================

  // 季節・気温連動の快適アイテム
  if (diag.tempDiff >= 8 || diag.season === 'autumn' || diag.season === 'spring') {
    addItem({
      name: '薄手の羽織りもの',
      priority: 'nice',
      reason: `朝晩の寒暖差${diag.tempDiff}℃対策。脱ぎ着しやすい1枚`,
      reasonTag: `${diag.seasonLabel}対策`,
    });
  }

  if (diag.season === 'autumn' || diag.season === 'winter') {
    addItem({
      name: '保湿ケア用品',
      priority: 'nice',
      reason: '屋外散策や乾燥する車内・ホテルでの肌ケア',
      reasonTag: '乾燥対策',
    });
    addItem({
      name: '貼るカイロ',
      priority: 'nice',
      reason: '朝夕の屋外待機や散策で大活躍',
      reasonTag: 'ぽかぽか防寒',
    });
    if (diag.lowTemp <= 10) {
      addItem({
        name: 'マフラー',
        priority: 'nice',
        reason: '首元の冷たい風を防いで体感温度アップ',
        reasonTag: '防寒小物',
      });
      addItem({
        name: '手袋',
        priority: 'nice',
        reason: '写真撮影や散策中の指先の冷え対策',
        reasonTag: '防寒小物',
      });
    }
  }

  if (diag.season === 'summer' || diag.highTemp >= 25) {
    addItem({
      name: '日焼け止め',
      priority: 'nice',
      reason: '強い直射日光・日焼け対策',
      reasonTag: 'UVケア',
    });
    addItem({
      name: '帽子',
      priority: 'nice',
      reason: '熱中症予防と直射日光ガード',
      reasonTag: '暑さ対策',
    });
    addItem({
      name: 'サングラス',
      priority: 'nice',
      reason: '強い日差しやまぶしい照り返しを軽減',
      reasonTag: 'アイケア',
    });
    addItem({
      name: 'ハンディファン',
      priority: 'nice',
      reason: '散策中や待ち時間の熱中症予防・クールダウン',
      reasonTag: '暑さ対策',
    });
    addItem({
      name: '汗拭きシート',
      priority: 'nice',
      reason: '汗をかいたあとのリフレッシュに',
      reasonTag: '爽快エチケット',
    });
  }

  // ⛩️ 寺社・神社スポット連動（全スポット総合スキャン！）
  if (diag.shrineSpots.length > 0) {
    const shrine = diag.shrineSpots[0];
    addItem({
      name: '小銭入れ',
      priority: 'nice',
      reason: `「${shrine.name}」での参拝・お賽銭や拝観料のスムーズな支払いに`,
      reasonTag: '寺社・参拝',
    });
    addItem({
      name: '御朱印帳',
      priority: 'nice',
      reason: `「${shrine.name}」などでの参拝記念や御朱印集めに`,
      reasonTag: '寺社巡り',
    });
  }

  // ♨️ 温泉・足湯スポット連動（全スポット総合スキャン！）
  if (diag.isOnsen) {
    const onsen = diag.onsenSpots[0];
    const onsenName = onsen ? `「${onsen.name}」などの` : '';
    addItem({
      name: '温泉タオル',
      priority: 'nice',
      reason: `${onsenName}足湯や立ち寄り湯で手軽に使える`,
      reasonTag: '温泉・足湯',
    });
    addItem({
      name: '着替え用ビニール袋',
      priority: 'nice',
      reason: '濡れたタオルや着替えをスマートに収納',
      reasonTag: '温泉・スパ',
    });
  }

  // 🌊 海・川・ビーチスポット連動（全スポット総合スキャン！）
  if (diag.isBeach) {
    const beach = diag.beachSpots[0];
    const beachName = beach ? `「${beach.name}」などの` : '';
    addItem({
      name: 'サンダル',
      priority: 'nice',
      reason: `${beachName}水辺やビーチでの足元の水濡れ対策`,
      reasonTag: '水辺・ビーチ',
    });
    addItem({
      name: '防水スマホケース',
      priority: 'nice',
      reason: `${beachName}水辺・アクティビティでのスマホ水濡れ防止`,
      reasonTag: '水濡れ防止',
    });
  }

  if (trip?.style === 'drive') {
    addItem({
      name: '車載スマホホルダー',
      priority: 'nice',
      reason: 'Googleマップナビの見やすい固定に',
      reasonTag: 'ドライブ快適',
    });
    addItem({
      name: '酔い止め薬',
      priority: 'nice',
      reason: 'ワインディングロードや峠道での車酔い対策',
      reasonTag: 'ドライブ安心',
    });
  }

  // 散策・定番便利グッズ
  addItem({
    name: 'スニーカー',
    priority: 'nice',
    reason: '石畳や観光地の階段でも足が疲れにくい靴',
    reasonTag: '散策快適',
  });
  addItem({
    name: 'ウェットティッシュ',
    priority: 'nice',
    reason: '食べ歩きやドライブ中の手拭きに便利',
    reasonTag: '清潔エチケット',
  });
  addItem({
    name: 'エコバッグ',
    priority: 'nice',
    reason: '旅先で買ったお土産やご当地グルメの持ち歩きに',
    reasonTag: 'お土産用',
  });
  addItem({
    name: '洗面用具',
    priority: 'nice',
    reason: 'お気に入りの歯ブラシやスキンケア用品',
    reasonTag: '宿泊リラックス',
  });

  return items;
}

/**
 * 互換用：目的地・スタイルに応じた推奨アイテム生成
 */
export function generateRecommendedItems(spotInfo, styleId) {
  const dummyTrip = {
    title: spotInfo?.name || '旅行',
    mainSpot: spotInfo?.name,
    style: styleId,
    itinerary: spotInfo ? [spotInfo] : [],
  };
  return generateFullPackingList(dummyTrip);
}

/**
 * 手持ちアイテム（マイアイテム）との照合判定
 */
const normStr = (s) => (s ?? '').replace(/[\s　]/g, '').toLowerCase();

export function isOwnedItem(itemName, myItems) {
  const target = normStr(itemName);
  const aliases = (ITEM_DICTIONARY[itemName]?.aliases ?? []).map(normStr);

  return myItems.some((m) => {
    if (!m.owned) return false;
    const n = normStr(m.name);
    if (!n) return false;
    return (
      n === target ||
      n.includes(target) ||
      target.includes(n) ||
      aliases.some((a) => n === a || n.includes(a) || a.includes(n))
    );
  });
}

/**
 * 初期マイアイテム（ユーザーの手持ちアイテム）
 */
export const INITIAL_MY_ITEMS = [
  { id: 'i-1', name: 'スニーカー', category: 'wear', owned: true },
  { id: 'i-2', name: 'スマートフォン充電器', category: 'daily', owned: true },
  { id: 'i-3', name: 'モバイルバッテリー', category: 'daily', owned: true },
  { id: 'i-4', name: '健康保険証', category: 'daily', owned: true },
  { id: 'i-5', name: '財布', category: 'daily', owned: true },
  { id: 'i-6', name: '折りたたみ傘', category: 'daily', owned: true },
  { id: 'i-7', name: '防寒シェル', category: 'wear', owned: true },
  { id: 'i-8', name: '温泉タオル', category: 'daily', owned: true },
  { id: 'i-9', name: '薄手の羽織りもの', category: 'wear', owned: true },
  { id: 'i-10', name: '常備薬', category: 'daily', owned: true },
];

/**
 * 初期プリセット旅行データ（最大5件まで管理可能、最初は2件作成済み）
 */
export const INITIAL_TRIPS = [
  {
    id: 'trip-hakone',
    title: '秋の箱根ドライブ＆温泉',
    date: '2026-10-18',
    mainSpot: '箱根湯本温泉',
    style: 'onsen',
    memo: '紅葉の山並みと芦ノ湖の絶景を巡る日帰りドライブ旅 ♨️',
    itinerary: [
      {
        id: 'spot-h-1',
        name: '箱根湯本温泉',
        category: '観光名所',
        icon: '♨️',
        lat: 35.2332,
        lng: 139.1038,
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Hakone_Yumoto_Station_201605.jpg/1000px-Hakone_Yumoto_Station_201605.jpg',
        imageSource: 'Wikipedia',
        time: '10:00',
        stayMin: 60,
        memo: '駅前商店街で湯もち＆温泉まんじゅうを食べ歩き',
      },
      {
        id: 'spot-h-2',
        name: '箱根神社・平和の鳥居',
        category: '散策',
        icon: '⛩️',
        lat: 35.2047,
        lng: 139.0256,
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hakone-jinja_Heiwa_no_Torii.jpg/1000px-Hakone-jinja_Heiwa_no_Torii.jpg',
        imageSource: 'Wikipedia',
        time: '11:30',
        stayMin: 45,
        memo: '芦ノ湖畔の朱色の鳥居で旅の記念写真',
      },
      {
        id: 'spot-h-3',
        name: 'Bakery & Table 東芦ノ湖',
        category: 'カフェ',
        icon: '☕',
        lat: 35.2023,
        lng: 139.0227,
        imageUrl: null, // 水彩フォールバックで可愛く表示
        time: '12:30',
        stayMin: 60,
        memo: '足湯に浸かりながら美味しいパンと珈琲ランチ',
      },
      {
        id: 'spot-h-4',
        name: '大涌谷・黒たまご館',
        category: '展望台',
        icon: '🌋',
        lat: 35.2427,
        lng: 139.0195,
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Owakudani_Hakone_Japan01s5.jpg/1000px-Owakudani_Hakone_Japan01s5.jpg',
        imageSource: 'Wikipedia',
        time: '14:00',
        stayMin: 60,
        memo: '硫黄の煙と黒たまごで寿命延伸！富士山も綺麗',
      },
    ],
    checkedPacking: {
      'スニーカー': true,
      'モバイルバッテリー': true,
      '温泉タオル': true,
    },
  },
  {
    id: 'trip-kyoto',
    title: '京都・嵐山と竹林の小径',
    date: '2026-11-03',
    mainSpot: '京都・嵐山渡月橋',
    style: 'city',
    memo: '竹林の清々しい風と川沿いのカフェをのんびり楽しむ休日 🏮',
    itinerary: [
      {
        id: 'spot-k-1',
        name: '京都・嵐山渡月橋',
        category: '観光名所',
        icon: '🏮',
        lat: 35.0129,
        lng: 135.6777,
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Togetsukyo_Bridge_in_Kyoto.jpg/1000px-Togetsukyo_Bridge_in_Kyoto.jpg',
        imageSource: 'Wikipedia',
        time: '09:30',
        stayMin: 50,
        memo: '朝の静かな渡月橋で山々の景色を眺める',
      },
      {
        id: 'spot-k-2',
        name: '竹林の小径',
        category: '散策',
        icon: '🎋',
        lat: 35.0165,
        lng: 135.6710,
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Bamboo_Forest_%28Arashiyama%29.jpg/1000px-Bamboo_Forest_%28Arashiyama%29.jpg',
        imageSource: 'Wikipedia',
        time: '10:30',
        stayMin: 40,
        memo: '緑の竹林トンネルを深呼吸しながらお散歩',
      },
      {
        id: 'spot-k-3',
        name: '％ ARABICA Kyoto Arashiyama',
        category: 'カフェ',
        icon: '☕',
        lat: 35.0135,
        lng: 135.6765,
        imageUrl: null, // カフェ水彩フォールバック
        time: '11:30',
        stayMin: 35,
        memo: '桂川を眺めながらカフェラテテイクアウト',
      },
      {
        id: 'spot-k-4',
        name: '嵐電嵐山駅「駅の足湯」',
        category: '足湯',
        icon: '♨️',
        lat: 35.0152,
        lng: 135.6775,
        imageUrl: null, // 温泉足湯水彩フォールバック
        time: '12:30',
        stayMin: 30,
        memo: '電車を見ながら足湯で歩き疲れをリセット',
      },
    ],
    checkedPacking: {
      'スニーカー': true,
      'モバイルバッテリー': true,
      '折りたたみ傘': true,
    },
  },
];

/**
 * わりかん初期メンバー＆立替データ（単体でも即利用可能）
 */
export const INITIAL_WARIKAN_MEMBERS = [
  { id: 'wm-1', name: 'ひろ' },
  { id: 'wm-2', name: 'さき' },
  { id: 'wm-3', name: 'けんた' },
  { id: 'wm-4', name: 'ゆい' },
];

export const INITIAL_WARIKAN_PAYMENTS = [
  {
    id: 'pay-1',
    title: 'レンタカー代（ガソリン・高速込）',
    amount: 14000,
    payerId: 'wm-1',
    participantIds: ['wm-1', 'wm-2', 'wm-3', 'wm-4'],
    date: '2026-10-18',
  },
  {
    id: 'pay-2',
    title: 'カフェランチ代（4人分）',
    amount: 7200,
    payerId: 'wm-2',
    participantIds: ['wm-1', 'wm-2', 'wm-3', 'wm-4'],
    date: '2026-10-18',
  },
  {
    id: 'pay-3',
    title: '大涌谷・名物黒たまご＆お土産',
    amount: 2400,
    payerId: 'wm-3',
    participantIds: ['wm-1', 'wm-2', 'wm-3', 'wm-4'],
    date: '2026-10-18',
  },
];

export const AVATAR_COLORS = [
  '#587b66', // セージグリーン
  '#c26549', // テラコッタ
  '#7da58d', // 明るいセージ
  '#d9826c', // サーモンテラコッタ
  '#8d7860', // サンドブラウン
  '#5a8492', // スレートブルー
  '#b47b4d', // キャラメル
  '#746587', // ラベンダーグレー
];
