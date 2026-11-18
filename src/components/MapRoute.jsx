import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from './Icon';
import { getGoogleMapsNavUrl } from '../utils';

/**
 * 出発地用のSVGピン（🏠 ホーム）
 */
function createStartPinIcon() {
  const svg = `
    <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="start-pin-shadow" x="0" y="0" width="34" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <g filter="url(#start-pin-shadow)">
        <path d="M17 38C17 38 30 24 30 14C30 6.82 24.18 1 17 1C9.82 1 4 6.82 4 14C4 24 17 38 17 38Z" fill="#4a7c59" stroke="#ffffff" stroke-width="2"/>
        <circle cx="17" cy="14" r="9" fill="#ffffff"/>
        <text x="17" y="18" text-anchor="middle" font-size="11" font-family="-apple-system, BlinkMacSystemFont, sans-serif">🏠</text>
      </g>
    </svg>
  `;
  return L.divIcon({
    className: 'custom-leaf-pin',
    html: svg,
    iconSize: [34, 42],
    iconAnchor: [17, 39],
    popupAnchor: [0, -36],
  });
}

/**
 * 立ち寄りスポット用のSVGピン（番号付き）
 */
function createSpotPinIcon(number, isLast) {
  const fillColor = isLast ? '#b46522' : '#c26549';
  const filterId = `spot-pin-shadow-${number}-${isLast ? 'last' : 'mid'}`;
  const svg = `
    <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}" x="0" y="0" width="34" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <g filter="url(#${filterId})">
        <path d="M17 38C17 38 30 24 30 14C30 6.82 24.18 1 17 1C9.82 1 4 6.82 4 14C4 24 17 38 17 38Z" fill="${fillColor}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="17" cy="14" r="9" fill="#ffffff"/>
        <text x="17" y="18.5" text-anchor="middle" font-size="12" font-weight="bold" fill="${fillColor}" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${number}</text>
      </g>
    </svg>
  `;
  return L.divIcon({
    className: 'custom-leaf-pin',
    html: svg,
    iconSize: [34, 42],
    iconAnchor: [17, 39],
    popupAnchor: [0, -36],
  });
}

