// ------------------------------------------------------------
// タビトモ — AIテキストパーサー & プロンプト生成ユーティリティ
// （ChatGPT / Gemini / Claude 等の出力を解析して旅程・持ち物を自動生成）
// ------------------------------------------------------------

import { uid, formatStayDaysLabel, calcEndDateFromStayDays } from '../utils.js';

/**
 * 代表的なアイテムのカテゴリーおよび重要度判定用辞書
 */
const KNOWN_ITEM_HINTS = {
  // 必須級
  保険証: { priority: 'must', category: 'daily', reason: '急な体調不良や怪我への備え' },
  健康保険証: { priority: 'must', category: 'daily', reason: '急な体調不良や怪我への備え' },
  マイナンバーカード: { priority: 'must', category: 'daily', reason: '身分証明・保険証' },
  免許証: { priority: 'must', category: 'daily', reason: '運転・身分証明' },
  運転免許証: { priority: 'must', category: 'daily', reason: 'レンタカー・マイカー運転に必須' },
  etcカード: { priority: 'must', category: 'daily', reason: '高速道路のスムーズな通過' },
  ETCカード: { priority: 'must', category: 'daily', reason: '高速道路のスムーズな通過' },
  財布: { priority: 'must', category: 'daily', reason: '現金決済や身分証の携帯' },
  現金: { priority: 'must', category: 'daily', reason: '自販機や寺社・地方店舗用' },
  クレジットカード: { priority: 'must', category: 'daily', reason: '宿泊決済・買い物' },
  スマホ充電器: { priority: 'must', category: 'gadget', reason: '充電切れ防止' },
  スマートフォン充電器: { priority: 'must', category: 'gadget', reason: '充電切れ防止' },
  モバイルバッテリー: { priority: 'must', category: 'gadget', reason: '外出先でのバッテリー確保' },
  常備薬: { priority: 'must', category: 'daily', reason: '胃腸薬・頭痛薬・絆創膏など' },
  着替え: { priority: 'must', category: 'wear', reason: '宿泊用・予備の衣類' },
  下着: { priority: 'must', category: 'wear', reason: '宿泊日数分の替え' },

  // 便利級
  折りたたみ傘: { priority: 'nice', category: 'rain', reason: '急な雨や山の天候変化に' },
  雨具: { priority: 'nice', category: 'rain', reason: '悪天候対策' },
  レインコート: { priority: 'nice', category: 'rain', reason: '雨天時の両手フリー散策' },
  日焼け止め: { priority: 'nice', category: 'daily', reason: '紫外線対策' },
  サングラス: { priority: 'nice', category: 'daily', reason: 'ドライブや観光の眩しさ対策' },
  スニーカー: { priority: 'nice', category: 'wear', reason: '歩きやすい靴' },
  羽織もの: { priority: 'nice', category: 'wear', reason: '朝晩の冷え込み・空調対策' },
  カーディガン: { priority: 'nice', category: 'wear', reason: '朝晩の冷え込み対策' },
  防寒着: { priority: 'must', category: 'wear', reason: '高地や夜間の冷え込み対策' },
  ウインドブレーカー: { priority: 'nice', category: 'wear', reason: '風除け・体温調節' },
  ウェットティッシュ: { priority: 'nice', category: 'hygiene', reason: '食べ歩きや車内の手拭き' },
  ティッシュ: { priority: 'nice', category: 'hygiene', reason: 'エチケット' },
  ハンカチ: { priority: 'nice', category: 'hygiene', reason: '手洗い・エチケット' },
  タオル: { priority: 'nice', category: 'hygiene', reason: '足湯や温泉・汗拭き' },
  温泉タオル: { priority: 'nice', category: 'hygiene', reason: '足湯や立ち寄り湯' },
  エコバッグ: { priority: 'nice', category: 'daily', reason: 'お土産や買い物の持ち歩き' },
  ビニール袋: { priority: 'nice', category: 'daily', reason: 'ゴミや汚れ物の仕分け' },
  洗面用具: { priority: 'nice', category: 'hygiene', reason: '歯ブラシ・スキンケア' },
  スキンケア: { priority: 'nice', category: 'hygiene', reason: '保湿・洗顔' },
  リップクリーム: { priority: 'nice', category: 'hygiene', reason: '乾燥対策' },
  目薬: { priority: 'nice', category: 'hygiene', reason: '目の疲れ・乾燥' },
  カメラ: { priority: 'nice', category: 'gadget', reason: '旅の思い出撮影' },
  イヤホン: { priority: 'nice', category: 'gadget', reason: '移動中の音楽・動画' },
  水筒: { priority: 'nice', category: 'daily', reason: '水分補給' },
  飲み物: { priority: 'nice', category: 'daily', reason: '水分補給' },
  酔い止め薬: { priority: 'nice', category: 'daily', reason: 'ワインディングロード・バス対策' },
  虫除けスプレー: { priority: 'nice', category: 'daily', reason: '自然散策での虫対策' },
};

