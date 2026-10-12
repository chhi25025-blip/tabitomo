import React, { useMemo, useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import SpotImage from './SpotImage';
import {
  MAIN_SPOTS,
  findNearbyYorimichi,
  styleInfo,
} from '../travelData';
import {
  searchSpotFromWikipedia,
  fetchSearchSuggestions,
  getExternalApiKeys,
  saveExternalApiKeys,
  fetchNearbySpotsHybrid,
  resolveGoogleMapsSpot,
  isGoogleMapsUrl,
} from '../api/spotSearchApi';
import { getGoogleMapsSearchUrl } from '../utils';

export default function SearchTab({
  currentTrip,
  targetDay = 1,
  onSetTargetDay,
  onAddSpotToTrip,
  onSwitchToShioriTab,
}) {
  const stayDays = currentTrip?.stayDays || 1;

  // 旅探しは初期状態では常に真っ新（空）からスタート
  const [keyword, setKeyword] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResults, setOnlineResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // 検索結果カテゴリフィルター（すべて / 観光地 / レストラン / カフェ）
  const [searchCategoryFilter, setSearchCategoryFilter] = useState('all');

  // 周辺寄り道カテゴリフィルター（すべて / 観光地 / レストラン / カフェ）
  const [yorimichiCategoryFilter, setYorimichiCategoryFilter] = useState('all');

  // リアルタイム候補サジェスト
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);

  // 選択中スポット（初期状態は常に未選択 null）
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [addedToast, setAddedToast] = useState(null);

  // 初回マウント時に古いキャッシュ（箱根湯本など）を確実にクリーンアップ
  useEffect(() => {
    try {
      sessionStorage.removeItem('realtrip_selected_spot');
      sessionStorage.removeItem('realtrip_search_keyword');
      sessionStorage.removeItem('realtrip_search_results');
      sessionStorage.removeItem('realtrip_has_searched');
    } catch {}
  }, []);

  // 検索結果のカテゴリ別件数
  const searchCategoryCounts = useMemo(() => {
    const counts = { all: onlineResults.length, sightseeing: 0, restaurant: 0, cafe: 0 };
    for (const item of onlineResults) {
      if (item.categoryType === 'restaurant') counts.restaurant++;
      else if (item.categoryType === 'cafe') counts.cafe++;
      else counts.sightseeing++;
    }
    return counts;
  }, [onlineResults]);

  // フィルター適用後の検索結果
  const filteredOnlineResults = useMemo(() => {
    if (searchCategoryFilter === 'all') return onlineResults;
    return onlineResults.filter((item) => {
      if (searchCategoryFilter === 'sightseeing') {
        return item.categoryType === 'sightseeing' || (!item.categoryType && item.sourceType !== 'gourmet');
      }
      if (searchCategoryFilter === 'restaurant') {
        return item.categoryType === 'restaurant';
      }
      if (searchCategoryFilter === 'cafe') {
        return item.categoryType === 'cafe';
      }
      return true;
    });
  }, [onlineResults, searchCategoryFilter]);

  // 寄り道スポットの拡大展開ID
  const [expandedYorimichiId, setExpandedYorimichiId] = useState(null);

  // APIキー設定モーダル
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeys, setApiKeys] = useState(getExternalApiKeys);
  const [apiKeySavedMsg, setApiKeySavedMsg] = useState(false);

  // 入力キーワードに基づくリアルタイムサジェスト取得（デバウンス処理）
  useEffect(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (isGoogleMapsUrl(trimmed)) {
        setSuggestions([
          {
            name: trimmed,
            displayName: '🔗 Googleマップのリンクからスポット情報を自動読み込み',
            region: 'Googleマップ連携',
            category: 'URLから取得',
            isGmaps: true,
          },
        ]);
        setShowSuggestions(true);
        return;
      }

      const results = await fetchSearchSuggestions(trimmed);
      setSuggestions(results);
      if (results.length > 0) {
        setShowSuggestions(true);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [keyword]);

  // ドロップダウンの外側をクリックしたときに閉じる
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // 検索実行ハンドラ（通常のキーワード検索 ＆ GoogleマップURL解析の両方に対応）
  const executeSearchWithQuery = async (queryToSearch) => {
    const q = (queryToSearch || keyword).trim();
    if (!q) return;

    setShowSuggestions(false);
    setIsSearchingOnline(true);
    setHasSearched(true);

    try {
      // 1. GoogleマップのURLが貼られた場合
      if (isGoogleMapsUrl(q)) {
        const gSpot = await resolveGoogleMapsSpot(q);
        if (gSpot) {
          setOnlineResults([gSpot]);
          setSelectedSpot(gSpot);
          setSearchCategoryFilter('all');
        } else {
          setOnlineResults([]);
        }
        return;
      }

      // 2. 通常のキーワード検索
      const results = await searchSpotFromWikipedia(q);
      setOnlineResults(results);
      if (results.length > 0) {
        // 先頭を自動選択
        setSelectedSpot(results[0]);
      }
    } catch (err) {
      console.warn('Search failed:', err);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleExecuteSearch = (e) => {
    if (e) e.preventDefault();
    executeSearchWithQuery(keyword);
  };

  // サジェスト候補を選択したとき
  const handleSelectSuggestion = (suggestItem) => {
    setKeyword(suggestItem.name);
    setShowSuggestions(false);
    executeSearchWithQuery(suggestItem.name);
  };

  // 周辺の寄り道スポット（Wikipedia観光名所 ＋ ホットペッパーグルメのハイブリッド取得）
  const [nearbyYorimichi, setNearbyYorimichi] = useState([]);
  const [isYorimichiLoading, setIsYorimichiLoading] = useState(false);

  useEffect(() => {
    setExpandedYorimichiId(null);
    if (!selectedSpot) {
      setNearbyYorimichi([]);
      return;
    }
    const lat = Number(selectedSpot.lat);
    const lng = Number(selectedSpot.lng);
    const spotTitle = selectedSpot.name || selectedSpot.title || '';

    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      setNearbyYorimichi([]);
      return;
    }

    // 即時フォールバック（既存固定データ、最大15kmに安全制限）
    const fallback = findNearbyYorimichi(lat, lng, 0.1, 15.0, spotTitle);
    setNearbyYorimichi(fallback);
    setIsYorimichiLoading(true);

    let isMounted = true;
    fetchNearbySpotsHybrid(lat, lng, spotTitle, fallback)
      .then((results) => {
        if (isMounted) {
          if (results && results.length > 0) {
            setNearbyYorimichi(results);
          }
          setIsYorimichiLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsYorimichiLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSpot]);

  // 周辺寄り道スポットのカテゴリ別件数
  const yorimichiCategoryCounts = useMemo(() => {
    const counts = { all: nearbyYorimichi.length, sightseeing: 0, restaurant: 0, cafe: 0 };
    for (const item of nearbyYorimichi) {
      if (item.categoryType === 'restaurant') counts.restaurant++;
      else if (item.categoryType === 'cafe') counts.cafe++;
      else counts.sightseeing++;
    }
    return counts;
  }, [nearbyYorimichi]);

  // フィルター適用後の寄り道スポット（最大6件）
  const filteredYorimichi = useMemo(() => {
    let list = nearbyYorimichi;
    if (yorimichiCategoryFilter !== 'all') {
      list = nearbyYorimichi.filter((item) => {
        if (yorimichiCategoryFilter === 'sightseeing') {
          return item.categoryType === 'sightseeing' || (!item.categoryType && item.sourceType !== 'gourmet');
        }
        if (yorimichiCategoryFilter === 'restaurant') {
          return item.categoryType === 'restaurant';
        }
        if (yorimichiCategoryFilter === 'cafe') {
          return item.categoryType === 'cafe';
        }
        return true;
      });
    }
    return list.slice(0, 6);
  }, [nearbyYorimichi, yorimichiCategoryFilter]);

  // しおりに追加
  const handleAddSpot = (spotData, isYorimichi = false) => {
    let cat = spotData.category || (isYorimichi ? '寄り道' : '観光スポット');
    let icon = spotData.icon || (isYorimichi ? '🌿' : '📍');
    if (spotData.categoryType === 'cafe') {
      cat = 'カフェ・スイーツ';
      icon = '☕';
    } else if (spotData.categoryType === 'restaurant') {
      cat = spotData.category || 'グルメ・食事';
      icon = spotData.icon || '🍴';
    } else if (spotData.categoryType === 'sightseeing') {
      cat = spotData.category || (isYorimichi ? '観光名所' : '観光スポット');
      icon = spotData.icon || '🏛️';
    }

    const chosenDay = Number(targetDay) || 1;

    const newSpotItem = {
      id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: spotData.name || spotData.title,
      category: cat,
      categoryType: spotData.categoryType || (spotData.sourceType === 'gourmet' ? 'restaurant' : 'sightseeing'),
      icon: icon,
      lat: spotData.lat,
      lng: spotData.lng,
      imageUrl: spotData.imageUrl || null,
      imageSource: spotData.imageSource || null,
      time: '11:00',
      stayMin: spotData.defaultStay || (isYorimichi ? 45 : 60),
      memo: spotData.tag || spotData.desc || spotData.extract || '',
      day: chosenDay,
    };
    onAddSpotToTrip(newSpotItem);

    setAddedToast(
      `「${spotData.name || spotData.title}」を${stayDays > 1 ? `${chosenDay}日目の` : ''}しおりに追加しました！`
    );
    setTimeout(() => setAddedToast(null), 2500);
  };

  // APIキーの保存
  const handleSaveApiKeys = (e) => {
    e.preventDefault();
    saveExternalApiKeys(apiKeys);
    setApiKeySavedMsg(true);
    setTimeout(() => {
      setApiKeySavedMsg(false);
      setShowApiKeyModal(false);
    }, 1200);
  };

  const styleMeta = styleInfo(selectedSpot?.style || 'drive');

  return (
    <div className="search-tab-page">
      {/* PC版向け ウェルカムガイドバナー（大画面で質素にならないよう常時表示、スマホではCSSで非表示） */}
      <section className="botanical-hero-card welcome-travel-hero desktop-only-guide">
        <div className="hero-text">
          <span className="leaf-badge">
            <Icon name="compass" size={15} /> 日本を旅しよう！
          </span>
          <h2>ワクワクする旅の計画をはじめよう</h2>
          <p className="hero-desc">
            行きたい場所を検索してしおりに追加するだけ。周辺のカフェや持ち物チェックも丸ごとおまかせ！
          </p>
        </div>

        {/* 3ステップガイド */}
        <div className="travel-three-steps-row">
          <div className="step-guide-card">
            <div className="step-guide-badge">Step 1</div>
            <div className="step-guide-icon-box">🔍</div>
            <div className="step-guide-info">
              <strong className="step-guide-title">行きたい場所を検索</strong>
              <p className="step-guide-desc">観光地やお店、GoogleマップのURLもそのまま貼るだけ！</p>
            </div>
          </div>
          <div className="step-guide-arrow">➔</div>
          <div className="step-guide-card">
            <div className="step-guide-badge">Step 2</div>
            <div className="step-guide-icon-box">📖</div>
            <div className="step-guide-info">
              <strong className="step-guide-title">しおりに追加</strong>
              <p className="step-guide-desc">日程や周辺の寄り道スポット（カフェ・宿）をカンタン整理</p>
            </div>
          </div>
          <div className="step-guide-arrow">➔</div>
          <div className="step-guide-card">
            <div className="step-guide-badge">Step 3</div>
            <div className="step-guide-icon-box">🎒</div>
            <div className="step-guide-info">
              <strong className="step-guide-title">持ち物をそろえてGO!</strong>
              <p className="step-guide-desc">現地の気温に合わせた服装チェックや割り勘計算もスムーズ</p>
            </div>
          </div>
        </div>
      </section>

      {/* 泊数が2日以上の場合は、しおり追加先の対象日（何日目か）を切り替えられるバーを表示 */}
      {stayDays > 1 && (
        <section className="card search-target-day-bar-card">
          <div className="search-target-day-bar-inner">
            <div className="target-day-label-group">
              <span className="target-day-icon">📅</span>
              <div className="target-day-titles">
                <span className="target-day-sub">追加先の日程</span>
                <strong className="target-day-main">Day {targetDay}（{targetDay}日目）にしおり登録中</strong>
              </div>
            </div>

            <div className="target-day-pills-list">
              {Array.from({ length: stayDays }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`target-day-pill-btn ${targetDay === d ? 'is-active' : ''}`}
                  onClick={() => onSetTargetDay?.(d)}
                >
                  📅 {d}日目 (Day {d})
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 検索入力フォーム */}
      <section className="card card-search-form">
        <div className="card-header-clean">
          <div className="header-icon-title">
            <Icon name="search" size={18} />
            <h3>全国のスポットを検索する</h3>
          </div>
          <span className="count-pill">スポット名・GoogleマップURL両対応</span>
        </div>

        <form onSubmit={handleExecuteSearch} className="search-input-form-row">
          <div className="search-input-wrapper" ref={searchContainerRef}>
            <div className="search-input-box">
              <Icon name="search" size={18} className="search-icon-inside" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="例: 白馬、草津温泉、またはGoogleマップのURLを貼り付け…"
                className="search-text-input"
                autoComplete="off"
              />
              {keyword && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => {
                    setKeyword('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setSelectedSpot(null);
                    setOnlineResults([]);
                    setHasSearched(false);
                  }}
                  aria-label="検索クリア"
                >
                  <Icon name="x" size={15} />
                </button>
              )}
            </div>

            {/* リアルタイム検索候補ドロップダウン */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="search-suggestions-dropdown" role="listbox">
                {suggestions.map((item, idx) => (
                  <li
                    key={idx}
                    className="suggestion-item"
                    onClick={() => handleSelectSuggestion(item)}
                    role="option"
                    aria-selected="false"
                  >
                    <span className="suggestion-pin">{item.isGmaps ? '🔗' : '📍'}</span>
                    <div className="suggestion-main-info">
                      <strong className="suggestion-name">
                        {item.displayName || item.name}
                      </strong>
                      {item.region && (
                        <span className="suggestion-region">{item.region}</span>
                      )}
                    </div>
                    {item.category && (
                      <span className="suggestion-category-tag">{item.category}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-sage"
            disabled={isSearchingOnline || !keyword.trim()}
          >
            {isSearchingOnline ? (
              <>検索中…</>
            ) : (
              <>
                <Icon name="search" size={16} /> 検索する
              </>
            )}
          </button>
        </form>
      </section>

      {/* オンライン検索結果一覧（検索実行時に表示） */}
      {hasSearched && (
        <section className="card online-results-section">
          <div className="card-header-clean">
            <div className="header-icon-title">
              <Icon name="sparkle" size={18} />
              <h3>「{keyword}」の検索結果（{onlineResults.length}件）</h3>
            </div>
            <span className="badge badge-sage">高画質写真・解説付き</span>
          </div>

          {/* カテゴリフィルターピル */}
          <div className="filter-pill-bar">
            <button
              type="button"
              className={`filter-pill-btn ${searchCategoryFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setSearchCategoryFilter('all')}
            >
              すべて ({searchCategoryCounts.all})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${searchCategoryFilter === 'sightseeing' ? 'is-active' : ''}`}
              onClick={() => setSearchCategoryFilter('sightseeing')}
            >
              🏛️ 観光地 ({searchCategoryCounts.sightseeing})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${searchCategoryFilter === 'restaurant' ? 'is-active' : ''}`}
              onClick={() => setSearchCategoryFilter('restaurant')}
            >
              🍴 レストラン ({searchCategoryCounts.restaurant})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${searchCategoryFilter === 'cafe' ? 'is-active' : ''}`}
              onClick={() => setSearchCategoryFilter('cafe')}
            >
              ☕ カフェ ({searchCategoryCounts.cafe})
            </button>
          </div>

          {isSearchingOnline ? (
            <div className="searching-loading-box">
              <div className="botanical-spinner" />
              <p>日本全国の観光スポット・飲食店・高解像度写真と解説を取得しています…</p>
            </div>
          ) : filteredOnlineResults.length === 0 ? (
            <div className="empty-results-box">
              <p>このカテゴリに該当するスポットはありませんでした。「すべて」タブまたは別のキーワードをお試しください。</p>
            </div>
          ) : (
            <div className="online-results-grid">
              {filteredOnlineResults.map((item) => {
                const isCafe = item.categoryType === 'cafe';
                const isRestaurant = item.categoryType === 'restaurant';
                const catBadgeClass = isCafe ? 'badge-cafe' : isRestaurant ? 'badge-restaurant' : 'badge-sightseeing';
                const catBadgeLabel = isCafe ? '☕ カフェ' : isRestaurant ? '🍴 グルメ' : '🏛️ 観光地';

                return (
                  <div
                    key={item.id}
                    className={`result-mini-card ${selectedSpot?.id === item.id ? 'is-selected' : ''}`}
                    onClick={() => setSelectedSpot(item)}
                  >
                    <SpotImage
                      src={item.imageUrl}
                      alt={item.title}
                      source={item.imageSource}
                      title={item.title}
                      desc={item.extract}
                      aspectRatio="16/10"
                      className="result-card-img"
                    />
                    <div className="result-card-body">
                      <div className="result-card-title-row">
                        <div className="result-card-badges-flex">
                          <span className={`cat-mini-badge ${catBadgeClass}`}>
                            {catBadgeLabel}
                          </span>
                          {item.region && (
                            <span className="result-card-region-badge">
                              📍 {item.region}
                            </span>
                          )}
                        </div>
                        <strong className="result-card-title">{item.title}</strong>
                      </div>
                      <p className="result-card-desc">{item.extract}</p>
                      <button
                        type="button"
                        className="btn btn-sage-soft btn-xs btn-block"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddSpot(item, false);
                        }}
                      >
                        <Icon name="plus" size={13} /> {stayDays > 1 ? `${targetDay}日目に追加` : 'しおりに追加'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* スポット詳細 ＆ 寄り道提案（2カラム） */}
      {selectedSpot && (
        <div className="spot-detail-grid">
          {/* メインスポットプレビューカード */}
          <section className="card main-spot-card">
            {/* 写真エリア（高画質写真 ＋ ボタニカル水彩フォールバック） */}
            <SpotImage
              key={selectedSpot.id || selectedSpot.imageUrl || selectedSpot.title}
              src={selectedSpot.imageUrl}
              alt={selectedSpot.name || selectedSpot.title}
              source={selectedSpot.imageSource}
              title={selectedSpot.name || selectedSpot.title}
              desc={selectedSpot.desc || selectedSpot.extract}
              aspectRatio="16/9"
              className="spot-hero-photo"
            />

            <div className="spot-card-badge-row">
              <span className="spot-area-tag">
                {selectedSpot.area || (selectedSpot.hasRealCoord ? '位置情報あり' : '全国スポット')}
              </span>
              <span className="spot-style-tag">
                {styleMeta.icon} {styleMeta.label}
              </span>
            </div>

            <h3 className="spot-card-title">
              {selectedSpot.name || selectedSpot.title}
            </h3>
            <p className="spot-card-subtag">
              {selectedSpot.tag || selectedSpot.theme?.label || '観光名所'}
            </p>
            <p className="spot-card-desc">
              {selectedSpot.desc || selectedSpot.extract}
            </p>

            {/* 気候・位置メモ */}
            <div className="spot-climate-box">
              <div className="climate-item">
                <span className="climate-label">
                  <Icon name="mapPin" size={14} /> 座標
                </span>
                <span className="climate-value">
                  北緯 {Math.round((selectedSpot.lat || 35.68) * 100) / 100}° / 東経 {Math.round((selectedSpot.lng || 139.76) * 100) / 100}°
                </span>
              </div>
              {selectedSpot.elevation && (
                <div className="climate-item">
                  <span className="climate-label">
                    <Icon name="leaf" size={14} /> 環境
                  </span>
                  <span className="climate-value">{selectedSpot.elevation}</span>
                </div>
              )}
              {selectedSpot.climateMemo && (
                <p className="climate-memo">
                  🌿 <strong>気候・服装メモ:</strong> {selectedSpot.climateMemo}
                </p>
              )}
            </div>

            <div className="spot-card-actions">
              <button
                type="button"
                className="btn btn-sage btn-block"
                onClick={() => handleAddSpot(selectedSpot, false)}
              >
                <Icon name="plus" size={16} /> {stayDays > 1 ? `この場所を${targetDay}日目に追加する` : 'この場所をしおりに追加する'}
              </button>

              <a
                href={getGoogleMapsSearchUrl(
                  selectedSpot.name || selectedSpot.title,
                  selectedSpot.lat,
                  selectedSpot.lng
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                <Icon name="external" size={14} /> Googleマップで確認
              </a>
            </div>
          </section>

          {/* 周辺寄り道スポット自動提案（Wikipedia名所 ＋ ホットペッパーグルメ） */}
          <section className="card yorimichi-section-card">
            <div className="card-header-clean">
              <div className="header-icon-title">
                <Icon name="coffee" size={18} />
                <div>
                  <h3>周辺の寄り道スポット</h3>
                  <p className="sub-text">
                    「{selectedSpot.name || selectedSpot.title}」周辺の観光名所＆おすすめグルメ（最大6件）
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isYorimichiLoading && (
                  <span style={{ fontSize: '0.78rem', color: '#667085' }}>
                    🔍 周辺を検索中…
                  </span>
                )}
                <span className="badge badge-sage">{filteredYorimichi.length}件を表示</span>
              </div>
            </div>

            {/* 付近の寄り道カテゴリフィルターピル */}
            <div className="filter-pill-bar yorimichi-filter-bar">
              <button
                type="button"
                className={`filter-pill-btn ${yorimichiCategoryFilter === 'all' ? 'is-active' : ''}`}
                onClick={() => setYorimichiCategoryFilter('all')}
              >
                すべて ({Math.min(yorimichiCategoryCounts.all, 6)})
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${yorimichiCategoryFilter === 'sightseeing' ? 'is-active' : ''}`}
                onClick={() => setYorimichiCategoryFilter('sightseeing')}
              >
                🏛️ 観光地 ({Math.min(yorimichiCategoryCounts.sightseeing, 6)})
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${yorimichiCategoryFilter === 'restaurant' ? 'is-active' : ''}`}
                onClick={() => setYorimichiCategoryFilter('restaurant')}
              >
                🍴 レストラン ({Math.min(yorimichiCategoryCounts.restaurant, 6)})
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${yorimichiCategoryFilter === 'cafe' ? 'is-active' : ''}`}
                onClick={() => setYorimichiCategoryFilter('cafe')}
              >
                ☕ カフェ ({Math.min(yorimichiCategoryCounts.cafe, 6)})
              </button>
            </div>

            {nearbyYorimichi.length === 0 ? (
              <div className="empty-yorimichi">
                <Icon name="compass" size={24} />
                <p>
                  このスポット周辺の寄り道候補を検索中、または登録がありません。
                  「直接追加」から自由にお店やカフェを追加できます！
                </p>
              </div>
            ) : filteredYorimichi.length === 0 ? (
              <div className="empty-yorimichi">
                <Icon name="coffee" size={24} />
                <p>
                  このカテゴリ（{yorimichiCategoryFilter === 'cafe' ? 'カフェ' : yorimichiCategoryFilter === 'restaurant' ? 'レストラン' : '観光地'}）の候補地は周辺に見つかりませんでした。
                  「すべて」タブまたは「直接追加」をお試しください。
                </p>
              </div>
            ) : (
              <div className="yorimichi-list">
                {filteredYorimichi.map((yori) => {
                  const isExpanded = expandedYorimichiId === yori.id;
                  return (
                    <div
                      key={yori.id}
                      className={`yorimichi-item-card ${isExpanded ? 'is-expanded' : ''}`}
                      onClick={() => setExpandedYorimichiId(isExpanded ? null : yori.id)}
                    >
                      {/* 通常時ヘッダー: すっきりした小アイコン ＋ タイトル ＋ 距離 ＋ 開閉アイコン */}
                      <div className="yorimichi-head">
                        <span className="yorimichi-icon">{yori.icon}</span>
                        <div className="yorimichi-info">
                          <div className="yorimichi-title-row">
                            <strong className="yorimichi-name">{yori.name}</strong>
                            {yori.distanceKm ? (
                              <span className="dist-pill">約{yori.distanceKm} km</span>
                            ) : null}
                          </div>
                          <span className="yorimichi-cat-tag">
                            {yori.category} {yori.tag ? `・ ${yori.tag}` : ''}
                          </span>
                        </div>
                        <span className="yorimichi-expand-toggle" aria-label={isExpanded ? '詳細を閉じる' : '詳細を見る'}>
                          <Icon name={isExpanded ? 'chevronUp' : 'chevronDown'} size={18} />
                        </span>
                      </div>

                      {/* 拡大展開エリア: クリックすると四角が広がり、写真と説明が美しく表示される！ */}
                      {isExpanded ? (
                        <div
                          className="yorimichi-expanded-body"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SpotImage
                            key={yori.id || yori.imageUrl || yori.name}
                            src={yori.imageUrl}
                            alt={yori.name}
                            title={yori.name}
                            desc={yori.desc}
                            aspectRatio="16/9"
                            className="yorimichi-expanded-photo"
                          />

                          <p className="yorimichi-expanded-desc">{yori.desc}</p>

                          <div className="yorimichi-expanded-bottom">
                            <span className="stay-estimate">
                              <Icon name="clock" size={13} /> 目安滞在: 約{yori.defaultStay}分
                            </span>
                            <div className="yorimichi-action-btns">
                              {yori.detailUrl && (
                                <a
                                  href={yori.detailUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-outline btn-xs"
                                >
                                  <Icon name="external" size={12} /> {yori.sourceType === 'gourmet' ? 'お店情報' : '詳細'}
                                </a>
                              )}
                              <a
                                href={getGoogleMapsSearchUrl(yori.name, yori.lat, yori.lng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline btn-xs"
                              >
                                <Icon name="external" size={12} /> 地図
                              </a>
                              <button
                                type="button"
                                className="btn btn-terracotta-soft btn-sm"
                                onClick={() => handleAddSpot(yori, true)}
                              >
                                <Icon name="plus" size={14} /> {stayDays > 1 ? `${targetDay}日目に追加` : 'しおりに追加'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* 未展開時の簡易アクション */
                        <div className="yorimichi-collapsed-bottom" onClick={(e) => e.stopPropagation()}>
                          <span className="stay-estimate">
                            <Icon name="clock" size={12} /> 目安: 約{yori.defaultStay}分
                          </span>
                          <button
                            type="button"
                            className="btn btn-terracotta-soft btn-xs"
                            onClick={() => handleAddSpot(yori, true)}
                          >
                            <Icon name="plus" size={12} /> {stayDays > 1 ? `${targetDay}日目に追加` : 'しおりに追加'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 検索前＆未選択時の初期ガイド案内カード */}
      {!hasSearched && !selectedSpot && (
        <section className="search-initial-guide-card">
          <div className="initial-guide-icon-box">🗺️</div>
          <div className="initial-guide-text-content">
            <h4>行きたい観光地やお店を検索してみよう！</h4>
            <p>
              上の検索バーに「草津温泉」「嵐山」「東京タワー」などの地名や、<br />
              Googleマップの共有リンクを貼り付けて検索すると、詳しい情報や周辺の寄り道スポットが見つかります。
            </p>
          </div>
        </section>
      )}

      {/* 外部API設定ボタン（控えめに最下部に配置） */}
      <div className="search-footer-settings-row">
        <button
          type="button"
          className="api-settings-link-btn"
          onClick={() => setShowApiKeyModal(true)}
        >
          ⚙️ 外部API設定（ホットペッパー・じゃらん・楽天）
        </button>
      </div>

      {/* APIキー設定モーダル */}
      {showApiKeyModal && (
        <div className="modal-backdrop" onClick={() => setShowApiKeyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>外部API設定（ホットペッパー・楽天）</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowApiKeyModal(false)}
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <p className="modal-desc-text">
              周辺の寄り道グルメ取得に<strong>ホットペッパーグルメAPI</strong>、写真の穴埋めに<strong>楽天トラベルAPI</strong>を利用しています（どちらも無料・クレカ不要）。
            </p>

            <form onSubmit={handleSaveApiKeys} className="modal-form">
              <label className="field-block">
                <span className="field-label">ホットペッパーグルメ APIキー</span>
                <input
                  type="text"
                  value={apiKeys.hotpepperKey || ''}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, hotpepperKey: e.target.value.trim() })
                  }
                  placeholder="例: 940f835bee45d662"
                />
              </label>

              <label className="field-block">
                <span className="field-label">楽天トラベル アプリID (applicationId)</span>
                <input
                  type="text"
                  value={apiKeys.rakutenId}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, rakutenId: e.target.value.trim() })
                  }
                  placeholder="例: 74e20a2f-7465-4c98-86e6-6f75788ba853"
                />
              </label>

              <label className="field-block">
                <span className="field-label">楽天トラベル アクセスキー (accessKey)</span>
                <input
                  type="text"
                  value={apiKeys.rakutenKey || ''}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, rakutenKey: e.target.value.trim() })
                  }
                  placeholder="例: pk_yTV1Up1or1M35FIq88Rb..."
                />
              </label>

              <label className="field-block">
                <span className="field-label">じゃらんWebサービス APIキー</span>
                <input
                  type="text"
                  value={apiKeys.jalanKey}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, jalanKey: e.target.value.trim() })
                  }
                  placeholder="例: rec_abc123..."
                />
              </label>

              {apiKeySavedMsg && (
                <p className="form-success-text">
                  <Icon name="check" size={15} /> 設定を保存しました！
                </p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowApiKeyModal(false)}
                >
                  閉じる
                </button>
                <button type="submit" className="btn btn-sage">
                  設定を保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* フローティング追加通知 */}
      {addedToast && (
        <div className="app-toast-alert" role="status">
          <Icon name="check" size={16} />
          <span>{addedToast}</span>
          <button
            type="button"
            className="toast-action-btn"
            onClick={onSwitchToShioriTab}
          >
            しおりを見る →
          </button>
        </div>
      )}
    </div>
  );
}