export default function MapRoute({ itinerary = [], startPoint, title = '旅のルート' }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [activeSpot, setActiveSpot] = useState(null);
  const [mapError, setMapError] = useState(false);

  // プルダウン式（折りたたみ）開閉ステート（初期状態は閉じてタイムラインを見やすくする）
  const [isOpen, setIsOpen] = useState(false);

  // マーカーとルート点線の描画関数
  const renderMarkersAndRoute = () => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    const container = mapContainerRef.current;
    if (!map || !layerGroup || !container) return;

    // コンテナが非表示（サイズ0）の場合は無理にfitBounds等を計算しない（NaNエラー防止）
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

    layerGroup.clearLayers();

    // 出発地は遠方のケース（自宅等）があるため、現地の旅程スポット（1〜N）のみをマップにプロットして現地詳細にフィット
    const validSpots = (itinerary || []).filter(
      (s) => typeof s.lat === 'number' && typeof s.lng === 'number' && !isNaN(s.lat) && !isNaN(s.lng)
    );

    const spotCoords = validSpots.map((s) => [s.lat, s.lng]);

    // スポットが0件で出発地のみある場合のフォールバック
    const hasStart =
      startPoint &&
      typeof startPoint.lat === 'number' &&
      typeof startPoint.lng === 'number' &&
      !isNaN(startPoint.lat) &&
      !isNaN(startPoint.lng);

    if (spotCoords.length === 0 && !hasStart) {
      map.setView([35.6812, 139.7671], 10);
      return;
    }

    if (spotCoords.length === 0 && hasStart) {
      map.setView([startPoint.lat, startPoint.lng], 13);
      return;
    }

    // 1. 各スポット間を優しいテラコッタの点線ルートで結ぶ（現地スポット同士）
    if (spotCoords.length >= 2) {
      const polyline = L.polyline(spotCoords, {
        color: '#c26549',
        weight: 4,
        opacity: 0.85,
        dashArray: '7, 9',
        lineCap: 'round',
        lineJoin: 'round',
      });
      layerGroup.addLayer(polyline);
    }

    // 2. 立ち寄りスポットのピン（SVG番号付きピン）
    validSpots.forEach((spot, idx) => {
      const isLast = idx === validSpots.length - 1 && validSpots.length > 1;
      const navUrl = getGoogleMapsNavUrl(spot.name, spot.lat, spot.lng);
      const marker = L.marker([spot.lat, spot.lng], {
        icon: createSpotPinIcon(idx + 1, isLast),
      });

      const popupHtml = `
        <div class="map-popup-card">
          <div class="popup-head">
            <span class="popup-num" style="background:${isLast ? '#b46522' : '#c26549'}">${idx + 1}</span>
            <strong class="popup-title">${spot.name}</strong>
          </div>
          ${spot.time ? `<p class="popup-time">⏰ ${spot.time}〜 (約${spot.stayMin || 45}分)</p>` : ''}
          ${spot.memo ? `<p class="popup-memo">${spot.memo}</p>` : ''}
          <div class="popup-action">
            <a href="${navUrl}" target="_blank" rel="noopener noreferrer" class="popup-nav-link">
              Googleマップでナビを開く ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260, className: 'botanical-popup' });
      marker.on('click', () => setActiveSpot(spot));

      layerGroup.addLayer(marker);
    });

    // 3. 現地のスポット群が美しく収まるようにズームと中心を自動フィット
    if (spotCoords.length === 1) {
      map.setView(spotCoords[0], 14);
    } else {
      const bounds = L.latLngBounds(spotCoords);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [36, 36],
          maxZoom: 15,
        });
      }
    }
  };

  // 地図の初期化と開閉制御（開かれた時に初めて正しく初期化・描画する）
  useEffect(() => {
    if (!isOpen) return;
    if (!mapContainerRef.current) return;

    // まだ地図インスタンスがない場合は新規初期化
    if (!mapInstanceRef.current) {
      try {
        if (mapContainerRef.current._leaflet_id) {
          delete mapContainerRef.current._leaflet_id;
        }

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false, // 右下のOpenStreetMapクレジット表記を非表示
          scrollWheelZoom: false,
        });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '',
        }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        layerGroupRef.current = layerGroup;
        mapInstanceRef.current = map;
      } catch (err) {
        console.warn('Leaflet map initialization failed:', err);
        setMapError(true);
        return;
      }
    }

    // 表示直後とアニメーション後のタイミングで確実にサイズ再計算＆ピン描画
    const timer1 = setTimeout(() => {
      const map = mapInstanceRef.current;
      if (map) {
        map.invalidateSize();
        renderMarkersAndRoute();
      }
    }, 60);

    const timer2 = setTimeout(() => {
      const map = mapInstanceRef.current;
      if (map) {
        map.invalidateSize();
        renderMarkersAndRoute();
      }
    }, 240);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen]);

  // スポットやルート更新時にマーカーと点線ポリラインを再描画
  useEffect(() => {
    if (isOpen && mapInstanceRef.current) {
      renderMarkersAndRoute();
    }
  }, [itinerary, startPoint, isOpen]);

  // コンテナサイズ変化（スマホ画面回転やリサイズなど）の自動検知
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          const map = mapInstanceRef.current;
          if (map) {
            map.invalidateSize();
          }
        }
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // コンポーネント完全アンマウント時の後片付け
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const validSpots = (itinerary || []).filter(
    (s) => typeof s.lat === 'number' && typeof s.lng === 'number' && !isNaN(s.lat) && !isNaN(s.lng)
  );

  return (
    <div className={`map-route-wrapper ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      {/* クリックで開閉できるアコーディオンヘッダー */}
      <button
        type="button"
        className="map-route-header-btn"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <div className="map-title-row">
          <span className="botanical-icon-badge">
            <Icon name="map" size={17} />
          </span>
          <div className="map-title-texts">
            <div className="map-title-main-line">
              <h3 className="map-title">旅の全体ルートマップ</h3>
              <span className="map-count-badge">
                {itinerary.length}スポット
              </span>
            </div>
            <p className="map-sub">
              {itinerary.length}ヶ所の立ち寄りスポットを結ぶ俯瞰ルート
            </p>
          </div>
        </div>

        <div className="map-toggle-action">
          <span className="map-toggle-text">
            {isOpen ? '地図を閉じる' : '地図を開く'}
          </span>
          <Icon
            name={isOpen ? 'chevronUp' : 'chevronDown'}
            size={16}
            className="map-toggle-chevron"
          />
        </div>
      </button>

      {/* 地図エリア（DOMは常に保持し、displayで切り替え） */}
      <div
        className="map-collapsible-content"
        style={{ display: isOpen ? 'block' : 'none' }}
      >
        <div className="map-legend">
          <span className="legend-item"><span className="legend-dot start" /> 出発地</span>
          <span className="legend-item"><span className="legend-line" /> 予定ルート</span>
          <span className="legend-item"><span className="legend-dot" /> 立ち寄り</span>
        </div>

        <div className="map-viewport-container">
          {mapError ? (
            <div className="map-fallback">
              <Icon name="mapPin" size={32} />
              <p>地図の読み込みがタイムアウトしました。通信環境をご確認ください。</p>
            </div>
          ) : (
            <div ref={mapContainerRef} className="leaflet-map-root" />
          )}

          {/* 下部のクイック案内インフォバー */}
          {itinerary.length > 0 && (
            <div className="map-bottom-bar">
              <span className="map-bottom-info">
                {validSpots.length > 0 || (startPoint && typeof startPoint.lat === 'number')
                  ? '💡 ピンをタップするとスポット詳細とGoogleマップナビボタンが表示されます'
                  : '📍 スポットの経緯度を取得しています…'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
