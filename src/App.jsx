import React, { useState, useEffect } from 'react';
import Icon from './components/Icon';
import SearchTab from './components/SearchTab';
import ShioriTab from './components/ShioriTab';
import MochimonoTab from './components/MochimonoTab';
import WarikanTab from './components/WarikanTab';
import GuideModal from './components/GuideModal';
import {
  INITIAL_TRIPS,
  INITIAL_MY_ITEMS,
  INITIAL_WARIKAN_MEMBERS,
  INITIAL_WARIKAN_PAYMENTS,
} from './travelData';
import { usePersistentState, uid, defaultTripDate } from './utils';

const TAB_DEFS = [
  { id: 'search', label: 'たびさがし', longLabel: 'たびさがし', icon: 'compass', desc: '行先や寄り道カフェを探す' },
  { id: 'shiori', label: 'しおり', longLabel: '旅のしおり', icon: 'book', desc: '旅程スケジュールと全体ルート' },
  { id: 'mochimono', label: 'もちもの', longLabel: 'もちもの準備', icon: 'backpack', desc: '旅先との照合＆マイアイテム' },
  { id: 'warikan', label: 'わりかん', longLabel: 'わりかん清算', icon: 'wallet', desc: '旅先での立て替え・スマート清算' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('shiori');

  // 使い方ガイドモーダル開閉ステート
  const [showGuideModal, setShowGuideModal] = useState(false);

  // 初回訪問時：スマホ（画面幅768px以下）の場合はポップアップでガイドを表示
  useEffect(() => {
    try {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      const dismissed = sessionStorage.getItem('tabitomo_guide_dismissed') === 'true';
      if (isMobile && !dismissed) {
        setShowGuideModal(true);
      }
    } catch {}
  }, []);

  const handleCloseGuideModal = () => {
    setShowGuideModal(false);
    try {
      sessionStorage.setItem('tabitomo_guide_dismissed', 'true');
    } catch {}
  };

  // 旅行リスト（最大5件、localStorage永続化）
  const [trips, setTrips] = usePersistentState('tabitomo.trips', INITIAL_TRIPS);
  const [activeTripId, setActiveTripId] = usePersistentState(
    'tabitomo.activeTripId',
    INITIAL_TRIPS[0]?.id || 'trip-hakone'
  );

  // マイアイテム（手持ちのギア・日用品、localStorage永続化）
  const [myItems, setMyItems] = usePersistentState(
    'tabitomo.myItems',
    INITIAL_MY_ITEMS
  );

  // わりかんメンバー＆立替記録（単体利用OK、localStorage永続化）
  const [members, setMembers] = usePersistentState(
    'tabitomo.members',
    INITIAL_WARIKAN_MEMBERS
  );
  const [expenses, setExpenses] = usePersistentState(
    'tabitomo.expenses',
    INITIAL_WARIKAN_PAYMENTS
  );

  // たびさがしタブで追加する際に対象とする日程（何日目か: 1, 2, 3...）
  const [targetDayForAdd, setTargetDayForAdd] = useState(1);

  // トースト通知
  const [toastMsg, setToastMsg] = useState(null);
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // しおりタブから「たびさがし」へ日程を指定して遷移するハンドラ
  const handleSwitchToSearchTab = (dayNum = 1) => {
    setTargetDayForAdd(Number(dayNum) || 1);
    setActiveTab('search');
  };

  // 有効な旅行リスト（配列でない場合や空の場合は INITIAL_TRIPS で自己修復）
  const safeTrips =
    Array.isArray(trips) && trips.length > 0 ? trips : INITIAL_TRIPS;

  // 現在選択中の旅行（なければ先頭）
  const currentTrip =
    safeTrips.find((t) => t.id === activeTripId) || safeTrips[0] || INITIAL_TRIPS[0];

  /* ---------------- 旅行（しおり）操作 ---------------- */
  // 新規旅行作成（最大5件まで）
  const handleCreateTrip = () => {
    if (trips.length >= 5) {
      showToast('しおりは最大5件まで作成できます');
      return;
    }
    const newTripId = uid('trip');
    const newTrip = {
      id: newTripId,
      title: `新しい旅行 ${trips.length + 1}`,
      date: defaultTripDate(),
      stayDays: 2, // デフォルト1泊2日
      startPoint: {
        name: '自宅・出発地',
        time: '08:30',
        memo: '集合・出発',
      },
      mainSpot: '',
      style: 'drive',
      memo: '目的地を検索してスポットを追加しましょう 🌿',
      itinerary: [],
      checkedPacking: {},
      excludedPacking: {},
    };

    setTrips((prev) => [...prev, newTrip]);
    setActiveTripId(newTripId);
    showToast(`「${newTrip.title}」を作成しました`);
  };

  // 旅行削除
  const handleDeleteTrip = (tripId) => {
    if (trips.length <= 1) {
      showToast('最低1件のしおりは保持されます');
      return;
    }
    const remaining = trips.filter((t) => t.id !== tripId);
    setTrips(remaining);
    if (activeTripId === tripId) {
      setActiveTripId(remaining[0].id);
    }
    showToast('旅行のしおりを削除しました');
  };

  // 旅行メタデータ更新
  const handleUpdateTripMeta = (tripId, patch) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, ...patch } : t))
    );
    showToast('旅行情報を更新しました');
  };

  // しおり旅程（スポット一覧）更新
  const handleUpdateItinerary = (tripId, newItinerary) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          itinerary: newItinerary,
        };
      })
    );
  };

  // スポットをしおりに追加（たびさがしタブからワンタップ）
  const handleAddSpotToCurrentTrip = (spotItem) => {
    if (!currentTrip) return;
    const nextItinerary = [...(currentTrip.itinerary || []), spotItem];
    handleUpdateItinerary(currentTrip.id, nextItinerary);
  };

  /* ---------------- もちもの操作 ---------------- */
  // チェックボックス切り替え
  const handleToggleCheckPacking = (tripId, itemName) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t;
        const currentChecked = t.checkedPacking || {};
        return {
          ...t,
          checkedPacking: {
            ...currentChecked,
            [itemName]: !currentChecked[itemName],
          },
        };
      })
    );
  };

  // 持ち物除外トグル（今回は不要）
  const handleToggleExcludePacking = (tripId, itemName) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t;
        const currentExcluded = t.excludedPacking || {};
        const isExcluded = Boolean(currentExcluded[itemName]);
        const nextExcluded = { ...currentExcluded };
        if (isExcluded) {
          delete nextExcluded[itemName];
        } else {
          nextExcluded[itemName] = true;
        }
        return {
          ...t,
          excludedPacking: nextExcluded,
        };
      })
    );
  };

  // マイアイテム追加
  const handleAddMyItem = (name, category) => {
    const newItem = {
      id: uid('item'),
      name,
      category,
      owned: true,
    };
    setMyItems((prev) => [newItem, ...prev]);
    showToast(`「${name}」をマイアイテムに登録しました`);
  };

  // マイアイテムの所持トグル
  const handleToggleMyItemOwned = (itemId) => {
    setMyItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, owned: !i.owned } : i))
    );
  };

  // マイアイテム削除
  const handleDeleteMyItem = (itemId) => {
    setMyItems((prev) => prev.filter((i) => i.id !== itemId));
    showToast('アイテムを削除しました');
  };

  // 不足品をワンタップでマイアイテム（所持済み）にクイック追加
  const handleQuickAddMissingToMyItems = (name, category, targetTripId) => {
    const existing = myItems.find((i) => i.name === name);
    if (existing) {
      setMyItems((prev) =>
        prev.map((i) => (i.id === existing.id ? { ...i, owned: true } : i))
      );
    } else {
      setMyItems((prev) => [
        { id: uid('item'), name, category, owned: true },
        ...prev,
      ]);
    }
    // チェックも同時にONにする
    const tripToUpdate = targetTripId || currentTrip?.id;
    if (tripToUpdate) {
      handleToggleCheckPacking(tripToUpdate, name);
    }
    showToast(`「${name}」をマイアイテムに登録し、チェックしました`);
  };

  /* ---------------- わりかん操作（単体利用OK） ---------------- */
  const handleAddMember = (name) => {
    const id = uid('member');
    setMembers((prev) => [...prev, { id, name }]);
    showToast(`メンバー「${name}」を追加しました`);
    return id;
  };

  const handleRemoveMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    showToast('メンバーを削除しました');
  };

  const handleAddExpense = (expenseData) => {
    const newExpense = {
      id: uid('expense'),
      ...expenseData,
    };
    setExpenses((prev) => [newExpense, ...prev]);
    showToast(`「${expenseData.title}」の立て替えを記録しました`);
  };

  const handleDeleteExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast('支出記録を削除しました');
  };

  const currentTabMeta = TAB_DEFS.find((t) => t.id === activeTab) || TAB_DEFS[0];

  return (
    <div className="tabitomo-app">
      {/* ===== 上部ヘッダー ===== */}
      <header className="app-top-header">
        <div className="header-container">
          <div className="brand-logo" onClick={() => setActiveTab('shiori')}>
            <span className="brand-leaf-icon" aria-hidden="true">
              <Icon name="leaf" size={20} strokeWidth={2.4} />
            </span>
            <div className="brand-text-group">
              <h1 className="brand-app-name">タビトモ</h1>
              <span className="brand-app-tagline">
                旅のしおり・もちもの・わりかん
              </span>
            </div>
          </div>

          <div className="header-right-group">
            {/* PC向け ナビゲーションタブ */}
            <nav className="desktop-tab-nav" aria-label="メインメニュー">
              {TAB_DEFS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tab-nav-btn ${activeTab === t.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                  aria-current={activeTab === t.id ? 'page' : undefined}
                >
                  <Icon name={t.icon} size={16} />
                  <span>{t.longLabel}</span>
                </button>
              ))}
            </nav>

            {/* ヘッダー右端のはてなマーク（使い方ガイド） */}
            <button
              type="button"
              className="btn-help-circle header-help-btn"
              onClick={() => setShowGuideModal(true)}
              title="使い方ガイドを見る"
              aria-label="使い方ガイドを見る"
            >
              <Icon name="helpCircle" size={19} />
            </button>
          </div>
        </div>
      </header>

      {/* ===== メインコンテンツ ===== */}
      <main className="main-content-area">
        <div className="page-max-container">
          {/* 1. たびさがし */}
          <div
            className="tab-content-panel"
            style={{ display: activeTab === 'search' ? 'block' : 'none' }}
          >
            <SearchTab
              currentTrip={currentTrip}
              targetDay={targetDayForAdd}
              onSetTargetDay={setTargetDayForAdd}
              onAddSpotToTrip={handleAddSpotToCurrentTrip}
              onSwitchToShioriTab={() => setActiveTab('shiori')}
            />
          </div>

          {/* 2. しおり（全体ルートマップ＆タイムライン） */}
          <div
            className="tab-content-panel"
            style={{ display: activeTab === 'shiori' ? 'block' : 'none' }}
          >
            <ShioriTab
              trips={safeTrips}
              activeTripId={activeTripId}
              onSelectTrip={(id) => setActiveTripId(id)}
              onCreateTrip={handleCreateTrip}
              onDeleteTrip={handleDeleteTrip}
              onUpdateTripMeta={handleUpdateTripMeta}
              onUpdateItinerary={handleUpdateItinerary}
              onSwitchToSearchTab={handleSwitchToSearchTab}
            />
          </div>

          {/* 3. もちもの */}
          <div
            className="tab-content-panel"
            style={{ display: activeTab === 'mochimono' ? 'block' : 'none' }}
          >
            <MochimonoTab
              trips={safeTrips}
              activeTripId={activeTripId}
              onSelectTrip={(id) => setActiveTripId(id)}
              currentTrip={currentTrip}
              myItems={myItems}
              onToggleCheckPacking={handleToggleCheckPacking}
              onToggleExcludePacking={handleToggleExcludePacking}
              onAddMyItem={handleAddMyItem}
              onToggleMyItemOwned={handleToggleMyItemOwned}
              onDeleteMyItem={handleDeleteMyItem}
              onQuickAddMissingToMyItems={handleQuickAddMissingToMyItems}
            />
          </div>

          {/* 4. わりかん（単体利用OK） */}
          <div
            className="tab-content-panel"
            style={{ display: activeTab === 'warikan' ? 'block' : 'none' }}
          >
            <WarikanTab
              members={members}
              expenses={expenses}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          </div>
        </div>
      </main>

      {/* ===== モバイル向け ボトム固定ナビゲーション ===== */}
      <nav className="mobile-bottom-nav" aria-label="モバイルナビゲーション">
        {TAB_DEFS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`bottom-nav-item ${activeTab === t.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="bottom-nav-icon">
              <Icon name={t.icon} size={21} />
            </span>
            <span className="bottom-nav-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ===== トースト通知 ===== */}
      {toastMsg && (
        <div className="app-toast-alert" role="status">
          <Icon name="leaf" size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ===== 使い方ガイドモーダル（ポップアップ） ===== */}
      <GuideModal
        isOpen={showGuideModal}
        onClose={handleCloseGuideModal}
      />
    </div>
  );
}
