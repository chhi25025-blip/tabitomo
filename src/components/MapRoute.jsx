import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from './Icon';
import { getGoogleMapsNavUrl } from '../utils';

export default function MapRoute({ itinerary = [], startPoint, title = '旅のルート' }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [activeSpot, setActiveSpot] = useState(null);
  const [mapError, setMapError] = useState(false);

  // 地図初期化
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false, // ページスクロールの邪魔にならないよう初期OFF
      });

      // OpenStreetMapタイル（クレカ・APIキー完全不要のオープンソース地図）
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    } catch (err) {
      console.warn('Leaflet map initialization failed:', err);
      setMapError(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // スポットやルート更新時にマーカーと点線ポリラインを再描画
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const validSpots = itinerary.filter(
      (s) => typeof s.lat === 'number' && typeof s.lng === 'number'
    );

    const hasStart =
      startPoint &&
      typeof startPoint.lat === 'number' &&
      typeof startPoint.lng === 'number';

    const allCoords = [];
    if (hasStart) {
      allCoords.push([startPoint.lat, startPoint.lng]);
    }
    validSpots.forEach((s) => allCoords.push([s.lat, s.lng]));

    if (allCoords.length === 0) {
      map.setView([35.3, 138.8], 9);
      return;
    }

    // 1. 出発地ピン（🏠 アイコン）
    if (hasStart) {
      const startCustomIcon = L.divIcon({
        className: 'custom-leaf-pin',
        html: `
          <div class="leaf-pin-inner pin-home">
            <span class="leaf-pin-badge">🏠</span>
          </div>
        `,
        iconSize: [34, 42],
        iconAnchor: [17, 40],
        popupAnchor: [0, -36],
      });

      const startMarker = L.marker([startPoint.lat, startPoint.lng], {
        icon: startCustomIcon,
      });

      const startPopupHtml = `
        <div class="map-popup-card">
          <div class="popup-head">
            <span class="popup-num" style="background:#587b66">🏠</span>
            <strong class="popup-title">${startPoint.name || '出発地'}</strong>
          </div>
          <p class="popup-time">⏰ ${startPoint.time || '08:30'} 出発</p>
          ${startPoint.memo ? `<p class="popup-memo">${startPoint.memo}</p>` : ''}
        </div>
      `;
      startMarker.bindPopup(startPopupHtml, { maxWidth: 240, className: 'botanical-popup' });
      layerGroup.addLayer(startMarker);
    }

    // 2. 出発地〜各スポット間を優しいテラコッタの点線ルートで結ぶ
    if (allCoords.length >= 2) {
      const polyline = L.polyline(allCoords, {
        color: '#c26549',
        weight: 4,
        opacity: 0.85,
        dashArray: '7, 9',
        lineCap: 'round',
        lineJoin: 'round',
      });
      layerGroup.addLayer(polyline);
    }

    // 3. 立ち寄りスポットのピン（番号付きボタニカルピン）
    validSpots.forEach((spot, idx) => {
      const isLast = idx === validSpots.length - 1 && validSpots.length > 1;

      const pinColorClass = isLast ? 'pin-goal' : 'pin-mid';

      const customIcon = L.divIcon({
        className: 'custom-leaf-pin',
        html: `
          <div class="leaf-pin-inner ${pinColorClass}">
            <span class="leaf-pin-badge">${idx + 1}</span>
          </div>
        `,
        iconSize: [34, 42],
        iconAnchor: [17, 40],
        popupAnchor: [0, -36],
      });

      const navUrl = getGoogleMapsNavUrl(spot.name, spot.lat, spot.lng);

      const marker = L.marker([spot.lat, spot.lng], { icon: customIcon });

      const popupHtml = `
        <div class="map-popup-card">
          <div class="popup-head">
            <span class="popup-num">${idx + 1}</span>
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

    // 4. 全体が見渡せる「引きの俯瞰図」にズームと中心を自動フィット
    if (allCoords.length === 1) {
      map.setView(allCoords[0], 13);
    } else {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 14,
      });
    }

    // Leafletのコンテナサイズ変更時の描画ズレ防止
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [itinerary, startPoint]);

  // コンテナサイズ変化（タブ切り替えで display: none -> block になった時など）の自動再描画
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          const map = mapInstanceRef.current;
          if (map) {
            map.invalidateSize();
            const validSpots = (itinerary || []).filter(
              (s) => typeof s.lat === 'number' && typeof s.lng === 'number'
            );
            if (validSpots.length === 1) {
              map.setView([validSpots[0].lat, validSpots[0].lng], 13);
            } else if (validSpots.length > 1) {
              const bounds = L.latLngBounds(validSpots.map((s) => [s.lat, s.lng]));
              map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 });
            }
          }
        }
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [itinerary]);

  return (
    <div className="map-route-wrapper">
      <div className="map-route-header">
        <div className="map-title-row">
          <span className="botanical-icon-badge">
            <Icon name="map" size={17} />
          </span>
          <div>
            <h3 className="map-title">旅の全体ルートマップ</h3>
            <p className="map-sub">
              {itinerary.length}ヶ所の立ち寄りスポットを結ぶ俯瞰ルート（OpenStreetMap）
            </p>
          </div>
        </div>
        <div className="map-legend">
          <span className="legend-item"><span className="legend-dot start" /> 出発地</span>
          <span className="legend-item"><span className="legend-line" /> 予定ルート</span>
          <span className="legend-item"><span className="legend-dot" /> 立ち寄り</span>
        </div>
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
              💡 ピンをタップするとスポット詳細とGoogleマップナビボタンが表示されます
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
