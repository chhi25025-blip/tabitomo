import React, { useMemo, useState } from 'react';
import Icon from './Icon';
import {
  GEAR_CATEGORIES,
  gearCategoryLabel,
  diagnoseTripWeatherAndBag,
  generateFullPackingList,
  isOwnedItem,
} from '../travelData';

export default function MochimonoTab({
  trips = [],
  activeTripId,
  onSelectTrip,
  currentTrip,
  myItems = [],
  onToggleCheckPacking,
  onToggleExcludePacking,
  onAddMyItem,
  onToggleMyItemOwned,
  onDeleteMyItem,
  onQuickAddMissingToMyItems,
}) {
  const [subTab, setSubTab] = useState('checklist'); // 'checklist' | 'myitems'
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'must' | 'nice' | 'missing'
  const [showExcluded, setShowExcluded] = useState(false);

  // お天気表示で選択中の日程（'all' または 1, 2, 3...）
  const [selectedWeatherDay, setSelectedWeatherDay] = useState('all');

  // マイアイテム追加フォームステート
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('wear');
  const [filterCategory, setFilterCategory] = useState('all');
  const [errorMessage, setErrorMessage] = useState('');

  // 現在対象の旅行
  const selectedTrip = useMemo(() => {
    return (
      (trips && trips.find((t) => t.id === activeTripId)) ||
      currentTrip ||
      (trips && trips[0]) || {
        id: 'default-trip',
        title: '旅のしおり',
        date: '2026-10-18',
        style: 'drive',
        memo: '',
        itinerary: [],
      }
    );
  }, [trips, activeTripId, currentTrip]);

  // 1. 気候・天候・推奨バッグ診断
  const diag = useMemo(() => {
    return diagnoseTripWeatherAndBag(selectedTrip);
  }, [selectedTrip]);

  // 選択中日程の個別予報（'all' のときは null）
  const activeDayForecast = useMemo(() => {
    if (selectedWeatherDay === 'all') return null;
    return diag.dailyForecasts?.find((d) => d.dayNumber === Number(selectedWeatherDay)) || null;
  }, [diag.dailyForecasts, selectedWeatherDay]);

  // 2. フル持ち物リスト（必須 ＆ あると安心）
  const fullPackingList = useMemo(() => {
    return generateFullPackingList(selectedTrip);
  }, [selectedTrip]);

  // 3. 所持判定・除外判定・進捗サマリー
  const {
    activeItems,
    mustItems,
    niceItems,
    excludedItems,
    missingMustItems,
    missingNiceItems,
    checkedCount,
    totalCount,
    percent,
  } = useMemo(() => {
    const checkedMap = selectedTrip?.checkedPacking || {};
    const excludedMap = selectedTrip?.excludedPacking || {};

    const active = [];
    const excluded = [];

    fullPackingList.forEach((item) => {
      const isExcluded = Boolean(excludedMap[item.name]);
      const isOwned = isOwnedItem(item.name, myItems);
      const isChecked = Boolean(checkedMap[item.name]);

      const itemWithState = {
        ...item,
        isOwned,
        isChecked,
        isExcluded,
      };

      if (isExcluded) {
        excluded.push(itemWithState);
      } else {
        active.push(itemWithState);
      }
    });

    const must = active.filter((i) => i.priority === 'must');
    const nice = active.filter((i) => i.priority === 'nice');
    const missingMust = must.filter((i) => !i.isOwned);
    const missingNice = nice.filter((i) => !i.isOwned);

    const checked = active.filter((i) => i.isChecked).length;
    const total = active.length;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

    return {
      activeItems: active,
      mustItems: must,
      niceItems: nice,
      excludedItems: excluded,
      missingMustItems: missingMust,
      missingNiceItems: missingNice,
      checkedCount: checked,
      totalCount: total,
      percent: pct,
    };
  }, [fullPackingList, selectedTrip, myItems]);

  // 表示するアイテムリストの絞り込み
  const displayedItems = useMemo(() => {
    if (filterMode === 'must') return mustItems;
    if (filterMode === 'nice') return niceItems;
    if (filterMode === 'missing') return activeItems.filter((i) => !i.isOwned);
    return activeItems;
  }, [filterMode, activeItems, mustItems, niceItems]);

  // マイアイテム追加ハンドラ
  const handleAddNewItem = (e) => {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name) {
      setErrorMessage('アイテム名を入力してください');
      return;
    }
    if (myItems.some((i) => i.name === name)) {
      setErrorMessage(`「${name}」は既に登録されています`);
      return;
    }
    onAddMyItem(name, newItemCategory);
    setNewItemName('');
    setErrorMessage('');
  };

  const filteredMyItems = useMemo(() => {
    if (filterCategory === 'all') return myItems;
    return myItems.filter((i) => i.category === filterCategory);
  }, [myItems, filterCategory]);

  // メインの行き先名
  const mainSpotName =
    selectedTrip?.mainSpot ||
    selectedTrip?.itinerary?.[0]?.name ||
    '旅の目的地';

  return (
    <div className="mochimono-tab-page">
      {/* 上部サブタブ切り替え */}
      <div className="sub-segmented-control">
        <button
          type="button"
          className={`sub-segment-btn ${subTab === 'checklist' ? 'is-active' : ''}`}
          onClick={() => setSubTab('checklist')}
        >
          <Icon name="check" size={16} />
          <span>パッキング照合・リスト</span>
          {missingMustItems.length > 0 && (
            <span className="badge-count-warning" title="必須アイテムに不足があります">
              必須不足 {missingMustItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`sub-segment-btn ${subTab === 'myitems' ? 'is-active' : ''}`}
          onClick={() => setSubTab('myitems')}
        >
          <Icon name="backpack" size={16} />
          <span>マイアイテム管理 ({myItems.length})</span>
        </button>
      </div>

      {/* ================= モード1: パッキング照合・チェックリスト ================= */}
      {subTab === 'checklist' && (
        <div className="mochimono-checklist-view">
          {/* 旅行切り替えセレクター（しおりの最大5件と完全連動） */}
          {trips && trips.length > 1 && (
            <section className="card card-trip-selector-bar">
              <div className="selector-bar-inner">
                <span className="selector-label">
                  <Icon name="mapPin" size={15} /> パッキング対象の旅行:
                </span>
                <div className="trip-chips-scroll">
                  {trips.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`trip-select-chip ${selectedTrip.id === t.id ? 'is-active' : ''}`}
                      onClick={() => onSelectTrip && onSelectTrip(t.id)}
                    >
                      <span className="chip-trip-title">{t.title}</span>
                      <span className="chip-trip-date">{t.date}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ① 旅の気候・天候・推奨バッグ診断カード（画像背景＆すりガラス） */}
          <section
            className="card card-weather-hero"
            style={{ backgroundImage: `url(${diag.photoUrl})` }}
          >
            <div className="weather-hero-overlay">
              <div className="weather-hero-head">
                <div className="hero-dest-badge">
                  <span className="hero-season-badge">
                    {diag.seasonIcon} {diag.seasonLabel}
                  </span>
                  <span className="hero-stay-badge">
                    📅 {diag.stayLabel}
                  </span>
                  <span className="hero-date-badge">
                    {selectedTrip.date} 出発
                  </span>
                </div>
                <h2 className="weather-hero-title">
                  {selectedTrip.title}
                </h2>
                <p className="weather-hero-spot">
                  📍 {diag.displaySpotName}
                  {!diag.hasSpots && (
                    <span className="spot-unregistered-hint">
                      （立ち寄りスポット未登録。「たびさがし」や「しおり」で追加すると各日の滞在エリア天気が自動反映されます）
                    </span>
                  )}
                </p>
              </div>

              {/* 日程別・滞在エリアの天気予報チップバー */}
              {diag.dailyForecasts && diag.dailyForecasts.length > 0 && (
                <div className="daily-forecasts-strip">
                  <div className="forecasts-strip-header">
                    <span className="forecasts-strip-title">
                      📅 日程別・滞在エリアの天気予報（タップして切替）
                    </span>
                    <div className="forecasts-strip-badges">
                      {diag.coldestDay && (
                        <span className="cold-risk-pill" title={`最も冷え込む日: ${diag.coldestDay.dayNumber}日目`}>
                          ❄️ 最低気温: Day {diag.coldestDay.dayNumber} {diag.coldestDay.areaName} ({diag.coldestDay.low}℃)
                        </span>
                      )}
                      {diag.hasRainForecast && (
                        <span className="rain-alert-badge">☔ 期間中に雨予報あり（折りたたみ傘推奨）</span>
                      )}
                    </div>
                  </div>

                  <div className="daily-forecasts-scroll">
                    {/* 全日程サマリーチップ */}
                    <button
                      type="button"
                      className={`daily-forecast-chip all-days-chip ${selectedWeatherDay === 'all' ? 'is-active' : ''}`}
                      onClick={() => setSelectedWeatherDay('all')}
                    >
                      <div className="df-head">
                        <span className="df-day-num">全日程</span>
                        <span className="df-date-label">サマリー</span>
                      </div>
                      <div className="df-body">
                        <span className="df-icon">🌤️</span>
                        <span className="df-area-name">全エリア総合</span>
                      </div>
                      <div className="df-temp">
                        <span className="df-high">{diag.highTemp}℃</span>
                        <span className="df-slash">/</span>
                        <span className="df-low">{diag.lowTemp}℃</span>
                      </div>
                      <div className="df-rain">
                        寒暖差 {diag.tempDiff}℃
                      </div>
                    </button>

                    {/* 各日エリア別チップ */}
                    {diag.dailyForecasts.map((df) => (
                      <button
                        key={df.dayNumber}
                        type="button"
                        className={`daily-forecast-chip ${selectedWeatherDay === df.dayNumber ? 'is-active' : ''}`}
                        onClick={() => setSelectedWeatherDay(df.dayNumber)}
                      >
                        <div className="df-head">
                          <span className="df-day-num">Day {df.dayNumber}</span>
                          <span className="df-date-label">{df.dateLabel}</span>
                        </div>
                        <div className="df-body">
                          <span className="df-icon">{df.icon}</span>
                          <strong className="df-area-name">{df.areaName}</strong>
                        </div>
                        <div className="df-temp">
                          <span className="df-high">{df.high}℃</span>
                          <span className="df-slash">/</span>
                          <span className="df-low">{df.low}℃</span>
                        </div>
                        <div className="df-rain">
                          {df.weather} (雨 {df.rainProb}%)
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 気温・天候サマリー ＆ 推奨バッグの2大ブロック */}
              <div className="weather-hero-grid">
                {/* 左: 気候・天候インフォ（選択中の日または全日程） */}
                <div className="hero-info-glass-box">
                  <div className="glass-box-head">
                    <span className="glass-icon">🌡️</span>
                    <div>
                      <div className="temp-numbers">
                        <span className="temp-high">
                          最高 {activeDayForecast ? activeDayForecast.high : diag.highTemp}℃
                        </span>
                        <span className="temp-slash">/</span>
                        <span className="temp-low">
                          最低 {activeDayForecast ? activeDayForecast.low : diag.lowTemp}℃
                        </span>
                      </div>
                      <p className="temp-diff-note">
                        {activeDayForecast ? (
                          <>
                            <strong>Day {activeDayForecast.dayNumber}（{activeDayForecast.areaName}）</strong>の予報: 寒暖差 約{activeDayForecast.tempDiff}℃
                          </>
                        ) : (
                          <>
                            期間中の寒暖差: <strong>約{diag.tempDiff}℃</strong>（最低{diag.lowTemp}℃〜最高{diag.highTemp}℃）
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="weather-status-line">
                    {activeDayForecast ? (
                      <>{activeDayForecast.icon} {activeDayForecast.weather}（降水確率 {activeDayForecast.rainProb}%）</>
                    ) : (
                      <>☀️ {diag.weatherText}</>
                    )}
                  </p>
                  <p className="weather-advice-quote">
                    💡 {activeDayForecast ? activeDayForecast.advice : diag.adviceText}
                  </p>
                </div>

                {/* 右: 推奨バッグ診断 */}
                <div className="hero-info-glass-box bag-glass-box">
                  <div className="glass-box-head">
                    <span className="glass-icon">{diag.bagInfo.icon}</span>
                    <div>
                      <span className="glass-label-sub">{diag.stayLabel}・スタイル推奨バッグ</span>
                      <h4 className="bag-recommend-name">{diag.bagInfo.type}</h4>
                    </div>
                  </div>
                  <div className="bag-capacity-pill">
                    推奨容量: <strong>{diag.bagInfo.capacity}</strong>
                  </div>
                  <p className="bag-advice-quote">
                    {diag.bagInfo.advice}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ② パッキング進捗 ＆ 不足サマリー */}
          <section className="card card-packing-summary">
            <div className="summary-banner-head">
              <div className="summary-title-wrap">
                <span className="leaf-badge">
                  <Icon name="check" size={14} /> パッキング進捗
                </span>
                <h3 className="summary-trip-name">
                  荷造りの完了率（{checkedCount} / {totalCount} 点）
                </h3>
              </div>

              <div className="summary-score-badge">
                <span className="score-val">{percent}</span>
                <span className="score-unit">%</span>
                <span className="score-desc">準備完了</span>
              </div>
            </div>

            {/* 進捗ゲージ */}
            <div className="packing-progress-bar-wrap">
              <div
                className="packing-progress-bar-fill"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* 不足アラートブロック */}
            <div className="summary-alert-strip">
              <div className={`status-pill-item ${missingMustItems.length > 0 ? 'is-warning' : 'is-ok'}`}>
                <span className="pill-dot" />
                <span className="pill-text">
                  🔥 <strong>必須アイテム</strong>:
                  {missingMustItems.length > 0 ? (
                    <span className="text-danger"> 未所持 {missingMustItems.length}点 要準備！</span>
                  ) : (
                    <span className="text-success"> すべて手元に揃っています</span>
                  )}
                </span>
              </div>

              <div className={`status-pill-item ${missingNiceItems.length > 0 ? 'is-caution' : 'is-ok'}`}>
                <span className="pill-dot" />
                <span className="pill-text">
                  ✨ <strong>あると安心</strong>:
                  {missingNiceItems.length > 0 ? (
                    <span className="text-caution"> 未所持 {missingNiceItems.length}点（必要に応じて用意）</span>
                  ) : (
                    <span className="text-success"> 手元に揃っています</span>
                  )}
                </span>
              </div>
            </div>

            {/* ③ 表示フィルタータブ */}
            <div className="packing-filter-pills">
              <button
                type="button"
                className={`filter-pill-btn ${filterMode === 'all' ? 'is-active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                すべて表示 ({totalCount})
              </button>
              <button
                type="button"
                className={`filter-pill-btn must-pill ${filterMode === 'must' ? 'is-active' : ''}`}
                onClick={() => setFilterMode('must')}
              >
                🔥 必須のみ ({mustItems.length})
                {missingMustItems.length > 0 && <span className="pill-badge-num">{missingMustItems.length}</span>}
              </button>
              <button
                type="button"
                className={`filter-pill-btn nice-pill ${filterMode === 'nice' ? 'is-active' : ''}`}
                onClick={() => setFilterMode('nice')}
              >
                ✨ あると安心のみ ({niceItems.length})
              </button>
              <button
                type="button"
                className={`filter-pill-btn warn-pill ${filterMode === 'missing' ? 'is-active' : ''}`}
                onClick={() => setFilterMode('missing')}
              >
                ⚠️ 未所持・不足のみ ({missingMustItems.length + missingNiceItems.length})
              </button>
            </div>
          </section>

          {/* ④ 持ち物チェックリスト一覧 */}
          <section className="card card-checklist-items">
            {/* 「すべて表示」の場合は「必須」と「あると安心」を切り取り線で美しく区切る */}
            {filterMode === 'all' ? (
              <div className="ticket-checklist-container">
                {/* セクション1: 🔥 必須アイテム */}
                <div className="ticket-section must-section">
                  <div className="ticket-section-header must-header">
                    <div className="section-title-row">
                      <span className="priority-fire-badge">🔥 必須アイテム</span>
                      <h4 className="section-title-text">忘れると困るもの（出発前マスト）</h4>
                    </div>
                    <span className="section-count-badge">
                      {mustItems.filter((i) => i.isChecked).length} / {mustItems.length} 完了
                    </span>
                  </div>

                  <ul className="modern-packing-list">
                    {mustItems.map((item) => (
                      <PackingItemRow
                        key={item.id}
                        item={item}
                        priority="must"
                        onToggleCheck={() =>
                          onToggleCheckPacking(selectedTrip.id, item.name)
                        }
                        onQuickAdd={() =>
                          onQuickAddMissingToMyItems(item.name, item.category, selectedTrip.id)
                        }
                        onExclude={() =>
                          onToggleExcludePacking &&
                          onToggleExcludePacking(selectedTrip.id, item.name)
                        }
                      />
                    ))}
                  </ul>
                </div>

                {/* ✂️ チケット風の切り取り線（ミシン目点線ノッチ） */}
                <div className="ticket-cutline-divider" aria-hidden="true">
                  <span className="cutline-notch notch-left" />
                  <div className="cutline-dashed">
                    <span className="cutline-label">
                      ✂️ ここまで準備できれば出発OK！ 荷物に余裕があれば下もチェック
                    </span>
                  </div>
                  <span className="cutline-notch notch-right" />
                </div>

                {/* セクション2: ✨ あると安心・快適 */}
                <div className="ticket-section nice-section">
                  <div className="ticket-section-header nice-header">
                    <div className="section-title-row">
                      <span className="priority-sparkle-badge">✨ あると安心・快適</span>
                      <h4 className="section-title-text">旅をより快適にする季節・スポット対策</h4>
                    </div>
                    <span className="section-count-badge">
                      {niceItems.filter((i) => i.isChecked).length} / {niceItems.length} 完了
                    </span>
                  </div>

                  <ul className="modern-packing-list">
                    {niceItems.map((item) => (
                      <PackingItemRow
                        key={item.id}
                        item={item}
                        priority="nice"
                        onToggleCheck={() =>
                          onToggleCheckPacking(selectedTrip.id, item.name)
                        }
                        onQuickAdd={() =>
                          onQuickAddMissingToMyItems(item.name, item.category, selectedTrip.id)
                        }
                        onExclude={() =>
                          onToggleExcludePacking &&
                          onToggleExcludePacking(selectedTrip.id, item.name)
                        }
                      />
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              /* 単一フィルター表示（必須のみ・安心のみ・未所持のみ） */
              <div className="single-filter-list">
                <div className="single-filter-header">
                  <h4>
                    {filterMode === 'must' && '🔥 必須アイテム一覧'}
                    {filterMode === 'nice' && '✨ あると安心アイテム一覧'}
                    {filterMode === 'missing' && '⚠️ 未所持・不足アイテム一覧'}
                  </h4>
                  <span className="count-pill">{displayedItems.length} 点</span>
                </div>

                {displayedItems.length === 0 ? (
                  <div className="empty-results-box">
                    <p>該当するアイテムはありません。</p>
                  </div>
                ) : (
                  <ul className="modern-packing-list">
                    {displayedItems.map((item) => (
                      <PackingItemRow
                        key={item.id}
                        item={item}
                        priority={item.priority}
                        onToggleCheck={() =>
                          onToggleCheckPacking(selectedTrip.id, item.name)
                        }
                        onQuickAdd={() =>
                          onQuickAddMissingToMyItems(item.name, item.category, selectedTrip.id)
                        }
                        onExclude={() =>
                          onToggleExcludePacking &&
                          onToggleExcludePacking(selectedTrip.id, item.name)
                        }
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* ⑤ 除外したアイテムの復元エリア */}
          {excludedItems.length > 0 && (
            <section className="card card-excluded-items">
              <button
                type="button"
                className="excluded-toggle-btn"
                onClick={() => setShowExcluded((prev) => !prev)}
              >
                <div className="toggle-label-wrap">
                  <Icon name="x" size={15} />
                  <span>今回は持っていかないアイテム ({excludedItems.length}件)</span>
                </div>
                <span className="toggle-arrow">{showExcluded ? '▲ 閉じる' : '▼ 表示する'}</span>
              </button>

              {showExcluded && (
                <ul className="excluded-list-stack">
                  {excludedItems.map((item) => (
                    <li key={item.id} className="excluded-item-row">
                      <div className="excluded-name-wrap">
                        <span className="excluded-name">{item.name}</span>
                        <span className="excluded-reason">{item.reason}</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() =>
                          onToggleExcludePacking &&
                          onToggleExcludePacking(selectedTrip.id, item.name)
                        }
                      >
                        ↩️ リストに戻す
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      {/* ================= モード2: マイアイテム登録・管理 ================= */}
      {subTab === 'myitems' && (
        <div className="mochimono-myitems-view">
          <div className="myitems-layout-grid">
            {/* 新規登録カード */}
            <section className="card card-myitem-form">
              <div className="card-header-clean">
                <div className="header-icon-title">
                  <Icon name="plus" size={18} />
                  <h3>マイアイテムを登録</h3>
                </div>
              </div>
              <p className="card-desc-text">
                手持ちの服・充電器・ギアなどを登録しておくと、旅行先や気候に合わせて自動照合されます。
              </p>

              <form onSubmit={handleAddNewItem} className="myitem-form-stack">
                <label className="field-block">
                  <span className="field-label">アイテム名</span>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => {
                      setNewItemName(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="例: 防寒シェル、トレッキングシューズ、水筒"
                  />
                </label>

                <label className="field-block">
                  <span className="field-label">カテゴリ</span>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                  >
                    {GEAR_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                {errorMessage && (
                  <p className="form-error-inline">{errorMessage}</p>
                )}

                <button type="submit" className="btn btn-sage">
                  <Icon name="plus" size={16} /> アイテムを追加
                </button>
              </form>
            </section>

            {/* 所持アイテム一覧 */}
            <section className="card card-myitem-list">
              <div className="card-header-clean">
                <div className="header-icon-title">
                  <Icon name="backpack" size={18} />
                  <h3>登録済みマイアイテム一覧</h3>
                </div>
                <span className="count-pill">{myItems.length} 点登録中</span>
              </div>

              {/* カテゴリフィルタ */}
              <div className="myitem-cat-filter-row">
                <button
                  type="button"
                  className={`cat-pill ${filterCategory === 'all' ? 'is-active' : ''}`}
                  onClick={() => setFilterCategory('all')}
                >
                  すべて ({myItems.length})
                </button>
                {GEAR_CATEGORIES.map((c) => {
                  const count = myItems.filter((i) => i.category === c.id).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`cat-pill ${filterCategory === c.id ? 'is-active' : ''}`}
                      onClick={() => setFilterCategory(c.id)}
                    >
                      {c.label} ({count})
                    </button>
                  );
                })}
              </div>

              {filteredMyItems.length === 0 ? (
                <div className="empty-results-box">
                  <p>該当するアイテムはありません。</p>
                </div>
              ) : (
                <ul className="myitem-record-list">
                  {filteredMyItems.map((item) => (
                    <li key={item.id} className="myitem-record-row">
                      <div className="myitem-record-info">
                        <strong className="myitem-name">{item.name}</strong>
                        <span className="myitem-cat-tag">
                          {gearCategoryLabel(item.category)}
                        </span>
                      </div>

                      <div className="myitem-record-actions">
                        <button
                          type="button"
                          className={`btn-tag-toggle ${item.owned ? 'is-owned' : 'is-unowned'}`}
                          onClick={() => onToggleMyItemOwned(item.id)}
                          title="所持・未所持の切り替え"
                        >
                          {item.owned ? '所持中' : '未所持'}
                        </button>

                        <button
                          type="button"
                          className="btn-icon-danger"
                          onClick={() => onDeleteMyItem(item.id)}
                          title="削除"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 持ち物1行の表示コンポーネント
 */
function PackingItemRow({
  item,
  priority,
  onToggleCheck,
  onQuickAdd,
  onExclude,
}) {
  const isMust = priority === 'must';

  return (
    <li
      className={`modern-item-card ${isMust ? 'is-must-card' : 'is-nice-card'} ${
        item.isChecked ? 'is-checked-done' : ''
      } ${!item.isOwned ? 'is-unowned-alert' : ''}`}
    >
      {/* 左: チェックボックス ＋ アイテム情報 */}
      <label className="item-label-touch">
        <input
          type="checkbox"
          checked={item.isChecked}
          onChange={onToggleCheck}
          className="native-checkbox-hidden"
        />
        <span
          className={`custom-checkbox-leaf ${
            isMust ? 'must-box' : 'nice-box'
          } ${item.isChecked ? 'is-checked' : ''}`}
        >
          <Icon name="check" size={15} strokeWidth={3} />
        </span>

        <div className="item-body-content">
          <div className="item-title-line">
            <span
              className={`item-text-name ${
                isMust ? 'text-must-accent' : 'text-nice-accent'
              } ${item.isChecked ? 'text-struck' : ''}`}
            >
              {item.name}
            </span>
            {item.reasonTag && (
              <span className={`reason-tag-pill ${isMust ? 'must-tag' : 'nice-tag'}`}>
                {item.reasonTag}
              </span>
            )}
          </div>
          <span className="item-reason-desc">{item.reason}</span>
        </div>
      </label>

      {/* 右: 所持状態＆クイック操作アクション */}
      <div className="item-right-actions">
        {item.isOwned ? (
          <span className="badge badge-sage-soft sm" title="手持ちアイテムに登録済み">
            ✔ 所持中
          </span>
        ) : (
          <div className="unowned-action-cluster">
            <span className="badge badge-terracotta sm">⚠️ 未所持</span>
            <button
              type="button"
              className="btn btn-sage-soft btn-xs quick-add-btn"
              onClick={onQuickAdd}
              title="自宅にある場合はマイアイテムに登録"
            >
              <Icon name="plus" size={12} /> 持ってる
            </button>
          </div>
        )}

        <button
          type="button"
          className="btn-exclude-action"
          onClick={onExclude}
          title="この旅行では不要（リストから除外）"
          aria-label="除外"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
