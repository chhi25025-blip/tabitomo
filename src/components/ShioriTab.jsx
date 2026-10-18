import React, { useState, useMemo } from 'react';
import Icon from './Icon';
import MapRoute from './MapRoute';
import SpotImage from './SpotImage';
import {
  getGoogleMapsNavUrl,
  formatDate,
  getDayDateString,
  getGoogleMapsDirectionsUrl,
  addMinutesToTimeString,
  TRANSIT_MODES,
} from '../utils';
import { TRIP_STYLES, styleInfo } from '../travelData';

import { resolveGoogleMapsSpot, isGoogleMapsUrl } from '../api/spotSearchApi';

const START_PRESETS = [
  { name: '自宅（マイカー・出発）', lat: 35.6812, lng: 139.7671 },
  { name: '東京駅（八重洲口）', lat: 35.6812, lng: 139.7671 },
  { name: '新宿駅（西口）', lat: 35.6896, lng: 139.7006 },
  { name: '横浜駅（西口）', lat: 35.4658, lng: 139.6227 },
  { name: '大宮駅（西口）', lat: 35.9063, lng: 139.6240 },
  { name: '海老名SA（東名高速）', lat: 35.4419, lng: 139.3908 },
  { name: '名古屋駅', lat: 35.1709, lng: 136.8815 },
  { name: '京都駅', lat: 34.9858, lng: 135.7588 },
];

