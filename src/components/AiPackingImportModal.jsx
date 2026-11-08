import React, { useState, useMemo, useEffect } from 'react';
import Icon from './Icon';
import { parseAiPlanText, generatePackingPrompt, filterDuplicateItems } from '../utils/aiPlanParser';
import {
  formatStayDaysLabel,
  calcEndDateFromStayDays,
  calcStayDaysFromDates,
  defaultTripDate,
} from '../utils';

export default function AiPackingImportModal({
  isOpen,
  onClose,
  currentTrip,
  existingItems = [], // 現在の持ち物リスト（重複判定用）
  onAddPackingItems, // (newPackingItems: Array) => void
}) {
  // Step 1: プロンプト生成用カスタムステート
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(currentTrip?.date || defaultTripDate());
  const [endDate, setEndDate] = useState(
    currentTrip?.endDate ||
      calcEndDateFromStayDays(currentTrip?.date || defaultTripDate(), currentTrip?.stayDays || 2)
  );
  const [stayDays, setStayDays] = useState(currentTrip?.stayDays || 2);
  const [preferences, setPreferences] = useState('');
  const [showDestinationWarning, setShowDestinationWarning] = useState(false);

  // Step 2 & 3: 入力・解析用ステート
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [editablePacking, setEditablePacking] = useState([]);

  // モーダルを開いたときの初期化
  useEffect(() => {
    if (isOpen) {
      const initialDest =
        currentTrip?.mainSpot ||
        (!currentTrip?.title?.startsWith('新しい旅行') ? currentTrip?.title : '') ||
        '';

      const initialStart = currentTrip?.date || defaultTripDate();
      const initialEnd =
        currentTrip?.endDate ||
        calcEndDateFromStayDays(initialStart, currentTrip?.stayDays || 2);

      setDestination(initialDest);
      setStartDate(initialStart);
      setEndDate(initialEnd);
      setStayDays(calcStayDaysFromDates(initialStart, initialEnd));
      setPreferences('');
      setShowDestinationWarning(false);

      setInputText('');
      setCopied(false);
      setEditablePacking([]);
    }
  }, [isOpen, currentTrip]);

  // 持ち物相談プロンプト生成
  const promptText = useMemo(() => {
    return generatePackingPrompt(currentTrip, {
      destination,
      stayDays,
      preferences,
      startDate,
      endDate,
    });
  }, [currentTrip, destination, stayDays, preferences, startDate, endDate]);

  // 入力テキストが変更されたらパースしてローカルステートに反映
  useEffect(() => {
    if (!inputText.trim()) {
      setEditablePacking([]);
      return;
    }

    const result = parseAiPlanText(inputText);
    let items = result.packingList;
    if (items.length === 0 && result.itinerary.length > 0) {
      items = result.itinerary.map((s) => ({
        id: s.id,
        name: s.name,
        priority: 'nice',
        category: 'daily',
        reason: s.memo || 'AIおすすめの持ち物',
        reasonTag: 'AIおすすめ',
        source: 'ai',
      }));
    }

    setEditablePacking(items);
  }, [inputText]);

  // プロンプトをクリップボードにコピー
  const handleCopyPrompt = async () => {
    const cleanDest = (destination || '').trim();
    if (!cleanDest) {
      setShowDestinationWarning(true);
      const inputEl = document.getElementById('ai-packing-dest-input');
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

  // 既存アイテムとの重複チェック
  const nonDuplicateItems = useMemo(() => {
    return filterDuplicateItems(existingItems, editablePacking);
  }, [existingItems, editablePacking]);

  const duplicateCount = editablePacking.length - nonDuplicateItems.length;

  // 追加確定
  const handleConfirmAdd = () => {
    if (nonDuplicateItems.length === 0) return;
    onAddPackingItems(nonDuplicateItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card ai-import-modal-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* モーダルヘッダー */}
        <div className="guide-modal-header">
          <div className="guide-modal-title-group">
            <span className="guide-leaf-icon ai-robot-icon">
              <Icon name="backpack" size={22} />
            </span>
            <div>
              <h2 className="guide-modal-title">AIに持ち物を相談・追加</h2>
              <p className="guide-modal-subtitle">
                目的地や時期・アクティビティに合わせて、AIに必要な持ち物を相談しましょう！
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
          {/* Step 1: プロンプトコピー */}
          <section className="ai-step-card">
            <div className="ai-step-head">
              <span className="ai-step-badge">Step 1</span>
              <h3 className="ai-step-title">行先・条件を決めてプロンプトをコピー</h3>
            </div>
            <p className="ai-step-desc">
              行先や気になる条件（標高が高い、海に入るなど）を入力して相談文を作成します。
            </p>

            {/* 条件入力ミニフォーム */}
            <div className="ai-conditions-form">
              <div className="ai-form-group">
                <label className="ai-field-label" htmlFor="ai-packing-dest-input">
                  📍 行先・エリア <span className="label-required">必須</span>
                </label>
                <input
                  id="ai-packing-dest-input"
                  type="text"
                  className={`ai-field-input ${showDestinationWarning && !(destination || '').trim() ? 'is-invalid' : ''}`}
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    if ((e.target.value || '').trim()) setShowDestinationWarning(false);
                  }}
                  placeholder="例: 上高地、沖縄、北海道、富士山周辺 など"
                />
                {showDestinationWarning && !(destination || '').trim() && (
                  <span className="ai-field-error">※ 行先を入力してください</span>
                )}
              </div>

              {/* カレンダーで出発日と帰着日を選択（泊数は自動計算） */}
              <div className="ai-form-row">
                <div className="ai-form-group flex-1">
                  <label className="ai-field-label">📅 出発日</label>
                  <input
                    type="date"
                    className="ai-field-input"
                    value={startDate}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      setStartDate(nextStart);
                      if (!endDate || nextStart > endDate) {
                        setEndDate(nextStart);
                        setStayDays(1);
                      } else {
                        setStayDays(calcStayDaysFromDates(nextStart, endDate));
                      }
                    }}
                    required
                  />
                </div>

                <div className="ai-form-group flex-1">
                  <label className="ai-field-label">🏁 帰着日（帰る日）</label>
                  <input
                    type="date"
                    className="ai-field-input"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => {
                      const nextEnd = e.target.value;
                      setEndDate(nextEnd);
                      if (startDate && nextEnd < startDate) {
                        setStartDate(nextEnd);
                        setStayDays(1);
                      } else {
                        setStayDays(calcStayDaysFromDates(startDate, nextEnd));
                      }
                    }}
                    required
                  />
                </div>
              </div>

              <div className="ai-form-row">
                <div className="ai-form-group flex-1">
                  <label className="ai-field-label">⏱️ 日程・泊数（自動計算）</label>
                  <div className="ai-calculated-stay-badge">
                    <span className="stay-badge-icon">📅</span>
                    <strong>{formatStayDaysLabel(stayDays)}</strong>
                    <span className="stay-badge-sub">（自動計算）</span>
                  </div>
                </div>

                <div className="ai-form-group flex-1">
                  <label className="ai-field-label">
                    🌲 気になる点・活動（任意）
                  </label>
                  <input
                    type="text"
                    className="ai-field-input"
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    placeholder="例: 標高1500mで肌寒い、海に入る など"
                  />
                </div>
              </div>
            </div>

            <div className="ai-prompt-preview-wrap">
              <pre className="ai-prompt-preview-text">{promptText}</pre>
            </div>

            <div className="ai-prompt-actions">
              <button
                type="button"
                className={`btn ${copied ? 'btn-sage' : 'btn-sage-soft'} btn-sm`}
                onClick={handleCopyPrompt}
              >
                <Icon name={copied ? 'check' : 'copy'} size={15} />
                <span>{copied ? 'コピーしました！' : 'プロンプトをコピー'}</span>
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
          </section>

          {/* Step 2: 回答テキスト貼り付け */}
          <section className="ai-step-card">
            <div className="ai-step-head">
              <span className="ai-step-badge">Step 2</span>
              <h3 className="ai-step-title">AIの回答テキストを貼り付け</h3>
            </div>
            <p className="ai-step-desc">
              AIが提案してくれた持ち物リストをそのままペーストしてください。
            </p>

            <textarea
              className="ai-input-textarea"
              rows={4}
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
                <h3 className="ai-step-title">提案された持ち物の確認</h3>
              </div>

              {/* 検出サマリーバッジ */}
              <div className="ai-parsed-summary-bar">
                <span className="parsed-chip">
                  🎒 検出: <strong>{editablePacking.length}</strong> 点
                </span>
                <span className="parsed-chip">
                  ✨ 新規追加: <strong>{nonDuplicateItems.length}</strong> 点
                </span>
                {duplicateCount > 0 && (
                  <span className="parsed-chip text-muted" title="現在の持ち物リストに既にあるため自動でスキップされます">
                    🛡️ 重複スキップ: {duplicateCount} 点
                  </span>
                )}
              </div>

              {/* 持ち物一覧プレビュー */}
              {editablePacking.length > 0 && (
                <div className="ai-preview-section">
                  <h4 className="preview-sub-title">
                    持ち物アイテム一覧
                    <span className="preview-sub-hint">（バッジをタップで重要度を変更できます）</span>
                  </h4>
                  <div className="preview-packing-grid">
                    {editablePacking.map((item, idx) => {
                      const isDup = existingItems.some(
                        (e) => e && e.name && e.name.replace(/\s+/g, '').toLowerCase() === item.name.replace(/\s+/g, '').toLowerCase()
                      );

                      return (
                        <div
                          key={item.id || idx}
                          className={`preview-packing-item ${isDup ? 'is-duplicate' : ''}`}
                        >
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
                          <span className="packing-item-name">
                            {item.name}
                            {isDup && <span className="duplicate-tag">登録済</span>}
                          </span>
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
                      );
                    })}
                  </div>
                </div>
              )}

              {editablePacking.length === 0 && (
                <div className="ai-preview-empty">
                  <p>⚠️ テキストから持ち物を検出できませんでした。</p>
                  <p className="sub-text">
                    箇条書き形式（- アイテム名：理由）で書かれたテキストを貼り付けてみてください。
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
            disabled={nonDuplicateItems.length === 0}
            onClick={handleConfirmAdd}
          >
            <Icon name="plus" size={16} />
            <span>持ち物リストに追加する（{nonDuplicateItems.length}点）</span>
          </button>
        </div>
      </div>
    </div>
  );
}
