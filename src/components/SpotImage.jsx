import React, { useState, useEffect } from 'react';
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
}) {
  const theme = detectWatercolorTheme(title || alt, desc);

  const [loadFailed, setLoadFailed] = useState(!src);
  const [isLoaded, setIsLoaded] = useState(false);

  // srcが変わったときは状態を最新化してリセット
  useEffect(() => {
    setLoadFailed(!src);
    setIsLoaded(false);
  }, [src, title, desc]);

  const showPhoto = Boolean(src) && !loadFailed;

  return (
    <div
      className={`spot-image-container ${className}`}
      style={{ aspectRatio }}
    >
      {showPhoto ? (
        <>
          <img
            key={src}
            src={src}
            alt={alt}
            className={`spot-real-image ${isLoaded ? 'is-visible' : 'is-loading'}`}
            loading="lazy"
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
            <span className="watercolor-tag">水彩イメージ ・ {theme.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}