export default function ShioriTab({
  trips,
  activeTripId,
  onSelectTrip,
  onCreateTrip,
  onDeleteTrip,
  onUpdateTripMeta,
  onUpdateItinerary,
  onSwitchToSearchTab,
}) {
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [showAddSpotModal, setShowAddSpotModal] = useState(false);
  const [isEditingStart, setIsEditingStart] = useState(false);

  // 日程フィルタータブ（'all' または 1, 2, 3...）
  const [selectedDayTab, setSelectedDayTab] = useState('all');

  const [customSpotName, setCustomSpotName] = useState('');
  const [customSpotGmapsUrl, setCustomSpotGmapsUrl] = useState('');
  const [customSpotLat, setCustomSpotLat] = useState(null);
  const [customSpotLng, setCustomSpotLng] = useState(null);
  const [customSpotImageUrl, setCustomSpotImageUrl] = useState(null);
  const [isResolvingGmapsUrl, setIsResolvingGmapsUrl] = useState(false);
  const [gmapsResolvedMsg, setGmapsResolvedMsg] = useState('');

  const [customSpotTime, setCustomSpotTime] = useState('11:00');
  const [customSpotStay, setCustomSpotStay] = useState(45);
  const [customSpotMemo, setCustomSpotMemo] = useState('');
  const [customSpotDay, setCustomSpotDay] = useState(1);

  const currentTrip =
    (trips && trips.find((t) => t.id === activeTripId)) ||
    (trips && trips[0]) || {
      id: 'default-trip',
      title: '旅のしおり',
      date: '2026-10-18',
      stayDays: 2,
      startPoint: { name: '自宅・出発地', time: '08:30', memo: '集合・出発' },
      style: 'drive',
      memo: '',
      itinerary: [],
    };

  // 旅行タイトル等の編集用ローカルステート
  const [editTitle, setEditTitle] = useState(currentTrip?.title || '');
  const [editDate, setEditDate] = useState(currentTrip?.date || '');
  const [editStayDays, setEditStayDays] = useState(currentTrip?.stayDays || 2);
  const [editStyle, setEditStyle] = useState(currentTrip?.style || 'drive');
  const [editMemo, setEditMemo] = useState(currentTrip?.memo || '');

  // 出発地編集用ステート
  const [startName, setStartName] = useState(currentTrip?.startPoint?.name || '自宅・出発地');
  const [startTime, setStartTime] = useState(currentTrip?.startPoint?.time || '08:30');
  const [startMemo, setStartMemo] = useState(currentTrip?.startPoint?.memo || '');
  const [startGmapsUrl, setStartGmapsUrl] = useState('');
  const [startLat, setStartLat] = useState(currentTrip?.startPoint?.lat ?? 35.6812);
  const [startLng, setStartLng] = useState(currentTrip?.startPoint?.lng ?? 139.7671);
  const [isResolvingStartGmaps, setIsResolvingStartGmaps] = useState(false);
  const [startGmapsResolvedMsg, setStartGmapsResolvedMsg] = useState('');

  // 出発地のGoogleマップURL解決ハンドラ
  const handleResolveStartGmapsUrl = async (urlToResolve) => {
    const trimmed = (urlToResolve || startGmapsUrl).trim();
    if (!trimmed) return;
    setIsResolvingStartGmaps(true);
    setStartGmapsResolvedMsg('');

    try {
      const spotInfo = await resolveGoogleMapsSpot(trimmed);
      if (spotInfo) {
        if (spotInfo.name) setStartName(spotInfo.name);
        if (spotInfo.lat) setStartLat(spotInfo.lat);
        if (spotInfo.lng) setStartLng(spotInfo.lng);
        if (spotInfo.extract && !startMemo) {
          setStartMemo(spotInfo.extract.slice(0, 100));
        }
        setStartGmapsResolvedMsg(`✨ Googleマップから「${spotInfo.name}」を読み込みました！`);
        setTimeout(() => setStartGmapsResolvedMsg(''), 4500);
      }
    } catch (err) {
      console.warn('Failed to resolve start gmaps url:', err);
      setStartGmapsResolvedMsg('⚠️ Googleマップ情報の取得に失敗しました。URLをご確認ください');
      setTimeout(() => setStartGmapsResolvedMsg(''), 4000);
    } finally {
      setIsResolvingStartGmaps(false);
    }
  };

  // 旅行切り替え時に編集フォーム同期
  const handleSelectTrip = (id) => {
    onSelectTrip(id);
    const target = trips.find((t) => t.id === id);
    if (target) {
      setEditTitle(target.title);
      setEditDate(target.date);
      setEditStayDays(target.stayDays || 2);
      setEditStyle(target.style || 'drive');
      setEditMemo(target.memo || '');
      setStartName(target.startPoint?.name || '自宅・出発地');
      setStartTime(target.startPoint?.time || '08:30');
      setStartMemo(target.startPoint?.memo || '');
      setStartLat(target.startPoint?.lat ?? 35.6812);
      setStartLng(target.startPoint?.lng ?? 139.7671);
      setStartGmapsUrl('');
      setStartGmapsResolvedMsg('');
      setIsEditingMeta(false);
      setIsEditingStart(false);
    }
  };

  const handleSaveMeta = (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    onUpdateTripMeta(currentTrip.id, {
      title: editTitle.trim(),
      date: editDate,
      stayDays: Number(editStayDays) || 2,
      style: editStyle,
      memo: editMemo.trim(),
    });
    setIsEditingMeta(false);
  };

  const handleSaveStartPoint = (e) => {
    e.preventDefault();
    const preset = START_PRESETS.find((p) => p.name === startName);
    const resolvedLat = startLat ?? (preset ? preset.lat : currentTrip?.startPoint?.lat || 35.6812);
    const resolvedLng = startLng ?? (preset ? preset.lng : currentTrip?.startPoint?.lng || 139.7671);
    onUpdateTripMeta(currentTrip.id, {
      startPoint: {
        name: startName.trim(),
        time: startTime,
        memo: startMemo.trim(),
        lat: resolvedLat,
        lng: resolvedLng,
      },
    });
    setIsEditingStart(false);
  };

  // スポットの並べ替え（同じ日の中での上下移動）
  const handleMoveSpotInDay = (spotId, direction) => {
    const list = [...(currentTrip?.itinerary || [])];
    const spotIdx = list.findIndex((s) => s.id === spotId);
    if (spotIdx === -1) return;
    const spotDay = list[spotIdx].day || 1;

    // 同じ日のスポットのインデックスを抽出
    const sameDayIndices = [];
    list.forEach((s, idx) => {
      if ((s.day || 1) === spotDay) {
        sameDayIndices.push(idx);
      }
    });

    const posInSameDay = sameDayIndices.indexOf(spotIdx);
    const targetPos = posInSameDay + direction;
    if (targetPos < 0 || targetPos >= sameDayIndices.length) return;

    const targetIdx = sameDayIndices[targetPos];
    const temp = list[spotIdx];
    list[spotIdx] = list[targetIdx];
    list[targetIdx] = temp;
    onUpdateItinerary(currentTrip.id, list);
  };

  // スポットの削除
  const handleDeleteSpot = (spotId) => {
    const list = (currentTrip?.itinerary || []).filter((s) => s.id !== spotId);
    onUpdateItinerary(currentTrip.id, list);
  };

  // スポットの時間やメモ、所属日（何日目）の即時編集
  const handleSpotFieldChange = (spotId, field, value) => {
    const list = (currentTrip?.itinerary || []).map((s) =>
      s.id === spotId ? { ...s, [field]: value } : s
    );
    onUpdateItinerary(currentTrip.id, list);
  };

  // 区間の移動手段・所要時間を更新し、車・徒歩などの場合は該当スポットの到着時間を自動計算
  const handleTransitChange = (spotId, newMode, newMinutes, autoRecalcArrival = true) => {
    const list = [...(currentTrip?.itinerary || [])];
    const spotIdx = list.findIndex((s) => s.id === spotId);
    if (spotIdx === -1) return;

    const targetSpot = list[spotIdx];
    const updatedSpot = { ...targetSpot };

    if (newMode !== undefined) {
      updatedSpot.transitMode = newMode;
    }
    if (newMinutes !== undefined) {
      updatedSpot.transitMin = newMinutes === '' ? '' : Number(newMinutes);
    }

    const currentModeDef =
      TRANSIT_MODES.find((m) => m.id === (updatedSpot.transitMode || 'car')) ||
      TRANSIT_MODES[0];

    // 車・徒歩・タクシーなど（hasDurationInput === true）で、所要時間が入力されている場合
    if (
      autoRecalcArrival &&
      currentModeDef.hasDurationInput &&
      updatedSpot.transitMin !== '' &&
      !isNaN(updatedSpot.transitMin)
    ) {
      let prevDepartureTime = '08:30';
      const targetDay = targetSpot.day || 1;

      // 同じ日の直前のスポットを検索
      let prevSpotInDay = null;
      for (let i = spotIdx - 1; i >= 0; i--) {
        if ((list[i].day || 1) === targetDay) {
          prevSpotInDay = list[i];
          break;
        }
      }

      if (prevSpotInDay) {
        // 前のスポットの出発時刻 = 到着時間 + 滞在時間
        prevDepartureTime = addMinutesToTimeString(
          prevSpotInDay.time || '10:00',
          prevSpotInDay.stayMin || 60
        );
      } else if (targetDay === 1) {
        // 1日目の先頭スポットは出発地の出発時間
        prevDepartureTime = currentTrip?.startPoint?.time || '08:30';
      } else {
        // 2日目以降の先頭スポットは朝9時基準
        prevDepartureTime = '09:00';
      }

      // 新しい到着時刻 = 直前の出発時刻 + 移動所要時間
      updatedSpot.time = addMinutesToTimeString(prevDepartureTime, updatedSpot.transitMin);
    }

    list[spotIdx] = updatedSpot;
    onUpdateItinerary(currentTrip.id, list);
  };

  // GoogleマップURLの解決ハンドラ
  const handleResolveGmapsUrl = async (urlToResolve) => {
    const trimmed = (urlToResolve || customSpotGmapsUrl).trim();
    if (!trimmed) return;
    setIsResolvingGmapsUrl(true);
    setGmapsResolvedMsg('');

    try {
      const spotInfo = await resolveGoogleMapsSpot(trimmed);
      if (spotInfo) {
        if (spotInfo.name) setCustomSpotName(spotInfo.name);
        if (spotInfo.lat) setCustomSpotLat(spotInfo.lat);
        if (spotInfo.lng) setCustomSpotLng(spotInfo.lng);
        if (spotInfo.imageUrl) setCustomSpotImageUrl(spotInfo.imageUrl);
        if (spotInfo.extract && !customSpotMemo) {
          setCustomSpotMemo(spotInfo.extract.slice(0, 100));
        }
        setGmapsResolvedMsg(`✨ Googleマップから「${spotInfo.name}」を読み込みました！`);
        setTimeout(() => setGmapsResolvedMsg(''), 4500);
      } else {
        setGmapsResolvedMsg('⚠️ 場所を特定できませんでした。店名を手動で入力してください。');
        setTimeout(() => setGmapsResolvedMsg(''), 4500);
      }
    } catch (err) {
      console.warn('Failed to resolve Google Maps URL:', err);
      setGmapsResolvedMsg('⚠️ 読み込みに失敗しました。店名を手動で入力してください。');
      setTimeout(() => setGmapsResolvedMsg(''), 4500);
    } finally {
      setIsResolvingGmapsUrl(false);
    }
  };

  // 手動でカスタムスポット追加
  const handleAddCustomSpot = (e) => {
    e.preventDefault();
    if (!customSpotName.trim()) return;

    // 既存スポットの緯度経度から少しずらすか、デフォルト設定
    const baseLat = currentTrip?.itinerary?.[0]?.lat || 35.2332;
    const baseLng = currentTrip?.itinerary?.[0]?.lng || 139.1038;

    const newSpot = {
      id: `spot-custom-${Date.now()}`,
      name: customSpotName.trim(),
      category: customSpotGmapsUrl ? 'Googleマップ' : '立ち寄り',
      icon: '📍',
      lat: customSpotLat || baseLat + (Math.random() - 0.5) * 0.04,
      lng: customSpotLng || baseLng + (Math.random() - 0.5) * 0.04,
      imageUrl: customSpotImageUrl || null,
      time: customSpotTime || '12:00',
      stayMin: Number(customSpotStay) || 45,
      memo: customSpotMemo.trim(),
      day: Number(customSpotDay) || 1,
      googleMapsUrl: customSpotGmapsUrl.trim() || null,
    };

    const nextList = [...(currentTrip?.itinerary || []), newSpot];
    onUpdateItinerary(currentTrip.id, nextList);

    setCustomSpotName('');
    setCustomSpotGmapsUrl('');
    setCustomSpotLat(null);
    setCustomSpotLng(null);
    setCustomSpotImageUrl(null);
    setCustomSpotMemo('');
    setGmapsResolvedMsg('');
    setShowAddSpotModal(false);
  };

  const styleMeta = styleInfo(currentTrip?.style);
  const itinerary = currentTrip?.itinerary || [];

  // 旅行の総日数
  const stayDays = Math.max(1, currentTrip?.stayDays || 1);
  const daysArray = Array.from({ length: stayDays }, (_, i) => i + 1);

  // 表示対象の日程
  const displayedDays = selectedDayTab === 'all' ? daysArray : [Number(selectedDayTab)];

  return (
    <div className="shiori-tab-page">
      {/* 旅行切り替えセレクター ＆ 新規作成バー */}
      <section className="card card-trip-switcher">
        <div className="switcher-top">
          <div className="switcher-title">
            <Icon name="book" size={18} />
            <span>旅行のしおり</span>
            <span className="badge badge-sage sm">最大5件（現在: {trips.length}/5）</span>
          </div>

          {trips.length < 5 && (
            <button
              type="button"
              className="btn btn-terracotta btn-sm"
              onClick={onCreateTrip}
            >
              <Icon name="plus" size={14} /> 新しい旅行を作成
            </button>
          )}
        </div>

        <div className="trip-tabs-scroll">
          {trips.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`trip-tab-pill ${t.id === currentTrip?.id ? 'is-active' : ''}`}
              onClick={() => handleSelectTrip(t.id)}
            >
              <span className="tab-pill-icon">{styleInfo(t.style).icon}</span>
              <span className="tab-pill-title">{t.title}</span>
              <span className="tab-pill-date">{t.date ? t.date.slice(5) : ''}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 現在の旅行のヘッダー・概要カード */}
      <section className="card trip-header-card">
        {!isEditingMeta ? (
          <div className="trip-info-view">
            <div className="trip-info-head">
              <div className="trip-info-main">
                <span className="trip-style-tag">
                  {styleMeta.icon} {styleMeta.label}
                </span>
                <h2 className="trip-title-large">{currentTrip?.title || '旅のしおり'}</h2>
                <p className="trip-date-text">
                  <Icon name="calendar" size={14} /> {formatDate(currentTrip?.date)}
                </p>
                {currentTrip?.memo && (
                  <p className="trip-memo-text">{currentTrip.memo}</p>
                )}
              </div>

              <div className="trip-meta-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setEditTitle(currentTrip?.title || '');
                    setEditDate(currentTrip?.date || '');
                    setEditStyle(currentTrip?.style || 'drive');
                    setEditMemo(currentTrip?.memo || '');
                    setIsEditingMeta(true);
                  }}
                >
                  編集
                </button>

                {(trips || []).length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost-danger btn-sm"
                    onClick={() => onDeleteTrip(currentTrip?.id)}
                    title="この旅行を削除"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveMeta} className="trip-edit-form">
            <h3 className="edit-form-title">旅行の基本情報を編集</h3>
            <div className="form-row">
              <label className="field-block">
                <span className="field-label">旅行のタイトル</span>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="例: 秋の箱根ドライブ"
                  required
                />
              </label>

              <label className="field-block">
                <span className="field-label">出発日</span>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
              </label>

              <label className="field-block">
                <span className="field-label">日程・泊数</span>
                <select
                  value={editStayDays}
                  onChange={(e) => setEditStayDays(Number(e.target.value))}
                >
                  <option value={1}>日帰り（1日）</option>
                  <option value={2}>1泊2日</option>
                  <option value={3}>2泊3日</option>
                  <option value={4}>3泊4日</option>
                  <option value={5}>4泊5日</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label className="field-block">
                <span className="field-label">スタイル</span>
                <select
                  value={editStyle}
                  onChange={(e) => setEditStyle(e.target.value)}
                >
                  {TRIP_STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-block">
                <span className="field-label">メモ・合言葉</span>
                <input
                  type="text"
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  placeholder="旅のテーマや共有メモ"
                />
              </label>
            </div>

            <div className="form-actions-right">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsEditingMeta(false)}
              >
                キャンセル
              </button>
              <button type="submit" className="btn btn-sage btn-sm">
                保存する
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 全体ルートマップ（引きの俯瞰図、ピン＆点線ルート） */}
      <MapRoute
        itinerary={itinerary}
        startPoint={currentTrip?.startPoint}
        title={currentTrip?.title}
      />

      {/* タイムライン形式のしおり */}
      <section className="card timeline-section-card">
        <div className="card-header-clean">
          <div className="header-icon-title">
            <Icon name="clock" size={18} />
            <div>
              <h3>旅のタイムライン</h3>
              <p className="sub-text">
                時系列スケジュール（{itinerary.length}スポット / {stayDays}日間）
              </p>
            </div>
          </div>

          <div className="timeline-top-btns">
            <button
              type="button"
              className="btn btn-sage-soft btn-sm"
              onClick={() => onSwitchToSearchTab(selectedDayTab === 'all' ? 1 : Number(selectedDayTab))}
            >
              <Icon name="search" size={14} /> たびさがしから追加
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setCustomSpotDay(selectedDayTab === 'all' ? 1 : Number(selectedDayTab));
                setShowAddSpotModal(true);
              }}
            >
              <Icon name="plus" size={14} /> 直接追加
            </button>
          </div>
        </div>

        {/* 連泊時（stayDays > 1）の日程切り替えタブバー */}
        {stayDays > 1 && (
          <div className="filter-pill-bar timeline-day-tabs">
            <button
              type="button"
              className={`filter-pill-btn ${selectedDayTab === 'all' ? 'is-active' : ''}`}
              onClick={() => setSelectedDayTab('all')}
            >
              全日程を表示（{stayDays}日間）
            </button>
            {daysArray.map((dayNum) => {
              const count = itinerary.filter((s) => (s.day || 1) === dayNum).length;
              return (
                <button
                  key={dayNum}
                  type="button"
                  className={`filter-pill-btn ${selectedDayTab === dayNum ? 'is-active' : ''}`}
                  onClick={() => setSelectedDayTab(dayNum)}
                >
                  📅 {dayNum}日目 ({getDayDateString(currentTrip?.date, dayNum)}) [{count}件]
                </button>
              );
            })}
          </div>
        )}

        {itinerary.length === 0 ? (
          <div className="empty-itinerary">
            <div className="empty-itinerary-icon">🎒</div>
            <h4>まだ立ち寄りスポットが登録されていません</h4>
            <p>行きたい観光地やカフェ・ホテルを追加して、あなただけの旅のしおりを作りましょう！</p>
            <div className="empty-itinerary-actions">
              <button
                type="button"
                className="btn btn-sage"
                onClick={() => onSwitchToSearchTab(1)}
              >
                <Icon name="search" size={16} /> たびさがしから探す
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setCustomSpotDay(selectedDayTab === 'all' ? 1 : Number(selectedDayTab));
                  setShowAddSpotModal(true);
                }}
              >
                <Icon name="plus" size={16} /> スポットを直接追加
              </button>
            </div>
          </div>
        ) : (
          <div className="timeline-day-groups-container">
            {displayedDays.map((dayNum) => {
              const daySpots = itinerary.filter((s) => (s.day || 1) === dayNum);
              const isDay1 = dayNum === 1;

              return (
                <div key={dayNum} className="timeline-day-group">
                  {/* 日別セパレーター見出し（どこからが何日目かが一目で分かる！） */}
                  <div className="timeline-day-separator">
                    <div className="day-separator-badge">
                      <span className="day-badge-pill">Day {dayNum}</span>
                      <strong className="day-badge-title">
                        📅 {dayNum}日目 — {getDayDateString(currentTrip?.date, dayNum)}
                      </strong>
                      <span className="day-badge-count">
                        {isDay1 ? `${daySpots.length + 1}件（出発含む）` : `${daySpots.length}件`}
                      </span>
                    </div>
                    <div className="day-separator-line" />
                  </div>

                  {/* 1日目の先頭には出発地（スタート地点）ブロックを表示 */}
                  {isDay1 && (
                    <div className="timeline-startpoint-banner">
                      <div className="startpoint-badge-col">
                        <span className="startpoint-icon-badge">🏠</span>
                        <div className="startpoint-connector-line" />
                      </div>
                      <div className="startpoint-banner-body">
                        <div className="startpoint-info-left">
                          <div className="startpoint-title-line">
                            <span className="badge badge-sage sm">🏠 出発地（スタート）</span>
                            <strong className="startpoint-name-text">
                              {currentTrip?.startPoint?.name || '自宅・出発地'}
                            </strong>
                            <span className="startpoint-time-pill">
                              ⏰ {currentTrip?.startPoint?.time || '08:30'} 出発
                            </span>
                          </div>
                          {currentTrip?.startPoint?.memo && (
                            <p className="startpoint-memo-desc">
                              {currentTrip.startPoint.memo}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => {
                            setStartName(currentTrip?.startPoint?.name || '自宅（マイカー・出発）');
                            setStartTime(currentTrip?.startPoint?.time || '08:30');
                            setStartMemo(currentTrip?.startPoint?.memo || '');
                            setStartLat(currentTrip?.startPoint?.lat ?? 35.6812);
                            setStartLng(currentTrip?.startPoint?.lng ?? 139.7671);
                            setStartGmapsUrl('');
                            setStartGmapsResolvedMsg('');
                            setIsEditingStart(true);
                          }}
                        >
                          <Icon name="edit" size={13} /> 出発地を変更
                        </button>
                      </div>
                    </div>
                  )}

                  {/* その日のスポット一覧 */}
                  {daySpots.length === 0 ? (
                    <div className="day-empty-placeholder">
                      <p>✨ {dayNum}日目の予定はまだありません</p>
                      <div className="day-empty-actions">
                        <button
                          type="button"
                          className="btn btn-sage-soft btn-xs"
                          onClick={() => onSwitchToSearchTab(dayNum)}
                        >
                          <Icon name="search" size={13} /> たびさがしから追加
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => {
                            setCustomSpotDay(dayNum);
                            setShowAddSpotModal(true);
                          }}
                        >
                          <Icon name="plus" size={13} /> 直接追加
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="timeline-container">
                      {daySpots.map((spot, dayIdx) => {
                        const navUrl = getGoogleMapsNavUrl(spot.name, spot.lat, spot.lng);
                        const isFirstInDay = dayIdx === 0 && !isDay1;
                        const isLastInDay = dayIdx === daySpots.length - 1;

                        // 直前の地点情報（1日目の最初なら出発地、それ以降なら前のスポット）
                        const prevLoc =
                          dayIdx === 0
                            ? (isDay1 ? currentTrip?.startPoint : null)
                            : daySpots[dayIdx - 1];

                        const prevName = prevLoc
                          ? (prevLoc.name || (isDay1 && dayIdx === 0 ? '出発地' : '前のスポット'))
                          : null;

                        const prevDepTime =
                          dayIdx === 0
                            ? (isDay1 ? (currentTrip?.startPoint?.time || '08:30') : '09:00')
                            : addMinutesToTimeString(
                                daySpots[dayIdx - 1].time || '10:00',
                                daySpots[dayIdx - 1].stayMin || 60
                              );

                        const currentMode =
                          spot.transitMode || (currentTrip?.style === 'train' ? 'transit' : 'car');
                        const currentModeDef =
                          TRANSIT_MODES.find((m) => m.id === currentMode) || TRANSIT_MODES[0];
                        const transitRouteUrl = prevLoc
                          ? getGoogleMapsDirectionsUrl(prevLoc, spot, currentModeDef.gmode)
                          : null;

                        // 所要時間を「時間」と「分」に分解
                        const totalTransitMin = spot.transitMin;
                        const hasTransitVal =
                          totalTransitMin !== '' && totalTransitMin != null && !isNaN(totalTransitMin);
                        const transitHours = hasTransitVal ? Math.floor(Number(totalTransitMin) / 60) : '';
                        const transitMinutes = hasTransitVal ? Number(totalTransitMin) % 60 : '';

                        return (
                          <React.Fragment key={spot.id}>
                            {/* 2つのカードの間に挟む区間移動コネクター（直前地点がある場合） */}
                            {prevLoc && (
                              <div className="timeline-transit-node">
                                <div className="transit-track-col">
                                  <div className="transit-track-line" />
                                  <span className="transit-track-icon">{currentModeDef.icon}</span>
                                  <div className="transit-track-line" />
                                </div>

                                <div className="transit-card-box">
                                  <div className="transit-inputs-row">
                                    {/* 移動手段 */}
                                    <label className="transit-field-inline">
                                      <span className="transit-label-text">移動手段:</span>
                                      <select
                                        value={currentMode}
                                        onChange={(e) =>
                                          handleTransitChange(spot.id, e.target.value, spot.transitMin)
                                        }
                                        className="transit-ui-select"
                                        title="移動手段を選択"
                                      >
                                        {TRANSIT_MODES.map((m) => (
                                          <option key={m.id} value={m.id}>
                                            {m.icon} {m.label}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    {/* 所要時間（〇時間 〇分） */}
                                    {currentModeDef.hasDurationInput && (
                                      <div className="transit-field-inline">
                                        <span className="transit-label-text">所要時間:</span>
                                        <div className="transit-hm-group">
                                          <input
                                            type="number"
                                            min="0"
                                            max="24"
                                            placeholder="0"
                                            value={transitHours === 0 && transitMinutes > 0 ? '' : transitHours}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              const currentM = transitMinutes === '' ? 0 : Number(transitMinutes);
                                              if (val === '' && currentM === 0) {
                                                handleTransitChange(spot.id, currentMode, '');
                                              } else {
                                                const h = val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0);
                                                handleTransitChange(spot.id, currentMode, h * 60 + currentM);
                                              }
                                            }}
                                            className="transit-ui-input transit-input-h"
                                            title="時間"
                                          />
                                          <span className="transit-unit-text">時間</span>

                                          <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            step="5"
                                            placeholder="0"
                                            value={transitMinutes}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              const currentH = transitHours === '' ? 0 : Number(transitHours);
                                              if (val === '' && currentH === 0) {
                                                handleTransitChange(spot.id, currentMode, '');
                                              } else {
                                                const m = val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0);
                                                handleTransitChange(spot.id, currentMode, currentH * 60 + m);
                                              }
                                            }}
                                            className="transit-ui-input transit-input-m"
                                            title="分"
                                          />
                                          <span className="transit-unit-text">分</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Googleマップ区間ルート案内ボタン */}
                                  {transitRouteUrl && (
                                    <a
                                      href={transitRouteUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="transit-gmaps-link-btn"
                                      title={`${prevName}から${spot.name}へのルートをGoogleマップで調べる`}
                                    >
                                      <Icon name="navigation" size={12} />
                                      <span>
                                        {currentMode === 'transit'
                                          ? 'Googleマップで乗換案内 ↗'
                                          : 'Googleマップでルート検索 ↗'}
                                      </span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="timeline-node">
                              {/* 時系列ラインの丸バッジ */}
                              <div className="timeline-badge-col">
                                <span className="timeline-badge">
                                  {dayIdx + 1}
                                </span>
                                {!isLastInDay && <div className="timeline-connector-line" />}
                              </div>

                              {/* スポット情報カード */}
                              <div className="timeline-card">
                                <div className="timeline-card-top-flex">
                                  <div className="timeline-card-main-col">
                                    <div className="spot-header-row">
                                      <span className="spot-cat-pill">
                                        {spot.icon || '📍'} {spot.category || '立ち寄り'}
                                      </span>

                                      <div className="spot-reorder-btns">
                                        <button
                                          type="button"
                                          className="icon-reorder-btn"
                                          disabled={dayIdx === 0}
                                          onClick={() => handleMoveSpotInDay(spot.id, -1)}
                                          title="上へ移動"
                                          aria-label="上へ移動"
                                        >
                                          <Icon name="chevronUp" size={15} />
                                        </button>
                                        <button
                                          type="button"
                                          className="icon-reorder-btn"
                                          disabled={isLastInDay}
                                          onClick={() => handleMoveSpotInDay(spot.id, 1)}
                                          title="下へ移動"
                                          aria-label="下へ移動"
                                        >
                                          <Icon name="chevronDown" size={15} />
                                        </button>
                                        <button
                                          type="button"
                                          className="icon-reorder-btn danger"
                                          onClick={() => handleDeleteSpot(spot.id)}
                                          title="削除"
                                          aria-label="削除"
                                        >
                                          <Icon name="trash" size={15} />
                                        </button>
                                      </div>
                                    </div>

                                    <h4 className="spot-name-text">{spot.name}</h4>
                                  </div>

                                  {/* スポット写真サムネイル */}
                                  <div className="timeline-thumb-col">
                                    <SpotImage
                                      src={spot.imageUrl}
                                      alt={spot.name}
                                      source={spot.imageSource}
                                      title={spot.name}
                                      desc={spot.memo}
                                      aspectRatio="4/3"
                                      className="timeline-spot-thumb"
                                    />
                                  </div>
                                </div>

                                {/* 時間・滞在目安・日程の入力（カード全幅でゆったり横並び） */}
                                <div className="spot-time-stay-row">
                                  {stayDays > 1 && (
                                    <label className="mini-day-label">
                                      <Icon name="calendar" size={13} />
                                      <select
                                        value={spot.day || 1}
                                        onChange={(e) =>
                                          handleSpotFieldChange(spot.id, 'day', Number(e.target.value))
                                        }
                                        className="inline-day-select"
                                        title="予定の日程を変更"
                                      >
                                        {daysArray.map((d) => (
                                          <option key={d} value={d}>
                                            📅 {d}日目 ({getDayDateString(currentTrip?.date, d)})
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  )}
                                  <label className="mini-time-label">
                                    <Icon name="clock" size={13} />
                                    <span>時間:</span>
                                    <input
                                      type="time"
                                      value={spot.time || '10:00'}
                                      onChange={(e) => handleSpotFieldChange(spot.id, 'time', e.target.value)}
                                      className="inline-time-input"
                                    />
                                  </label>
                                  <label className="mini-stay-label">
                                    <span>滞在:</span>
                                    <input
                                      type="number"
                                      min="5"
                                      step="5"
                                      value={spot.stayMin || 45}
                                      onChange={(e) => handleSpotFieldChange(spot.id, 'stayMin', e.target.value)}
                                      className="inline-stay-input"
                                    />
                                    <span>分</span>
                                  </label>
                                </div>

                              {/* メモ */}
                              <div className="spot-memo-box">
                                <input
                                  type="text"
                                  value={spot.memo || ''}
                                  onChange={(e) => handleSpotFieldChange(spot.id, 'memo', e.target.value)}
                                  placeholder="メモ（おすすめグルメ、やること等）"
                                  className="inline-memo-input"
                                />
                              </div>

                              {/* Googleマップ連携ボタン */}
                              <div className="spot-footer-action">
                                <a
                                  href={spot.googleMapsUrl || navUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-google-maps"
                                >
                                  <Icon name="navigation" size={14} /> Googleマップでナビを開く ↗
                                </a>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                      })}
                    </div>

                    {/* すでに予定がある日の下にも追加ボタンを設置 */}
                    <div className="day-add-spot-footer">
                      <div className="day-add-spot-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-xs day-add-btn"
                          onClick={() => {
                            setCustomSpotDay(dayNum);
                            setShowAddSpotModal(true);
                          }}
                        >
                          <Icon name="plus" size={13} /> {stayDays > 1 ? `${dayNum}日目に直接追加` : 'スポットを直接追加'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sage-soft btn-xs day-add-btn"
                          onClick={() => onSwitchToSearchTab(dayNum)}
                        >
                          <Icon name="search" size={13} /> たびさがしから探す
                        </button>
                      </div>
                    </div>
                  </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 手動スポット追加モーダル */}
      {showAddSpotModal && (
        <div className="modal-backdrop" onClick={() => setShowAddSpotModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>スポットを直接追加</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowAddSpotModal(false)}
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomSpot} className="modal-form">
              <label className="field-block">
                <span className="field-label">スポット・お店の名前</span>
                <input
                  type="text"
                  value={customSpotName}
                  onChange={(e) => setCustomSpotName(e.target.value)}
                  placeholder="例: レストラン、展望台、パーキング"
                  required
                />
              </label>

              {/* GoogleマップURL貼り付け欄（名前入力欄の下） */}
              <label className="field-block">
                <div className="field-label-row">
                  <span className="field-label">🔗 GoogleマップのURL（貼るだけで場所と名前を自動取得）</span>
                  {isResolvingGmapsUrl && (
                    <span className="resolving-indicator">
                      <span className="inline-mini-spinner" /> 情報を取得中…
                    </span>
                  )}
                </div>
                <div className="input-with-button-row">
                  <input
                    type="text"
                    value={customSpotGmapsUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomSpotGmapsUrl(val);
                      if (isGoogleMapsUrl(val)) {
                        handleResolveGmapsUrl(val);
                      }
                    }}
                    placeholder="例: https://maps.app.goo.gl/... または GoogleマップのURL"
                    className="gmaps-url-input"
                  />
                  <button
                    type="button"
                    className="btn btn-sage-soft btn-sm"
                    disabled={isResolvingGmapsUrl || !customSpotGmapsUrl.trim()}
                    onClick={() => handleResolveGmapsUrl(customSpotGmapsUrl)}
                  >
                    {isResolvingGmapsUrl ? '取得中…' : '自動取得'}
                  </button>
                </div>
                {gmapsResolvedMsg && (
                  <p className="gmaps-resolved-feedback">{gmapsResolvedMsg}</p>
                )}
                <span className="field-hint-text">
                  Googleマップの「共有」リンクを貼ると、場所の名前・座標・写真を自動で読み込みます。
                </span>
              </label>

              {stayDays > 1 && (
                <label className="field-block">
                  <span className="field-label">予定の日程</span>
                  <select
                    value={customSpotDay}
                    onChange={(e) => setCustomSpotDay(Number(e.target.value))}
                  >
                    {daysArray.map((d) => (
                      <option key={d} value={d}>
                        📅 {d}日目 ({getDayDateString(currentTrip?.date, d)})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="form-row">
                <label className="field-block">
                  <span className="field-label">到着予定時間</span>
                  <input
                    type="time"
                    value={customSpotTime}
                    onChange={(e) => setCustomSpotTime(e.target.value)}
                  />
                </label>
                <label className="field-block">
                  <span className="field-label">目安滞在時間 (分)</span>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={customSpotStay}
                    onChange={(e) => setCustomSpotStay(e.target.value)}
                  />
                </label>
              </div>

              <label className="field-block">
                <span className="field-label">メモ</span>
                <input
                  type="text"
                  value={customSpotMemo}
                  onChange={(e) => setCustomSpotMemo(e.target.value)}
                  placeholder="例: テラス席を予約済み"
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddSpotModal(false)}
                >
                  キャンセル
                </button>
                <button type="submit" className="btn btn-sage">
                  <Icon name="plus" size={16} /> 追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 出発地（スタート地点）設定モーダル */}
      {isEditingStart && (
        <div className="modal-backdrop" onClick={() => setIsEditingStart(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏠 出発地（スタート地点）の設定</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsEditingStart(false)}
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStartPoint} className="modal-form">
              {/* GoogleマップURL貼り付け欄 */}
              <label className="field-block">
                <div className="field-label-row">
                  <span className="field-label">🔗 GoogleマップのURL（貼るだけで場所と名前を自動取得）</span>
                  {isResolvingStartGmaps && (
                    <span className="resolving-indicator">
                      <span className="inline-mini-spinner" /> 情報を取得中…
                    </span>
                  )}
                </div>
                <div className="input-with-button-row">
                  <input
                    type="text"
                    value={startGmapsUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStartGmapsUrl(val);
                      if (isGoogleMapsUrl(val)) {
                        handleResolveStartGmapsUrl(val);
                      }
                    }}
                    placeholder="例: https://maps.app.goo.gl/... または Googleマップの共有URL"
                    className="gmaps-url-input"
                  />
                  <button
                    type="button"
                    className="btn btn-sage-soft btn-sm"
                    disabled={isResolvingStartGmaps || !startGmapsUrl.trim()}
                    onClick={() => handleResolveStartGmapsUrl(startGmapsUrl)}
                  >
                    {isResolvingStartGmaps ? '取得中…' : '自動取得'}
                  </button>
                </div>
                {startGmapsResolvedMsg && (
                  <p className="gmaps-resolved-feedback">{startGmapsResolvedMsg}</p>
                )}
                <span className="field-hint-text">
                  自宅や最寄り駅、集合場所などのGoogleマップ「共有」リンクを貼ると、名称やピンの位置を自動設定します。
                </span>
              </label>

              <label className="field-block">
                <span className="field-label">よくある出発地から選ぶ</span>
                <div className="preset-chip-list">
                  {START_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      className={`preset-chip ${startName === p.name ? 'is-active' : ''}`}
                      onClick={() => {
                        setStartName(p.name);
                        setStartLat(p.lat);
                        setStartLng(p.lng);
                        setStartGmapsUrl('');
                        setStartGmapsResolvedMsg('');
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </label>

              <label className="field-block">
                <span className="field-label">出発地名（直接入力も可能）</span>
                <input
                  type="text"
                  value={startName}
                  onChange={(e) => setStartName(e.target.value)}
                  placeholder="例: 自宅、東京駅八重洲口、横浜駅"
                  required
                />
              </label>

              <div className="form-row">
                <label className="field-block">
                  <span className="field-label">出発時間</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </label>
                <label className="field-block">
                  <span className="field-label">メモ</span>
                  <input
                    type="text"
                    value={startMemo}
                    onChange={(e) => setStartMemo(e.target.value)}
                    placeholder="例: ガソリン満タンで集合"
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsEditingStart(false)}
                >
                  キャンセル
                </button>
                <button type="submit" className="btn btn-sage">
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