/**
 * 時間文字列（例: '9:00', '09:30', '14時', '14時30分'）を 'HH:mm' に正規化
 */
export function normalizeTimeString(timeStr) {
  if (!timeStr) return '10:00';
  const clean = timeStr.trim();

  // '14:30' または '9:05' 形式
  const colonMatch = clean.match(/(\d{1,2})[:：](\d{2})/);
  if (colonMatch) {
    const h = String(parseInt(colonMatch[1], 10)).padStart(2, '0');
    const m = colonMatch[2];
    return `${h}:${m}`;
  }

  // '14時30分' または '14時' 形式
  const kanjiMatch = clean.match(/(\d{1,2})時(?:(\d{1,2})分)?/);
  if (kanjiMatch) {
    const h = String(parseInt(kanjiMatch[1], 10)).padStart(2, '0');
    const m = kanjiMatch[2] ? String(parseInt(kanjiMatch[2], 10)).padStart(2, '0') : '00';
    return `${h}:${m}`;
  }

  return '10:00';
}

/**
 * スポット名からアイコンとカテゴリを推定
 */
export function guessSpotCategory(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('カフェ') || n.includes('喫茶') || n.includes('珈琲') || n.includes('cafe')) {
    return { category: 'カフェ', icon: '☕' };
  }
  if (n.includes('ランチ') || n.includes('ディナー') || n.includes('食') || n.includes('うどん') || n.includes('そば') || n.includes('ラーメン') || n.includes('肉') || n.includes('寿司')) {
    return { category: 'グルメ', icon: '🍴' };
  }
  if (n.includes('温泉') || n.includes('湯') || n.includes('スパ')) {
    return { category: '温泉', icon: '♨️' };
  }
  if (n.includes('神社') || n.includes('寺') || n.includes('大社') || n.includes('宮')) {
    return { category: '寺社仏閣', icon: '⛩️' };
  }
  if (n.includes('駅') || n.includes('空港') || n.includes('バスターミナル') || n.includes('港')) {
    return { category: '交通', icon: '🚉' };
  }
  if (n.includes('ホテル') || n.includes('宿') || n.includes('旅館') || n.includes('ペンション')) {
    return { category: '宿泊', icon: '🏨' };
  }
  if (n.includes('城') || n.includes('歴史') || n.includes('遺産')) {
    return { category: '歴史', icon: '🏯' };
  }
  if (n.includes('公園') || n.includes('山') || n.includes('湖') || n.includes('高原') || n.includes('滝') || n.includes('渓谷') || n.includes('川')) {
    return { category: '自然', icon: '🌲' };
  }
  if (n.includes('展望') || n.includes('タワー') || n.includes('スカイツリー') || n.includes('パノラマ')) {
    return { category: '展望台', icon: '🔭' };
  }
  if (n.includes('水族館') || n.includes('動物園') || n.includes('テーマパーク') || n.includes('遊園地')) {
    return { category: 'レジャー', icon: '🎡' };
  }
  if (n.includes('美術館') || n.includes('博物館') || n.includes('ミュージアム') || n.includes('資料館')) {
    return { category: '文化・アート', icon: '🎨' };
  }
  if (n.includes('通り') || n.includes('商店街') || n.includes('市場') || n.includes('小径') || n.includes('散策')) {
    return { category: '散策', icon: '🚶' };
  }
  return { category: '観光名所', icon: '📍' };
}

/**
 * 持ち物アイテムのカテゴリと重要度を推定
 */
