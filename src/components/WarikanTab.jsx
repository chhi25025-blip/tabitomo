import React, { useMemo, useState, useEffect } from 'react';
import Icon from './Icon';
import { AVATAR_COLORS } from '../travelData';
import { computeSettlement, yen, uid } from '../utils';
import { generateShareMessageWithUrl } from '../utils/shareUrl';

export default function WarikanTab({
  currentTrip,
  warikanBooks = [],
  activeWarikanId,
  currentWarikanBook,
  onSelectWarikanBook,
  onCreateWarikanBook,
  onRenameWarikanBook,
  onDeleteWarikanBook,
  onResetWarikanExpenses,
  members,
  expenses,
  onAddMember,
  onRemoveMember,
  onAddExpense,
  onDeleteExpense,
}) {
  const [newMemberName, setNewMemberName] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [payerId, setPayerId] = useState(members[0]?.id || '');
  const [participantIds, setParticipantIds] = useState(() => members.map((m) => m.id));
  const [formError, setFormError] = useState('');
  const [copiedWarikanUrl, setCopiedWarikanUrl] = useState(false);

  // わりかん帳の作成・名前変更・削除・リセット用ステート
  const [showCreateBookModal, setShowCreateBookModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [copyMembersOnCreate, setCopyMembersOnCreate] = useState(true);
  const [isRenamingBook, setIsRenamingBook] = useState(false);
  const [renameBookInput, setRenameBookInput] = useState('');
  const [confirmDeleteBook, setConfirmDeleteBook] = useState(null);
  const [confirmResetBook, setConfirmResetBook] = useState(null);

  // 共有URLインポート等・帳簿切替によるメンバー入れ替え時の選択状態同期
  useEffect(() => {
    const validIds = new Set(members.map((m) => m.id));
    if (!validIds.has(payerId)) {
      setPayerId(members[0]?.id || '');
    }
    setParticipantIds((prev) => {
      const filtered = prev.filter((id) => validIds.has(id));
      return filtered.length > 0 ? filtered : members.map((m) => m.id);
    });
    setFormError('');
  }, [members, activeWarikanId]);

  const handleOpenCreateBookModal = () => {
    setNewBookTitle('');
    setCopyMembersOnCreate(members.length > 0);
    setShowCreateBookModal(true);
  };

  const handleCreateBookSubmit = (e) => {
    e.preventDefault();
    onCreateWarikanBook?.({
      title: newBookTitle.trim(),
      copyMembers: copyMembersOnCreate,
    });
    setShowCreateBookModal(false);
    setNewBookTitle('');
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (!renameBookInput.trim() || !currentWarikanBook) return;
    onRenameWarikanBook?.(currentWarikanBook.id, renameBookInput.trim());
    setIsRenamingBook(false);
  };

  // わりかんURLコピーハンドラ
  const handleCopyWarikanShareUrl = async () => {
    const text = generateShareMessageWithUrl(
      currentTrip,
      { title: currentWarikanBook?.title, members, expenses },
      'warikan'
    );
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedWarikanUrl(true);
      setTimeout(() => setCopiedWarikanUrl(false), 4000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  // メンバー追加
  const handleAddMember = (e) => {
    e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;
    if (members.some((m) => m.name === name)) {
      setFormError(`「${name}」は既にメンバーにいます`);
      return;
    }
    const newId = onAddMember(name);
    setParticipantIds((prev) => [...prev, newId]);
    if (!payerId) setPayerId(newId);
    setNewMemberName('');
    setFormError('');
  };

  // 参加者のトグル
  const handleToggleParticipant = (id) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 全員選択 / クリア
  const handleSelectAllParticipants = () => {
    setParticipantIds(members.map((m) => m.id));
  };

  // 支出追加
  const handleAddExpense = (e) => {
    e.preventDefault();
    const amt = Number(expenseAmount);
    if (!expenseTitle.trim()) {
      setFormError('支払い項目（ガソリン代、ランチ代等）を入力してください');
      return;
    }
    if (!amt || amt <= 0) {
      setFormError('金額を正しく入力してください');
      return;
    }
    if (!payerId || !members.some((m) => m.id === payerId)) {
      setFormError('支払った人を選択してください');
      return;
    }
    if (participantIds.length === 0) {
      setFormError('割り勘の対象者を1人以上選んでください');
      return;
    }

    onAddExpense({
      title: expenseTitle.trim(),
      amount: Math.round(amt),
      payerId,
      participantIds,
      date: new Date().toISOString().slice(0, 10),
    });

    setExpenseTitle('');
    setExpenseAmount('');
    setFormError('');
  };

  // 清算アルゴリズム計算
  const settlement = useMemo(() => {
    return computeSettlement(members, expenses);
  }, [members, expenses]);

  const memberMap = useMemo(() => {
    return Object.fromEntries(members.map((m, i) => [m.id, { ...m, colorIndex: i }]));
  }, [members]);

  const isMemberInvolved = (id) => {
    return expenses.some(
      (e) => e.payerId === id || (e.participantIds || []).includes(id)
    );
  };

  return (
    <div className="warikan-tab-page">
      {/* わりかん帳切り替え・保存・作成バー */}
      <section className="card card-trip-switcher">
        <div className="switcher-top">
          <div className="switcher-left-block">
            <div className="switcher-main-heading">
              <Icon name="wallet" size={18} />
              <span className="switcher-title-text">わりかん帳</span>
            </div>
            <span className="badge badge-sage sm switcher-badge">
              保存中: {warikanBooks.length}件
            </span>
          </div>

          <button
            type="button"
            className="btn btn-terracotta btn-sm switcher-add-btn"
            onClick={handleOpenCreateBookModal}
          >
            <Icon name="plus" size={14} /> 新しいわりかんを作成
          </button>
        </div>

        <div className="trip-tabs-scroll">
          {warikanBooks.map((book) => {
            const bookTotal = (book.expenses || []).reduce(
              (sum, e) => sum + (Number(e.amount) || 0),
              0
            );
            return (
              <button
                key={book.id}
                type="button"
                className={`trip-tab-pill ${book.id === currentWarikanBook?.id ? 'is-active' : ''}`}
                onClick={() => {
                  setIsRenamingBook(false);
                  onSelectWarikanBook?.(book.id);
                }}
              >
                <span className="tab-pill-icon">💰</span>
                <span className="tab-pill-title">{book.title}</span>
                <span className="tab-pill-date">{yen(bookTotal)}</span>
              </button>
            );
          })}
        </div>

        {/* 選択中のわりかん帳の名前編集・リセット・削除コントロール */}
        {currentWarikanBook && (
          <div className="warikan-book-bar">
            {isRenamingBook ? (
              <form onSubmit={handleRenameSubmit} className="warikan-rename-form">
                <input
                  type="text"
                  value={renameBookInput}
                  onChange={(e) => setRenameBookInput(e.target.value)}
                  placeholder="例: 日光ドライブ、ゼミ飲み会"
                  className="warikan-rename-input"
                  autoFocus
                  required
                />
                <div className="warikan-rename-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => setIsRenamingBook(false)}
                  >
                    キャンセル
                  </button>
                  <button type="submit" className="btn btn-sage btn-xs">
                    保存
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="warikan-book-meta">
                  <span className="warikan-book-current-label">選択中:</span>
                  <strong className="warikan-book-current-name">{currentWarikanBook.title}</strong>
                </div>
                <div className="warikan-book-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => {
                      setRenameBookInput(currentWarikanBook.title);
                      setIsRenamingBook(true);
                    }}
                    title="このわりかん帳の名前を変更"
                  >
                    <Icon name="edit" size={13} /> 名前変更
                  </button>
                  {expenses.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-outline-subtle btn-xs"
                      onClick={() => setConfirmResetBook(currentWarikanBook)}
                      title="メンバーを残して支出記録だけゼロに戻す（同じメンバーでリピート時に便利）"
                    >
                      🔄 支出リセット
                    </button>
                  )}
                  {warikanBooks.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost-danger btn-xs"
                      onClick={() => setConfirmDeleteBook(currentWarikanBook)}
                      title="このわりかん帳を削除"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* メンバー登録バー */}
      <section className="card card-members">
        <div className="card-header-clean">
          <div className="header-icon-title">
            <Icon name="users" size={18} />
            <h3>メンバー（{members.length}人）</h3>
          </div>
        </div>

        <div className="members-chips-wrap">
          {members.map((m, idx) => (
            <div key={m.id} className="member-avatar-chip">
              <span
                className="member-avatar-circle"
                style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
              >
                {m.name.slice(0, 1)}
              </span>
              <span className="member-name-label">{m.name}</span>
              {members.length > 2 && (
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={() => onRemoveMember(m.id)}
                  disabled={isMemberInvolved(m.id)}
                  title={
                    isMemberInvolved(m.id)
                      ? '支出記録に含まれているため削除できません'
                      : '削除'
                  }
                  aria-label={`${m.name}を削除`}
                >
                  <Icon name="x" size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAddMember} className="add-member-form">
          <input
            type="text"
            value={newMemberName}
            onChange={(e) => {
              setNewMemberName(e.target.value);
              setFormError('');
            }}
            placeholder="新しいメンバーの名前（例: たろう）"
            className="input-clean"
          />
          <button type="submit" className="btn btn-sage-soft btn-sm">
            <Icon name="plus" size={14} /> メンバー追加
          </button>
        </form>
      </section>

      {/* 立て替えの記録フォーム ＆ 支出履歴 */}
      <div className="warikan-two-col">
        {/* 立て替えフォーム */}
        <section className="card card-add-expense">
          <div className="card-header-clean">
            <div className="header-icon-title">
              <Icon name="plus" size={18} />
              <h3>立て替えを記録する</h3>
            </div>
          </div>

          <form onSubmit={handleAddExpense} className="expense-form-stack">
            <div className="form-row">
              <label className="field-block">
                <span className="field-label">項目名</span>
                <input
                  type="text"
                  value={expenseTitle}
                  onChange={(e) => {
                    setExpenseTitle(e.target.value);
                    setFormError('');
                  }}
                  placeholder="例: ガソリン代、ランチ、入場券"
                />
              </label>

              <label className="field-block">
                <span className="field-label">金額 (円)</span>
                <div className="yen-input-wrapper">
                  <span className="yen-symbol">¥</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={expenseAmount}
                    onChange={(e) => {
                      setExpenseAmount(e.target.value);
                      setFormError('');
                    }}
                    placeholder="0"
                  />
                </div>
              </label>
            </div>

            <label className="field-block">
              <span className="field-label">支払った人</span>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="select-clean"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="field-block">
              <div className="field-label-row">
                <span className="field-label">割り勘の対象メンバー</span>
                <button
                  type="button"
                  className="text-link-btn"
                  onClick={handleSelectAllParticipants}
                >
                  全員選択
                </button>
              </div>

              <div className="participant-select-chips">
                {members.map((m, idx) => {
                  const isChecked = participantIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`participant-chip-btn ${isChecked ? 'is-selected' : ''}`}
                      onClick={() => handleToggleParticipant(m.id)}
                    >
                      <span
                        className="member-avatar-circle xs"
                        style={{
                          background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                        }}
                      >
                        {m.name.slice(0, 1)}
                      </span>
                      <span>{m.name}</span>
                      {isChecked && <Icon name="check" size={13} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {formError && (
              <p className="form-error-text">
                <Icon name="x" size={14} /> {formError}
              </p>
            )}

            <button type="submit" className="btn btn-sage btn-block">
              <Icon name="plus" size={16} /> 支出を追加する
            </button>
          </form>
        </section>

        {/* 支出履歴一覧 */}
        <section className="card card-expense-history">
          <div className="card-header-clean">
            <div className="header-icon-title">
              <Icon name="calendar" size={18} />
              <h3>支出の記録（{expenses.length}件）</h3>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="empty-history">
              <p>まだ立て替え記録はありません。</p>
            </div>
          ) : (
            <ul className="expense-history-list">
              {expenses.map((exp) => {
                const payer = memberMap[exp.payerId];
                const count = exp.participantIds?.length || 1;
                const perPerson = Math.round(exp.amount / count);

                return (
                  <li key={exp.id} className="expense-history-item">
                    <div className="expense-avatar-col">
                      <span
                        className="member-avatar-circle sm"
                        style={{
                          background:
                            AVATAR_COLORS[(payer?.colorIndex || 0) % AVATAR_COLORS.length],
                        }}
                      >
                        {payer?.name?.slice(0, 1) || '?'}
                      </span>
                    </div>

                    <div className="expense-main-info">
                      <strong className="expense-item-title">{exp.title}</strong>
                      <span className="expense-item-sub">
                        {payer?.name || '—'} が立替 ・ {count}人で割勘 ({yen(perPerson)}/人)
                      </span>
                    </div>

                    <div className="expense-amount-col">
                      <strong className="expense-total-amt">{yen(exp.amount)}</strong>
                      <button
                        type="button"
                        className="icon-btn danger sm"
                        onClick={() => onDeleteExpense(exp.id)}
                        title="削除"
                        aria-label="削除"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* 清算結果カード（誰が誰にいくら払うか） */}
      <section className="card card-settlement-results">
        <div className="card-header-clean">
          <div className="header-icon-title">
            <Icon name="sparkle" size={18} />
            <div>
              <h3>送金の目安</h3>
              <p className="sub-text">負担額を均等にするための送金プラン</p>
            </div>
          </div>

          <button
            type="button"
            className={`btn btn-sm ${copiedWarikanUrl ? 'btn-sage' : 'btn-outline-subtle'} line-share-head-btn`}
            onClick={handleCopyWarikanShareUrl}
            title="わりかん精算データ（しおり含む）をURLで共有"
          >
            <Icon name={copiedWarikanUrl ? 'check' : 'link'} size={14} />
            <span>{copiedWarikanUrl ? 'URLコピー完了！' : 'URLで共有'}</span>
          </button>
        </div>

        {copiedWarikanUrl && (
          <div className="shiori-toast-banner" role="status" aria-live="polite">
            <span className="toast-icon">🔗</span>
            <span className="toast-msg">
              わりかん共有URLをコピーしました！LINE等に貼ると、みんな同じ精算画面・しおりをそのまま開けます🎉
            </span>
          </div>
        )}

        {/* 支出サマリー数字 */}
        <div className="summary-three-tiles">
          <div className="summary-tile">
            <span className="tile-label">合計支出</span>
            <strong className="tile-value">{yen(settlement.total)}</strong>
          </div>
          <div className="summary-tile">
            <span className="tile-label">1人あたり平均</span>
            <strong className="tile-value">
              {yen(members.length > 0 ? settlement.total / members.length : 0)}
            </strong>
          </div>
          <div className="summary-tile">
            <span className="tile-label">清算送金回数</span>
            <strong className="tile-value">{settlement.transfers.length} 回</strong>
          </div>
        </div>

        {/* 送金カード一覧 */}
        {settlement.transfers.length === 0 ? (
          <div className="settle-zero-box">
            <Icon name="check" size={20} />
            <p>清算は完了しているか、まだ支出がありません。</p>
          </div>
        ) : (
          <div className="transfer-cards-list">
            {settlement.transfers.map((trans, idx) => {
              const fromMember = memberMap[trans.from];
              const toMember = memberMap[trans.to];
              return (
                <div key={idx} className="transfer-item-card">
                  <div className="transfer-person">
                    <span
                      className="member-avatar-circle"
                      style={{
                        background:
                          AVATAR_COLORS[(fromMember?.colorIndex || 0) % AVATAR_COLORS.length],
                      }}
                    >
                      {fromMember?.name?.slice(0, 1) || '?'}
                    </span>
                    <strong className="person-name">{fromMember?.name}</strong>
                    <span className="person-role debt">支払う人</span>
                  </div>

                  <div className="transfer-arrow-area">
                    <span className="transfer-amount-pill">{yen(trans.amount)}</span>
                    <div className="transfer-arrow-graphic">
                      <span className="dash-line" />
                      <Icon name="arrowRight" size={18} />
                    </div>
                  </div>

                  <div className="transfer-person">
                    <span
                      className="member-avatar-circle"
                      style={{
                        background:
                          AVATAR_COLORS[(toMember?.colorIndex || 0) % AVATAR_COLORS.length],
                      }}
                    >
                      {toMember?.name?.slice(0, 1) || '?'}
                    </span>
                    <strong className="person-name">{toMember?.name}</strong>
                    <span className="person-role credit">受け取る人</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 各メンバーの個別収支内訳 */}
        <div className="member-balance-breakdown">
          <h4 className="sub-section-title">メンバー別 立て替え収支</h4>
          <ul className="balance-table-list">
            {members.map((m, idx) => {
              const balance = Math.round(settlement.balances[m.id] || 0);
              const paid = settlement.paid[m.id] || 0;
              return (
                <li key={m.id} className="balance-table-row">
                  <div className="balance-member-col">
                    <span
                      className="member-avatar-circle sm"
                      style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                    >
                      {m.name.slice(0, 1)}
                    </span>
                    <span className="balance-member-name">{m.name}</span>
                  </div>

                  <div className="balance-paid-col">
                    <span className="meta-sub">立替済: {yen(paid)}</span>
                  </div>

                  <div className="balance-result-col">
                    <span
                      className={`balance-badge ${
                        balance > 0 ? 'plus' : balance < 0 ? 'minus' : 'zero'
                      }`}
                    >
                      {balance > 0
                        ? `+${yen(balance)} 受取`
                        : balance < 0
                        ? `${yen(-balance)} 支払`
                        : '±0'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 新しいわりかん帳の作成モーダル */}
      {showCreateBookModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateBookModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>新しいわりかん帳を作成</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowCreateBookModal(false)}
                aria-label="閉じる"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateBookSubmit} className="modal-form">
              <label className="field-block">
                <span className="field-label">わりかんの名前</span>
                <input
                  type="text"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  placeholder="例: 日光ドライブ、ゼミ飲み会、第2回旅行"
                  autoFocus
                />
              </label>

              {members.length > 0 && (
                <label className="warikan-copy-members-check">
                  <input
                    type="checkbox"
                    checked={copyMembersOnCreate}
                    onChange={(e) => setCopyMembersOnCreate(e.target.checked)}
                  />
                  <span>
                    今のメンバー（{members.map((m) => m.name).join('・')}）を引き継ぐ
                    <small>※ 支出記録は0件のまっさらな状態で作成されます</small>
                  </span>
                </label>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreateBookModal(false)}
                >
                  キャンセル
                </button>
                <button type="submit" className="btn btn-sage">
                  <Icon name="plus" size={16} /> 作成する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* わりかん帳の削除確認モーダル */}
      {confirmDeleteBook && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteBook(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>わりかん帳の削除確認</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setConfirmDeleteBook(null)}
                aria-label="閉じる"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <p style={{ margin: '8px 0 18px', fontSize: '0.94rem', lineHeight: 1.6, color: 'var(--text)' }}>
              「<strong>{confirmDeleteBook.title}</strong>」を削除しますか？<br />
              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                ※ メンバーと支出記録もすべて消去されます（元に戻せません）。
              </span>
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmDeleteBook(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="btn btn-terracotta"
                onClick={() => {
                  const targetId = confirmDeleteBook.id;
                  setConfirmDeleteBook(null);
                  onDeleteWarikanBook?.(targetId);
                }}
              >
                <Icon name="trash" size={15} /> 削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 支出リセット確認モーダル */}
      {confirmResetBook && (
        <div className="modal-backdrop" onClick={() => setConfirmResetBook(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>支出記録のリセット確認</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setConfirmResetBook(null)}
                aria-label="閉じる"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <p style={{ margin: '8px 0 18px', fontSize: '0.94rem', lineHeight: 1.6, color: 'var(--text)' }}>
              「<strong>{confirmResetBook.title}</strong>」の支出記録をすべてリセットしますか？<br />
              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                ※ メンバーはそのまま残るので、同じメンバーでのリピート利用に便利です。
              </span>
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmResetBook(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="btn btn-sage"
                onClick={() => {
                  const targetId = confirmResetBook.id;
                  setConfirmResetBook(null);
                  onResetWarikanExpenses?.(targetId);
                }}
              >
                🔄 リセットする
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
