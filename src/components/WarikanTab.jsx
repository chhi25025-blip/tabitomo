import React, { useMemo, useState } from 'react';
import Icon from './Icon';
import { AVATAR_COLORS } from '../travelData';
import { computeSettlement, yen, uid } from '../utils';

export default function WarikanTab({
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
      {/* ヒーロー紹介 */}
      <section className="botanical-hero-card">
        <div className="hero-text">
          <span className="leaf-badge">
            <Icon name="wallet" size={15} /> わりかん
          </span>
          <h2>立て替えをスマートに、最小回数で清算</h2>
          <p className="hero-desc">
            旅先でのガソリン代・食事代・チケット代などの立て替えをサッと記録。
            しおりを作っていなくても、日常のドライブや飲み会でもこのタブ単体ですぐに使えます。
          </p>
        </div>
        <div className="hero-leaf-deco" aria-hidden="true">
          <Icon name="wallet" size={64} strokeWidth={1.4} />
        </div>
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
              <h3>スマート清算（最小送金ステップ）</h3>
              <p className="sub-text">合計支出と1人あたりの負担から自動計算</p>
            </div>
          </div>
        </div>

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
    </div>
  );
}