export function guessPackingItemProps(name, explicitPriority = null) {
  const cleanName = (name || '').trim();
  const lowerName = cleanName.toLowerCase();

  // 1. 完全一致または部分一致の既知辞書チェック
  for (const [key, val] of Object.entries(KNOWN_ITEM_HINTS)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return {
        priority: explicitPriority || val.priority,
        category: val.category,
        reason: val.reason,
      };
    }
  }

  // 2. キーワード分類
  let priority = explicitPriority || 'nice';
  let category = 'daily';
  let reason = '旅行を楽しむための便利グッズ';

  if (
    cleanName.includes('服') ||
    cleanName.includes('シャツ') ||
    cleanName.includes('パンツ') ||
    cleanName.includes('靴下') ||
    cleanName.includes('ソックス') ||
    cleanName.includes('インナー') ||
    cleanName.includes('パジャマ') ||
    cleanName.includes('ジャケット')
  ) {
    category = 'wear';
    reason = '着替え・体温調節用';
  } else if (
    cleanName.includes('コード') ||
    cleanName.includes('ケーブル') ||
    cleanName.includes('バッテリー') ||
    cleanName.includes('充電') ||
    cleanName.includes('PC') ||
    cleanName.includes('パソコン') ||
    cleanName.includes('タブレット')
  ) {
    category = 'gadget';
    priority = explicitPriority || 'must';
    reason = '電子機器の利用・充電';
  } else if (
    cleanName.includes('傘') ||
    cleanName.includes('カッパ') ||
    cleanName.includes('防水') ||
    cleanName.includes('レイン')
  ) {
    category = 'rain';
    reason = '雨天・悪天候対策';
  } else if (
    cleanName.includes('薬') ||
    cleanName.includes('シート') ||
    cleanName.includes('マスク') ||
    cleanName.includes('綿棒') ||
    cleanName.includes('絆創膏')
  ) {
    category = 'hygiene';
    reason = '健康管理・清潔維持';
  }

  return { priority, category, reason };
}

/**
 * 'HH:mm' 形式の2つの時刻の差（分）を計算（time2 - time1）
 */
function calcMinutesDiff(time1, time2) {
  if (!time1 || !time2) return null;
  const [h1, m1] = time1.split(':').map((v) => parseInt(v, 10));
  const [h2, m2] = time2.split(':').map((v) => parseInt(v, 10));
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null;
  const diff = h2 * 60 + m2 - (h1 * 60 + m1);
  return diff > 0 ? diff : null;
}

/**
 * 移動テキストから移動手段（mode）と所要時間（分単位）を抽出
 * 例: "車で約30分", "徒歩15分", "電車で1時間20分", "タクシーで約10分"
 * @param {string} text
 * @param {string} defaultMode
 * @returns {{ mode: 'car'|'transit'|'walk'|'taxi', minutes: number | null, rawText: string }}
 */
export function parseTransitInfo(text, defaultMode = 'car') {
  if (!text || typeof text !== 'string') {
    return { mode: defaultMode, minutes: null, rawText: '' };
  }

  const clean = text.replace(/[*_#【】\[\]（\(\)）]/g, ' ').trim();
  let mode = defaultMode;

  // 移動手段の推定（※「電車」に「車」の漢字が含まれるため、公共交通を先に判定）
  if (clean.match(/(?:電車|列車|JR|地下鉄|メトロ|新幹線|バス|路線バス|高速バス|公共交通)/i)) {
    mode = 'transit';
  } else if (clean.match(/(?:徒歩|歩き|散策|徒歩移動)/i)) {
    mode = 'walk';
  } else if (clean.match(/(?:タクシー|ハイヤー)/i)) {
    mode = 'taxi';
  } else if (clean.match(/(?:車|レンタカー|ドライブ|マイカー|自動車|高速|有料道路)/i)) {
    mode = 'car';
  }

  // 所要時間（分）の抽出
  let totalMin = null;

  // パターン1: "1時間30分" または "1時間半"
  const hourAndMinMatch = clean.match(/(\d+)\s*時間\s*(?:(\d+)\s*分|半)?/);
  if (hourAndMinMatch) {
    const hours = parseInt(hourAndMinMatch[1], 10);
    let mins = 0;
    if (hourAndMinMatch[2]) {
      mins = parseInt(hourAndMinMatch[2], 10);
    } else if (clean.includes('時間半')) {
      mins = 30;
    }
    totalMin = hours * 60 + mins;
  } else {
    // パターン2: "1.5時間"
    const decimalHourMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:時間|h|hours?)/i);
    if (decimalHourMatch) {
      const val = parseFloat(decimalHourMatch[1]);
      totalMin = Math.round(val * 60);
    } else {
      // パターン3: "30分" または "10〜15分" または "20min"
      const minRangeMatch = clean.match(/(?:(\d+)\s*[〜～\-]\s*)?(\d+)\s*(?:分|min)/i);
      if (minRangeMatch) {
        totalMin = parseInt(minRangeMatch[2], 10);
      }
    }
  }

  return { mode, minutes: totalMin, rawText: clean };
}

