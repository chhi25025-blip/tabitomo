import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { detectWatercolorTheme } from '../api/spotSearchApi';

export default function SpotImage({
  src,
  alt = 'スポット写真',
  source = null,
  title = '',
  desc = '',
  className = '',
  aspectRatio = '16/9',
  loading = 'lazy',
}) {
  const theme = detectWatercolorTheme(title || alt, desc);

  // HTTPSに正規化（モバイルブラウザの Mixed Content ブロックを回避）
  const safeSrc = src ? String(src).replace(/^http:\/\//i, 'https://') : '';

  const [loadFailed, setLoadFailed] = useState(!safeSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);

  // safeSrcが変わったときは状態を最新化してリセット
  useEffect(() => {
    setLoadFailed(!safeSrc);
    setIsLoaded(false);

    // すでにブラウザキャッシュにある場合は即座に表示
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [safeSrc, title, desc]);

  const showPhoto = Boolean(safeSrc) && !loadFailed;

  return (
    <div
      className={`spot-image-container ${className}`}
      style={{ aspectRatio }}
    >
      {showPhoto ? (
        <>
          <img
            ref={imgRef}
            key={safeSrc}
            src={safeSrc}
            alt={alt}
            className={`spot-real-image ${isLoaded ? 'is-visible' : 'is-loading'}`}
            loading={loading}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setIsLoaded(true)}
            onError={() => setLoadFailed(true)}
          />
          {source && isLoaded && (
            <span className="photo-credit-badge">
              📷 {source}
            </span>
          )}
        </>
      ) : (
        /* ボタニカル水彩フォールバックカード（優しい色合い＆モチーフ） */
        <div
          className="watercolor-fallback-card"
          style={{ background: theme.gradient }}
        >
          <div className="watercolor-leaf-pattern" aria-hidden="true">
            <Icon name="leaf" size={72} strokeWidth={1.2} />
          </div>
          <div className="watercolor-content">
            <span className="watercolor-icon">{theme.icon}</span>
            <span className="watercolor-title">{title || alt}</span>
            <span className="watercolor-tag">{theme.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}
