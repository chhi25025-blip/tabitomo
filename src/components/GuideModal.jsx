import React from 'react';
import Icon from './Icon';

export default function GuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card guide-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
      >
        <div className="modal-header guide-modal-header">
          <div className="guide-modal-title-group">
            <span className="leaf-badge">
              <Icon name="compass" size={14} /> 日本を旅しよう！
            </span>
            <h3 id="guide-modal-title">ワクワクする旅の計画をはじめよう</h3>
          </div>
          <button
            type="button"
            className="guide-modal-close-btn"
            onClick={onClose}
            aria-label="閉じる"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <p className="guide-modal-intro">
          行きたい場所を検索してしおりに追加するだけ。周辺のカフェや持ち物チェックも丸ごとおまかせ！
        </p>

        {/* 3ステップガイド */}
        <div className="travel-three-steps-row guide-modal-steps">
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

        <div className="guide-modal-actions">
          <button
            type="button"
            className="btn btn-sage guide-modal-confirm-btn"
            onClick={onClose}
          >
            さっそく旅の計画をはじめる ✨
          </button>
        </div>
      </div>
    </div>
  );
}