/**
 * テキストから旅程と持ち物リストを抽出・パースするメイン関数
 * @param {string} text AIからの回答テキスト
 * @returns {{
 *   title: string | null,
 *   daysCount: number,
 *   itinerary: Array<any>,
 *   packingList: Array<any>
 * }}
 */
export function parseAiPlanText(text) {
  if (!text || typeof text !== 'string') {
    return { title: null, daysCount: 1, itinerary: [], packingList: [] };
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim());

  let parsedTitle = null;
  const itinerary = [];
  const packingList = [];

  let currentSection = 'itinerary'; // 'itinerary' | 'packing'
  let currentPackingSubSection = null; // 'must' | 'nice' | null
  let currentDay = 1;
  let maxDayFound = 1;
  let pendingTransit = null; // 直前に見つかった移動行の情報を一時保持

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    // マークダウンの太字や余計な記号を簡易クリーンアップ
    const line = rawLine.replace(/^\s*[#>*-]+\s*/, '').trim();

    // 1. タイトル行の検出
    if (!parsedTitle && (rawLine.startsWith('# ') || rawLine.match(/^(?:プラン名|タイトル|旅行名|旅程名)[：:]\s*(.+)/i))) {
      const match = rawLine.match(/^(?:#\s*|(?:プラン名|タイトル|旅行名|旅程名)[：:]\s*)(.+)/i);
      if (match && match[1]) {
        parsedTitle = match[1].replace(/[*#]/g, '').trim();
      }
    }

    // 2. セクション切り替えの検出（持ち物セクションへの遷移）
    if (
      line.match(/^(?:【|\[|■|◆|###?|\*\*)?\s*(?:持ち物|持ちもの|もちもの|持ち物リスト|持ちものリスト|パッキング|準備するもの)/i)
    ) {
      currentSection = 'packing';
      continue;
    }

    // 3. 持ち物サブセクション（必須 vs あると便利）の検出
    if (currentSection === 'packing') {
      if (line.match(/(?:必須|マスト|絶対必要|忘れずに)/i)) {
        currentPackingSubSection = 'must';
        continue;
      }
      if (line.match(/(?:あると便利|おすすめ|推奨|快適グッズ|任意)/i)) {
        currentPackingSubSection = 'nice';
        continue;
      }
    }

    // 4. 日程セクション（Day 1, 1日目など）の検出
    const dayMatch = line.match(/(?:【|\[|■|◆|###?|\*\*)?\s*(?:Day\s*(\d+)|\((\d+)日目\)|(\d+)日目)/i);
    if (dayMatch) {
      const d = parseInt(dayMatch[1] || dayMatch[2] || dayMatch[3], 10);
      if (!isNaN(d) && d > 0 && d <= 30) {
        currentDay = d;
        if (d > maxDayFound) maxDayFound = d;
        currentSection = 'itinerary';
        pendingTransit = null; // 日付が変わったら移動保留をクリア
        continue;
      }
    }

    // 5. 旅程行の解析
    if (currentSection === 'itinerary') {
      // 移動行（スポット間の移動手段・所要時間）の検出
      // 例: "（移動：車で約20分）", "- 移動：徒歩10分", "↓ 車で約15分", "所要時間：電車で30分"
      const isTransitLine =
        !rawLine.match(/(?:^|[・\-\*\s■◆])(\d{1,2}[:：]\d{2}|\d{1,2}時(?:\d{1,2}分)?)/) &&
        (
          line.match(/^(?:[（\(\[【]?\s*(?:移動|所要時間|アクセス|移動時間)[：:\s]|[\-*\・↓→]\s*(?:移動|所要時間|アクセス)[：:\s]|(?:[（\(]\s*(?:車|徒歩|電車|バス|タクシー)[で\s]))/i) ||
          ((line.includes('移動') || line.startsWith('↓') || line.startsWith('→')) && (line.includes('分') || line.includes('時間') || line.includes('min')))
        );

      if (isTransitLine) {
        pendingTransit = parseTransitInfo(rawLine);
        continue;
      }

      // 時間パターンを検索（例: "10:00", "09:30", "13時", "14時30分"）
      // 行頭や箇条書きの直後にある時間を優先
      const timeRegex = /(?:^|[・\-\*\s■◆])(\d{1,2}[:：]\d{2}|\d{1,2}時(?:\d{1,2}分)?)/;
      const tMatch = rawLine.match(timeRegex);

      if (tMatch) {
        const timeStr = normalizeTimeString(tMatch[1]);
        // 時間以降の文字列を取得
        const afterTime = rawLine.slice(tMatch.index + tMatch[0].length).trim();
        // 区切り記号（〜, -, :, ：, 空白）でスポット名とメモに分割
        const cleanContent = afterTime.replace(/^[\s~〜\-:：＝]+\s*/, '');

        if (cleanContent) {
          // 移動情報の適用準備
          let appliedTransit = pendingTransit;
          pendingTransit = null; // 消費

          // スポット行自身の中に（移動：車で約20分）などが含まれている場合の抽出と行からの除去
          let contentForSplit = cleanContent;
          const inlineTransitMatch = cleanContent.match(/[（\(【\[](?:移動[：:\s]*)?([^）\)】\]]*(?:車|徒歩|電車|バス|タクシー|分|時間)[^）\)】\]]*)[）\)】\]]/);
          if (inlineTransitMatch && (inlineTransitMatch[1].includes('分') || inlineTransitMatch[1].includes('時間'))) {
            if (!appliedTransit) {
              appliedTransit = parseTransitInfo(inlineTransitMatch[1]);
            }
            contentForSplit = contentForSplit.replace(inlineTransitMatch[0], ' ').trim();
          }

          let spotName = contentForSplit;
          let spotMemo = '';

          // コロンやダッシュ、括弧でスポット名と説明を分割
          const splitMatch = contentForSplit.match(/^([^\n:：—–\-（\(【]+)(?:[:：—–\-（\(【]\s*(.+))?$/);
          if (splitMatch) {
            spotName = splitMatch[1].replace(/[*#_]/g, '').trim();
            spotMemo = (splitMatch[2] || '').replace(/[*#_）\)]/g, '').trim();
          }

          // メモ側に移動テキストが漏れて残っていた場合の追加クリーンアップ
          if (spotMemo) {
            spotMemo = spotMemo
              .replace(/(?:[（\(【\[]?\s*移動[：:\s]*)?[^）\)】\]]*(?:車|徒歩|電車|バス|タクシー)[^）\)】\]]*(?:分|時間)[）\)】\]]?/g, '')
              .replace(/^[：:\-—–\s]+/, '')
              .trim();
          }

          if (spotName.length >= 2) {
            const { category, icon } = guessSpotCategory(spotName);

            const spotItem = {
              id: uid('spot-ai'),
              day: currentDay,
              time: timeStr,
              name: spotName,
              stayMin: 45,
              memo: spotMemo,
              category,
              icon,
              isAiImported: true,
            };

            if (appliedTransit) {
              spotItem.transitMode = appliedTransit.mode;
              if (appliedTransit.minutes != null) {
                spotItem.transitMin = appliedTransit.minutes;
              }
            }

            itinerary.push(spotItem);
          }
        }
      }
    }

    // 6. 持ち物行の解析
    if (currentSection === 'packing') {
      // 箇条書き記号（-, *, ・, 1., [ ] など）を取り除く
      const cleanItemLine = rawLine
        .replace(/^[\s\-\*・■◆\d\.\)\[\]\(\)\+]+/, '')
        .replace(/[*_]/g, '')
        .trim();

      if (cleanItemLine && cleanItemLine.length >= 2 && !cleanItemLine.startsWith('#')) {
        // 「アイテム名（必須）」や「アイテム名：理由」の解析
        let itemName = cleanItemLine;
        let itemReason = '';
        let explicitPriority = currentPackingSubSection;

        // 必須・便利の表記チェック
        if (cleanItemLine.match(/(?:【|\[|（|\()(?:必須|マスト)(?:】|\]|）|\))/i)) {
          explicitPriority = 'must';
          itemName = itemName.replace(/(?:【|\[|（|\()(?:必須|マスト)(?:】|\]|）|\))/gi, '').trim();
        } else if (cleanItemLine.match(/(?:【|\[|（|\()(?:あると便利|便利|任意|おすすめ)(?:】|\]|）|\))/i)) {
          explicitPriority = 'nice';
          itemName = itemName.replace(/(?:【|\[|（|\()(?:あると便利|便利|任意|おすすめ)(?:】|\]|）|\))/gi, '').trim();
        }

        // コロンや括弧で理由を分割
        const reasonSplit = itemName.match(/^([^\n:：—–（\(]+)(?:[:：—–（\(]\s*(.+))?$/);
        if (reasonSplit && reasonSplit[2]) {
          itemName = reasonSplit[1].trim();
          itemReason = reasonSplit[2].replace(/[）\)]/g, '').trim();
        }

        // アイテム名が短すぎる、または見出しっぽい場合はスキップ
        if (itemName.length >= 2 && itemName.length <= 30 && !itemName.includes('持ち物')) {
          const props = guessPackingItemProps(itemName, explicitPriority);
          // 既に同じ名前で追加されていないか確認
          if (!packingList.some((p) => p.name.toLowerCase() === itemName.toLowerCase())) {
            packingList.push({
              id: uid('pack-ai'),
              name: itemName,
              priority: props.priority,
              category: props.category,
              reason: itemReason || props.reason,
              reasonTag: props.priority === 'must' ? 'AI必須' : 'AIおすすめ',
              source: 'ai',
            });
          }
        }
      }
    }
  }

  // もし時間行は見つからなかったが持ち物セクションより前の行が箇条書きなら、旅程スポットとして救済
  if (itinerary.length === 0 && lines.length > 0) {
    let fallbackDay = 1;
    lines.forEach((l) => {
      const dayM = l.match(/(\d+)日目/);
      if (dayM) fallbackDay = parseInt(dayM[1], 10);
      const bullet = l.match(/^[\-\*・]\s*(.+)/);
      if (bullet && !l.includes('持ち物') && !l.includes('必須') && bullet[1].length <= 25) {
        const name = bullet[1].replace(/[*#]/g, '').trim();
        if (name.length >= 2) {
          const { category, icon } = guessSpotCategory(name);
          itinerary.push({
            id: uid('spot-ai'),
            day: fallbackDay,
            time: '11:00',
            name,
            stayMin: 45,
            memo: '',
            category,
            icon,
            isAiImported: true,
          });
        }
      }
    });
  }

  // 同一日内のスポット間で transitMin が未設定の場合、時間差から自動推定
  for (let i = 1; i < itinerary.length; i++) {
    const prev = itinerary[i - 1];
    const curr = itinerary[i];
    if (prev.day === curr.day && (curr.transitMin == null || curr.transitMin === '')) {
      const diff = calcMinutesDiff(prev.time, curr.time);
      if (diff != null && diff > 0) {
        // 前の滞在時間(45分)を考慮した移動時間、または時間差に応じた現実的な分数を設定
        const estimatedTransit = diff > (prev.stayMin || 45)
          ? diff - (prev.stayMin || 45)
          : Math.min(diff, 30);
        curr.transitMin = Math.max(10, Math.min(estimatedTransit, 180));
        if (!curr.transitMode) {
          curr.transitMode = 'car';
        }
      }
    }
  }

  return {
    title: parsedTitle,
    daysCount: Math.max(maxDayFound, 1),
    itinerary,
    packingList,
  };
}

/**
 * ChatGPTやGemini等へ投げる「しおり旅程＆持ち物作成用」プロンプトテキストを生成
 * @param {object} trip 現在の旅行データ
 * @param {object} options ユーザーがモーダル上でカスタマイズした条件
 */
export function generatePlanPrompt(trip, options = {}) {
  const destination = (options.destination || trip?.mainSpot || '').trim();
  const stayDays = Math.max(1, options.stayDays || trip?.stayDays || 2);
  const style = options.style || trip?.style || 'drive';
  const preferences = (options.preferences || '').trim();
  const startDate = (options.startDate || options.date || trip?.date || '').trim();
  const endDate = (options.endDate || (startDate && stayDays ? calcEndDateFromStayDays(startDate, stayDays) : '')).trim();

  let scheduleText = '';
  if (startDate && endDate && startDate !== endDate) {
    scheduleText = `${startDate} 〜 ${endDate}（${formatStayDaysLabel(stayDays)}）`;
  } else if (startDate) {
    scheduleText = `${startDate}（${formatStayDaysLabel(stayDays)}）`;
  } else {
    scheduleText = formatStayDaysLabel(stayDays);
  }

  const styleLabel =
    style === 'drive'
      ? 'ドライブ・周遊'
      : style === 'onsen'
      ? '温泉・のんびり'
      : style === 'hiking'
      ? '自然・ハイキング'
      : style === 'camp'
      ? 'アウトドア・キャンプ'
      : '街歩き・歴史';

  const defaultTransitEx =
    style === 'drive'
      ? '（移動：車で約20分）'
      : style === 'city'
      ? '（移動：電車で約15分）'
      : '（移動：車で約20分）';

  const destLine = destination
    ? `- 行先・目的地: ${destination}`
    : `- 行先・目的地: [行きたい場所を入力してください]`;

  const prefLine = preferences ? `- こだわり・希望: ${preferences}` : '';

  return `以下の条件で、旅行の「タイムライン旅程」と「持ち物リスト」を作成してください。
旅行アプリ「タビトモ」に直接貼り付けて取り込むため、指定のフォーマットで出力をお願いします。

【旅行条件】
${destLine}
- 日程: ${scheduleText}
- 旅行スタイル: ${styleLabel}
${prefLine}

【重要なお願い】
※ ランチ・カフェ・立ち寄り先は「〇〇周辺」などの曖昧な表現を避け、実在する具体的な店舗名・名所名（例: 「ホテル立山 レストラン雄山」「喫茶〇〇」など）を必ず明記してください。
※ 各スポット間の「移動手段（車・徒歩・電車等）」と「移動時間」も、必ずスポットとスポットの間に「（移動：〇〇で約〇分）」と明記してください。

【出力フォーマット】
タイトル：〇〇旅行

【1日目】
- 10:00 具体的なスポット名A：見どころや楽しみ方のメモ
  ${defaultTransitEx}
- 11:30 具体的なスポット名B：見どころや楽しみ方のメモ
  （移動：徒歩で約10分）
- 12:30 具体的な店舗名C：ランチやカフェのメモ
  ${defaultTransitEx}
- 14:30 具体的なスポット名D：散策のメモ
${stayDays > 1 ? `\n【2日目】\n- 09:30 具体的なスポット名：見どころメモ\n  ${defaultTransitEx}\n- 12:00 具体的な店舗名：ランチ・ご当地グルメのメモ\n` : ''}${stayDays > 2 ? `\n【3日目〜${stayDays}日目】\n※最終日（${stayDays}日目）まで同様に具体的な店舗名・スポット名と移動時間を入れて出力してください\n` : ''}
【持ち物リスト】
■ 必須の持ち物
- アイテム名：理由
- アイテム名：理由

■ あると便利な持ち物
- アイテム名：理由
- アイテム名：理由
`.replace(/\n\s*\n\s*\n/g, '\n\n');
}

/**
 * AIと対話しながら一緒にプランを決める「相談スタート用」プロンプト
 */
export function generateConsultPrompt(trip, options = {}) {
  const destination = (options.destination || trip?.mainSpot || '').trim();
  const stayDays = Math.max(1, options.stayDays || trip?.stayDays || 2);
  const style = options.style || trip?.style || 'drive';
  const preferences = (options.preferences || '').trim();
  const startDate = (options.startDate || options.date || trip?.date || '').trim();
  const endDate = (options.endDate || (startDate && stayDays ? calcEndDateFromStayDays(startDate, stayDays) : '')).trim();

  let scheduleText = '';
  if (startDate && endDate && startDate !== endDate) {
    scheduleText = `${startDate} 〜 ${endDate}（${formatStayDaysLabel(stayDays)}）`;
  } else if (startDate) {
    scheduleText = `${startDate}（${formatStayDaysLabel(stayDays)}）`;
  } else {
    scheduleText = formatStayDaysLabel(stayDays);
  }

  const styleLabel =
    style === 'drive'
      ? 'ドライブ・周遊'
      : style === 'onsen'
      ? '温泉・のんびり'
      : style === 'hiking'
      ? '自然・ハイキング'
      : style === 'camp'
      ? 'アウトドア・キャンプ'
      : '街歩き・歴史';

  const destText = destination || '[行先・目的地]';

  return `こんにちは！以下の条件で旅行を計画しています。
まずはおすすめの見どころ、美味しいご当地グルメやランチ・カフェ候補をいくつか提案してください。相談しながら決めたいです！

【旅行の概要】
- 行先: ${destText}
- 日程: ${scheduleText}
- 旅行スタイル: ${styleLabel}
${preferences ? `- 希望・こだわり: ${preferences}\n` : ''}
※「〇〇周辺」といったざっくりした表現ではなく、実在する具体的なお店の名前や名所をいくつか教えてください。`;
}

/**
 * AIとの相談がまとまった後に送る「タビトモ取り込みフォーマット変換用」プロンプト
 */
export function generateFormatConversionPrompt(stayDays = 2) {
  const days = Math.max(1, Number(stayDays) || 1);
  return `提案ありがとうございます！このプラン内容で確定します。
旅行アプリ「タビトモ」に直接貼り付けて取り込むため、以下のフォーマットに整形して出力してください。
※ 各スポット間の「移動手段（車・徒歩・電車等）」と「移動時間」もスポット間に「（移動：〇〇で約〇分）」と明記してください。

【出力フォーマット】
タイトル：〇〇旅行

【1日目】
- 10:00 スポット名または店舗名：見どころ・メモ
  （移動：車で約20分）
- 12:00 店舗名：ランチ・カフェメモ
  （移動：徒歩で約10分）
- 14:00 スポット名：見どころメモ
${days > 1 ? `\n【2日目】\n- 09:30 スポット名：見どころメモ\n  （移動：車で約20分）\n- 12:00 店舗名：ランチメモ\n` : ''}${days > 2 ? `\n【3日目〜${days}日目】\n※最終日（${days}日目）まで同様に出力してください\n` : ''}
【持ち物リスト】
■ 必須の持ち物
- アイテム名：理由
- アイテム名：理由

■ あると便利な持ち物
- アイテム名：理由
- アイテム名：理由`;
}

/**
 * ChatGPTやGemini等へ投げる「持ち物相談専用」プロンプトテキストを生成
 * @param {object} trip 現在の旅行データ
 * @param {object} options ユーザーが指定した追加条件
 */
export function generatePackingPrompt(trip, options = {}) {
  const destination = (options.destination || trip?.mainSpot || trip?.title || '').trim();
  const stayDays = Math.max(1, options.stayDays || trip?.stayDays || 2);
  const startDate = (options.startDate || options.date || trip?.date || '').trim();
  const endDate = (options.endDate || (startDate && stayDays ? calcEndDateFromStayDays(startDate, stayDays) : '')).trim();
  const spotNames = (trip?.itinerary || []).map((s) => s.name).filter(Boolean).slice(0, 5).join('、');
  const preferences = (options.preferences || '').trim();

  let scheduleText = '';
  if (startDate && endDate && startDate !== endDate) {
    scheduleText = `${startDate} 〜 ${endDate}（${formatStayDaysLabel(stayDays)}）`;
  } else if (startDate) {
    scheduleText = `${startDate}（${formatStayDaysLabel(stayDays)}）`;
  } else {
    scheduleText = formatStayDaysLabel(stayDays);
  }

  const destLine = destination
    ? `- 目的地・エリア: ${destination}`
    : `- 目的地・エリア: [行先を入力してください]`;

  const spotsLine = spotNames ? `- 立ち寄り予定スポット: ${spotNames}` : '';
  const prefLine = preferences ? `- 気になる点・活動内容: ${preferences}` : '';

  return `以下の旅行の目的地・日程・予定スポットに合わせて、忘れると困る「必須の持ち物」と、快適に過ごすための「あると便利な持ち物」を提案してください。
旅行アプリ「タビトモ」に直接取り込むため、以下のフォーマットで出力してください。

【旅行条件】
${destLine}
- 日程: ${scheduleText}
${spotsLine}
${prefLine}

【出力フォーマット】
【持ち物リスト】
■ 必須の持ち物
- アイテム名：理由
- アイテム名：理由

■ あると便利な持ち物
- アイテム名：理由
- アイテム名：理由
`.replace(/\n\s*\n\s*\n/g, '\n\n');
}

/**
 * 既存の持ち物リストと照合して重複を排除しながらマージする関数
 * @param {Array} existingItems 現在のアイテムリスト
 * @param {Array} newItems 追加するアイテムリスト
 * @returns {Array} 重複排除後の追加対象アイテムリスト
 */
export function filterDuplicateItems(existingItems = [], newItems = []) {
  const existingNames = new Set(
    existingItems
      .filter((i) => i && i.name)
      .map((i) => i.name.replace(/\s+/g, '').toLowerCase())
  );

  return newItems.filter((item) => {
    if (!item || !item.name) return false;
    const normalized = item.name.replace(/\s+/g, '').toLowerCase();
    if (existingNames.has(normalized)) {
      return false; // すでに存在する
    }
    existingNames.add(normalized);
    return true;
  });
}

