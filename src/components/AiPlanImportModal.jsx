import React, { useState, useMemo, useEffect } from 'react';
import Icon from './Icon';
import {
  parseAiPlanText,
  generatePlanPrompt,
  generateConsultPrompt,
  generateFormatConversionPrompt,
} from '../utils/aiPlanParser';
import { TRIP_STYLES } from '../travelData';

export default function AiPlanImportModal({
  isOpen,
  onClose,
  currentTrip,
  onImportPlan, // ({ itinerary, packingList, importMode, updateStayDays, newDaysCount, newTitle, newDestination }) => void
}) {
  // プロンプトモード: 'quick' (一発作成) | 'consult' (AIと相談・一緒に決める)
  const [promptMode, setPromptMode] = useState('quick');

  // Step 1: プロンプト生成用カスタムステート
  const [destination, setDestination] = useState('');
  const [stayDays, setStayDays] = useState(2);
  const [style, setStyle] = useState('drive');
  const [preferences, setPreferences] = useState('');
  const [showDestinationWarning, setShowDestinationWarning] = useState(false);

  // Step 2 & 3: 入力・解析用ステート
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedConversion, setCopiedConversion] = useState(false);
  const [importMode, setImportMode] = useState('append'); // 'append' | 'replace'
  const [shouldUpdateStayDays, setShouldUpdateStayDays] = useState(true);

  // 編集用ローカルステート
  const [editableSpots, setEditableSpots] = useState([]);
  const [editablePacking, setEditablePacking] = useState([]);
  const [detectedTitle, setDetectedTitle] = useState(null);
  const [detectedDaysCount, setDetectedDaysCount] = useState(1);

  // モーダルを開いたときの初期化
  useEffect(() => {
    if (isOpen) {
      // 旅行タイトルが「新しい旅行」で始まっていない場合は行先として利用
      const initialDest =
        currentTrip?.mainSpot ||
        (!currentTrip?.title?.startsWith('新しい旅行') ? currentTrip?.title : '') ||
        '';

      setDestination(initialDest);
      setStayDays(currentTrip?.stayDays || 2);
      setStyle(currentTrip?.style || 'drive');
      setPreferences('');
      setShowDestinationWarning(false);
      setPromptMode('quick');

      setInputText('');
      setCopied(false);
      setCopiedConversion(false);
      setImportMode('append');
      setShouldUpdateStayDays(true);
      setEditableSpots([]);
      setEditablePacking([]);
      setDetectedTitle(null);
      setDetectedDaysCount(1);
    }
  }, [isOpen, currentTrip]);

  // 入力された条件をもとにプロンプトをリアルタイム生成
  const promptText = useMemo(() => {
    const opts = {
      destination,
      stayDays,
      style,
      preferences,
      date: currentTrip?.date,
    };
    return promptMode === 'quick'
      ? generatePlanPrompt(currentTrip, opts)
      : generateConsultPrompt(currentTrip, opts);
  }, [currentTrip, destination, stayDays, style, preferences, promptMode]);

  // 仕上げ変換用プロンプトテキスト
  const conversionPromptText = useMemo(() => {
    return generateFormatConversionPrompt(stayDays);
  }, [stayDays]);

  // 入力テキストが変更されたらパースしてローカルステートに反映
  useEffect(() => {
    if (!inputText.trim()) {
      setEditableSpots([]);
      setEditablePacking([]);
      setDetectedTitle(null);
      setDetectedDaysCount(1);
      return;
    }

    const result = parseAiPlanText(inputText);
    setEditableSpots(result.itinerary);
    setEditablePacking(result.packingList);
    setDetectedTitle(result.title);
    setDetectedDaysCount(result.daysCount);
  }, [inputText]);

  if (!isOpen) return null;

  // プロンプトをクリップボードにコピー
  const handleCopyPrompt = async () => {
    if (!destination.trim()) {
      setShowDestinationWarning(true);
      // 行先入力欄にフォーカスを促す
      const inputEl = document.getElementById('ai-modal-dest-input');
      if (inputEl) inputEl.focus();
      return;
    }

    setShowDestinationWarning(false);
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  // 仕上げ変換用プロンプトをコピー
  const handleCopyConversionPrompt = async () => {
    try {
      await navigator.clipboard.writeText(conversionPromptText);
      setCopiedConversion(true);
      setTimeout(() => setCopiedConversion(false), 3000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  // スポット削除
  const handleRemoveSpot = (spotId) => {
    setEditableSpots((prev) => prev.filter((s) => s.id !== spotId));
  };

  // 持ち物削除
  const handleRemovePacking = (itemId) => {
    setEditablePacking((prev) => prev.filter((p) => p.id !== itemId));
  };

  // 持ち物の重要度切り替え（must <=> nice）
  const handleTogglePriority = (itemId) => {
    setEditablePacking((prev) =>
      prev.map((p) => {
        if (p.id !== itemId) return p;
        const nextPriority = p.priority === 'must' ? 'nice' : 'must';
        return {
          ...p,
          priority: nextPriority,
          reasonTag: nextPriority === 'must' ? 'AI必須' : 'AIおすすめ',
        };
      })
    );
  };

  // インポート確定
  const handleConfirmImport = () => {
    if (editableSpots.length === 0 && editablePacking.length === 0) return;

    // もし旅行タイトルが初期値（「新しい旅行 ◯」）で、ユーザーが行先を入力していた場合はタイトルも自動生成
    const autoTitle =
      detectedTitle ||
      (destination ? `${destination}旅行` : null);

    onImportPlan({
      itinerary: editableSpots,
      packingList: editablePacking,
      importMode,
      updateStayDays: shouldUpdateStayDays && (detectedDaysCount > 1 || stayDays > 1),
      newDaysCount: Math.max(detectedDaysCount, stayDays),
      newTitle: autoTitle,
      newDestination: destination.trim(),
    });

    onClose();
  };

  return (
    <div className="guide-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="guide-modal-window ai-import-modal-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* モーダルヘッダー */}
        <div className="guide-modal-header">
          <div className="guide-modal-title-group">
            <span className="guide-leaf-icon ai-robot-icon">
              <Icon name="bot" size={22} />
            </span>
            <div>
              <h2 className="guide-modal-title">AIプランを一括取り込み</h2>
              <p className="guide-modal-subtitle">
                行先を入力してプロンプトをコピー ➔ AIの回答を貼るだけで旅程＆持ち物を一発作成！
              </p>
            </div>
          </div>
          <button
            type="button"
            className="guide-close-btn"
            onClick={onClose}
            aria-label="閉じる"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* モーダル本文 */}
        <div className="guide-modal-body ai-import-body">
          {/* Step 1: 旅行条件の入力 & プロンプトコピー */}
          <section className="ai-step-card">
            <div className="ai-step-head">
              <span className="ai-step-badge">Step 1</span>
              <h3 className="ai-step-title">行先を決めてプロンプトをコピー</h3>
            </div>
            <p className="ai-step-desc">
              行きたい場所を入力すると、ChatGPTやGeminiに投げる質問文が自動で完成します。
            </p>

            {/* 条件入力ミニフォーム */}
            <div className="ai-conditions-form">
              <div className="ai-form-group">
                <label className="ai-field-label" htmlFor="ai-modal-dest-input">
                  📍 行先・行きたいエリア <span className="label-required">必須</span>
                </label>
                <input
                  id="ai-modal-dest-input"
                  type="text"
                  className={`ai-field-input ${showDestinationWarning && !destination.trim() ? 'is-invalid' : ''}`}
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    if (e.target.value.trim()) setShowDestinationWarning(false);
                  }}
                  placeholder="例: 金沢、北海道、草津温泉、京都 など"
                />
                {showDestinationWarning && !destination.trim() && (
                  <span className="ai-field-error">※ 行きたい場所やエリアを入力してください</span>
                )}
              </div>

              <div className="ai-form-row">
                <div className="ai-form-group flex-1">
                  <label className="ai-field-label">📅 日程・泊数</label>
                  <select
                    className="ai-field-select"
                    value={stayDays}
                    onChange={(e) => setStayDays(Number(e.target.value))}
                  >
                    <option value={1}>日帰り（1日）</option>
                    <option value={2}>1泊2日（2日間）</option>
                    <option value={3}>2泊3日（3日間）</option>
                    <option value={4}>3泊4日（4日間）</option>
                    <option value={5}>4泊5日（5日間）</option>
                  </select>
                </div>

                <div className="ai-form-group flex-1">
                  <label className="ai-field-label">🚗 旅行スタイル</label>
                  <select
                    className="ai-field-select"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                  >
                    {TRIP_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ai-form-group">
                <label className="ai-field-label">
                  💡 こだわり・希望（任意）
                </label>
                <input
                  type="text"
                  className="ai-field-input"
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="例: おしゃれカフェ巡り、海鮮グルメ、雨でも楽しめる場所 など"
                />
              </div>
            </div>

            {/* プロンプト種類切り替えタブ */}
            <div className="prompt-mode-tabs">
              <button
                type="button"
                className={`prompt-mode-btn ${promptMode === 'quick' ? 'is-active' : ''}`}
                onClick={() => setPromptMode('quick')}
              >
                ⚡ 一発作成（旅程＆持ち物をすぐ出力）
              </button>
              <button
                type="button"
                className={`prompt-mode-btn ${promptMode === 'consult' ? 'is-active' : ''}`}
                onClick={() => setPromptMode('consult')}
              >
                💬 AIと相談（おすすめ店や見どころを一緒に決める）
              </button>
            </div>

            {/* 自動生成されたプロンプトのプレビュー */}
            <div className="ai-prompt-preview-wrap">
              <div className="prompt-preview-head">
                <span className="prompt-preview-label">
                  {promptMode === 'quick'
                    ? '📋 ChatGPTやGeminiに投げるプロンプト:'
                    : '💬 AIに送る相談スタート用プロンプト:'}
                </span>
              </div>
              <pre className="ai-prompt-preview-text">{promptText}</pre>
            </div>

            <div className="ai-prompt-actions">
              <button
                type="button"
                className={`btn ${copied ? 'btn-sage' : 'btn-sage-soft'} btn-sm`}
                onClick={handleCopyPrompt}
              >
                <Icon name={copied ? 'check' : 'copy'} size={15} />
                <span>{copied ? 'コピーしました！' : promptMode === 'quick' ? 'プロンプトをコピー' : '相談文をコピー'}</span>
              </button>

              <div className="ai-external-links">
                <span className="ai-external-hint">AIを開く:</span>
                <a
                  href="https://chatgpt.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ai-link-pill"
                >
                  ChatGPT <Icon name="external" size={12} />
                </a>
                <a
                  href="https://gemini.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ai-link-pill"
                >
                  Gemini <Icon name="external" size={12} />
                </a>
              </div>
            </div>

            {/* 対話モード時：仕上げ変換プロンプトの案内ブロック */}
            {promptMode === 'consult' && (
              <div className="ai-consult-step-box">
                <div className="consult-step-info">
                  <span className="step-check-icon">✓</span>
                  <div>
                    <strong className="consult-step-title">AIと相談がまとまったら:</strong>
                    <p className="consult-step-desc">
                      以下の「仕上げ用指示文」をコピーしてAIに送ると、タビトモに取り込める形式に一瞬で整形してくれます！
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className={`btn ${copiedConversion ? 'btn-sage' : 'btn-outline'} btn-sm`}
                  onClick={handleCopyConversionPrompt}
                >
                  <Icon name={copiedConversion ? 'check' : 'copy'} size={14} />
                  <span>{copiedConversion ? '仕上げ指示文をコピーしました！' : '仕上げ用プロンプトをコピー'}</span>
                </button>
              </div>
            )}
          </section>

          {/* Step 2: 回答テキスト貼り付け */}
          <section className="ai-step-card">
            <div className="ai-step-head">
              <span className="ai-step-badge">Step 2</span>
              <h3 className="ai-step-title">AIの回答テキストを貼り付け</h3>
            </div>
            <p className="ai-step-desc">
              ChatGPTやGeminiが出力したテキストをそのまま下にペーストしてください。自動で解析されます。
            </p>

            <textarea
              className="ai-input-textarea"
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="ここにAIの回答テキストを貼り付けてください..."
            />
          </section>

          {/* Step 3: 解析プレビュー */}
          {inputText.trim() && (
            <section className="ai-step-card ai-preview-card">
              <div className="ai-step-head">
                <span className="ai-step-badge">Step 3</span>
                <h3 className="ai-step-title">解析プレビュー & 取り込み設定</h3>
              </div>

              {/* 検出サマリーバッジ */}
              <div className="ai-parsed-summary-bar">
                <span className="parsed-chip">
                  📍 旅程スポット: <strong>{editableSpots.length}</strong> 件
                </span>
                <span className="parsed-chip">
                  🎒 持ち物: <strong>{editablePacking.length}</strong> 件
                </span>
                {detectedDaysCount > 1 && (
                  <span className="parsed-chip">
                    📅 日程: <strong>{detectedDaysCount}</strong> 日間
                  </span>
                )}
              </div>

              {/* 取り込みオプション */}
              <div className="ai-options-row">
                <div className="ai-option-item">
                  <span className="option-label">旅程の反映方法:</span>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                    />
                    <span>既存の旅程の後ろに追加</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                    />
                    <span>既存の旅程を入れ替える</span>
                  </label>
                </div>

                {detectedDaysCount > (currentTrip?.stayDays || 2) && (
                  <div className="ai-option-item">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={shouldUpdateStayDays}
                        onChange={(e) => setShouldUpdateStayDays(e.target.checked)}
                      />
                      <span>
                        旅行の日程を {currentTrip?.stayDays || 2}日間 から{' '}
                        <strong>{detectedDaysCount}日間</strong> に自動拡張する
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* 旅程スポット一覧プレビュー */}
              {editableSpots.length > 0 && (
                <div className="ai-preview-section">
                  <h4 className="preview-sub-title">
                    📍 検出された立ち寄りスポット（{editableSpots.length}件）
                  </h4>
                  <div className="preview-spots-list">
                    {editableSpots.map((spot, idx) => (
                      <div key={spot.id || idx} className="preview-spot-row">
                        <span className="spot-day-pill">Day {spot.day || 1}</span>
                        <span className="spot-time-pill">{spot.time || '10:00'}</span>
                        <span className="spot-icon-cell">{spot.icon || '📍'}</span>
                        <div className="spot-text-cell">
                          <strong className="spot-name-text">{spot.name}</strong>
                          {spot.memo && <span className="spot-memo-text">{spot.memo}</span>}
                        </div>
                        <button
                          type="button"
                          className="preview-remove-btn"
                          onClick={() => handleRemoveSpot(spot.id)}
                          title="このスポットを除外"
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 持ち物一覧プレビュー */}
              {editablePacking.length > 0 && (
                <div className="ai-preview-section">
                  <h4 className="preview-sub-title">
                    🎒 検出された持ち物（{editablePacking.length}件）
                    <span className="preview-sub-hint">（バッジをタップで重要度を変更できます）</span>
                  </h4>
                  <div className="preview-packing-grid">
                    {editablePacking.map((item, idx) => (
                      <div key={item.id || idx} className="preview-packing-item">
                        <button
                          type="button"
                          className={`priority-toggle-chip ${
                            item.priority === 'must' ? 'is-must' : 'is-nice'
                          }`}
                          onClick={() => handleTogglePriority(item.id)}
                          title="タップして「必須」と「あると便利」を切り替え"
                        >
                          {item.priority === 'must' ? '🔥 必須' : '✨ 便利'}
                        </button>
                        <span className="packing-item-name">{item.name}</span>
                        {item.reason && (
                          <span className="packing-item-reason" title={item.reason}>
                            {item.reason}
                          </span>
                        )}
                        <button
                          type="button"
                          className="preview-remove-btn"
                          onClick={() => handleRemovePacking(item.id)}
                          title="この持ち物を除外"
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editableSpots.length === 0 && editablePacking.length === 0 && (
                <div className="ai-preview-empty">
                  <p>⚠️ テキストから旅程や持ち物を検出できませんでした。</p>
                  <p className="sub-text">
                    上のStep 1にあるプロンプトをそのままChatGPTまたはGeminiに入力して、生成された回答を貼り付けてみてください。
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* モーダルフッター */}
        <div className="guide-modal-footer ai-modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="btn btn-sage"
            disabled={editableSpots.length === 0 && editablePacking.length === 0}
            onClick={handleConfirmImport}
          >
            <Icon name="check" size={16} />
            <span>しおりと持ち物に反映する</span>
          </button>
        </div>
      </div>
    </div>
  );
}
