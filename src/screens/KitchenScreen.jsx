/**
 * src/screens/KitchenScreen.jsx
 */
import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  StyleSheet, SafeAreaView, StatusBar, Animated,
  TextInput, ScrollView, Alert, Switch,
} from 'react-native';
import { COLORS, MENU } from '../constants';
import { useOrderStore } from '../store/orderStore';
import { usePriceStore } from '../store/priceStore';

const KITCHEN_PIN = '250397';

const STATUS_META = {
  awaiting_payment: { label: 'AWAITING PAYMENT', color: '#F5C842', bg: '#2d2300' },
  paid:             { label: 'PAID',              color: '#4caf50', bg: '#0d2a0d' },
  making:           { label: 'PREPARING',         color: '#F5C842', bg: '#2d2300' },
  ready:            { label: 'READY',             color: '#E8500A', bg: '#3a1208' },
  done:             { label: 'COLLECTED',         color: COLORS.muted, bg: COLORS.bgCard },
  expired:          { label: 'EXPIRED',           color: '#cc3333', bg: '#2a0d0d' },
  cancelled:        { label: 'CANCELLED',         color: '#cc3333', bg: '#2a0d0d' },
};

const ACTION_LABEL = {
  awaiting_payment: 'Confirm Payment',
  paid:             'Start Preparing',
  making:           'Mark Ready',
  ready:            'Collected ✓',
  done:             null,
  expired:          null,
  cancelled:        null,
};

const ACTION_COLOR = {
  awaiting_payment: '#F5C842',
  paid:             '#4caf50',
  making:           '#F5C842',
  ready:            '#E8500A',
  done:             null,
  expired:          null,
  cancelled:        null,
};

const TABS = [
  { key: 'new',       label: 'New Orders',  statuses: ['awaiting_payment', 'paid'] },
  { key: 'preparing', label: 'Preparing',   statuses: ['making'] },
  { key: 'ready',     label: 'Ready',       statuses: ['ready'] },
  { key: 'completed', label: 'Completed',   statuses: ['done'] },
  { key: 'cancelled', label: 'Cancelled',   statuses: ['expired', 'cancelled'] },
];

// ─── Daily Summary ────────────────────────────────────────────
function DailySummary({ orders, onEditPrices, onClearDone }) {
  const today = new Date().toDateString();

  const todayOrders = useMemo(() =>
    orders.filter(o => new Date(o.createdAt).toDateString() === today), [orders, today]);

  const collectedOrders = useMemo(() =>
    todayOrders.filter(o => o.status === 'done'), [todayOrders]);

  const totalRevenue = useMemo(() =>
    collectedOrders.reduce((s, o) => s + o.total, 0), [collectedOrders]);

  const cancelledCount = useMemo(() =>
    todayOrders.filter(o => o.status === 'cancelled' || o.status === 'expired').length, [todayOrders]);

  const avgOrderValue = useMemo(() =>
    collectedOrders.length > 0 ? Math.round(totalRevenue / collectedOrders.length) : 0,
    [collectedOrders, totalRevenue]);

  const mostOrdered = useMemo(() => {
    const counts = {};
    collectedOrders.forEach(o => {
      o.items.forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + item.qty;
      });
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    const short = top[0].split(' + ').slice(0, 2).join(' + ');
    return { name: short, count: top[1] };
  }, [collectedOrders]);

  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryTitle}>TODAY'S SUMMARY</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{todayOrders.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>R{totalRevenue}</Text>
          <Text style={styles.summaryLabel}>Revenue</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{collectedOrders.length}</Text>
          <Text style={styles.summaryLabel}>Collected</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, cancelledCount > 0 && { color: '#cc3333' }]}>{cancelledCount}</Text>
          <Text style={styles.summaryLabel}>Cancelled</Text>
        </View>
      </View>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { flex: 2 }]}>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {mostOrdered ? mostOrdered.name : '—'}
          </Text>
          <Text style={styles.summaryLabel}>
            {mostOrdered ? `Top item (×${mostOrdered.count})` : 'No sales yet'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>R{avgOrderValue}</Text>
          <Text style={styles.summaryLabel}>Avg Order</Text>
        </View>
      </View>
      <View style={styles.summaryBtns}>
        <TouchableOpacity style={styles.summaryBtn} onPress={onEditPrices}>
          <Text style={styles.summaryBtnText}>💰  Edit Prices</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.summaryBtn, styles.summaryBtnMuted]} onPress={onClearDone}>
          <Text style={[styles.summaryBtnText, { color: COLORS.muted }]}>🗑  Clear Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── PIN Prompt ───────────────────────────────────────────────
function PinPrompt({ visible, onSuccess, onDismiss }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const shake = useRef(new Animated.Value(0)).current;

  const doShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = () => {
    if (pin === KITCHEN_PIN) { setPin(''); setError(''); onSuccess(); }
    else { setError('Wrong PIN.'); setPin(''); doShake(); }
  };

  const handleClose = () => { setPin(''); setError(''); onDismiss(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.pinOverlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity activeOpacity={1} style={styles.pinCard}>
          <Text style={styles.pinTitle}>ENTER PIN</Text>
          <Text style={styles.pinSub}>Required to edit menu</Text>
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <TextInput
              style={[styles.pinInput, error ? { borderColor: '#cc3333' } : null]}
              value={pin}
              onChangeText={(t) => { setPin(t); setError(''); }}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="● ● ● ● ● ●"
              placeholderTextColor={COLORS.muted}
              autoFocus
            />
          </Animated.View>
          {error ? <Text style={styles.pinError}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.pinBtn, pin.length < 4 && styles.pinBtnDisabled]}
            onPress={handleSubmit}
            disabled={pin.length < 4}
          >
            <Text style={styles.pinBtnText}>UNLOCK</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={{ paddingVertical: 6 }}>
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Menu Manager Modal (prices + sold out) ───────────────────
function MenuManagerModal({ visible, onClose }) {
  const { prices, soldOut, saveAllPrices, resetPrices, toggleSoldOut, clearSoldOut } = usePriceStore();
  const [draft, setDraft] = useState({});
  const [activeSection, setActiveSection] = useState('availability');

  useEffect(() => {
    if (visible) {
      const initial = {};
      MENU.forEach(item => { initial[item.id] = String(prices[item.id] ?? item.price); });
      setDraft(initial);
    }
  }, [visible, prices]);

  const handleChange = (id, val) => setDraft(prev => ({ ...prev, [id]: val }));

  const handleSavePrices = async () => {
    for (const item of MENU) {
      const val = parseInt(draft[item.id], 10);
      if (isNaN(val) || val < 1) {
        Alert.alert('Invalid Price', `Price for "${item.name}" must be a number greater than 0.`);
        return;
      }
    }
    const numericPrices = {};
    MENU.forEach(item => { numericPrices[item.id] = parseInt(draft[item.id], 10); });
    await saveAllPrices(numericPrices);
    Alert.alert('✅ Saved', 'Prices updated successfully.');
    onClose();
  };

  const handleReset = () => {
    Alert.alert('Reset Prices', 'Reset all prices to default?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => { await resetPrices(); onClose(); } },
    ]);
  };

  const handleClearSoldOut = () => {
    Alert.alert('Clear Sold Out', 'Mark all items as available again?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', onPress: async () => { await clearSoldOut(); } },
    ]);
  };

  const soldOutCount = Object.values(soldOut).filter(Boolean).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.editorOverlay}>
        <View style={styles.editorCard}>
          {/* Header */}
          <View style={styles.editorHeader}>
            <Text style={styles.editorTitle}>MENU MANAGER</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.editorClose}>✕</Text></TouchableOpacity>
          </View>

          {/* Section tabs */}
          <View style={styles.sectionTabs}>
            <TouchableOpacity
              style={[styles.sectionTab, activeSection === 'availability' && styles.sectionTabActive]}
              onPress={() => setActiveSection('availability')}
            >
              <Text style={[styles.sectionTabText, activeSection === 'availability' && styles.sectionTabTextActive]}>
                Availability {soldOutCount > 0 ? `(${soldOutCount} sold out)` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sectionTab, activeSection === 'prices' && styles.sectionTabActive]}
              onPress={() => setActiveSection('prices')}
            >
              <Text style={[styles.sectionTabText, activeSection === 'prices' && styles.sectionTabTextActive]}>
                Prices
              </Text>
            </TouchableOpacity>
          </View>

          {/* Availability section */}
          {activeSection === 'availability' && (
            <>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.editorList}>
                {MENU.map(item => {
                  const isOut = !!soldOut[item.id];
                  return (
                    <View key={item.id} style={styles.availRow}>
                      <View style={styles.availInfo}>
                        <Text style={[styles.editorItemName, isOut && { color: COLORS.muted }]}>
                          {item.name}
                        </Text>
                        {isOut && (
                          <View style={styles.soldOutBadge}>
                            <Text style={styles.soldOutBadgeText}>SOLD OUT</Text>
                          </View>
                        )}
                      </View>
                      <Switch
                        value={!isOut}
                        onValueChange={() => toggleSoldOut(item.id)}
                        trackColor={{ false: '#4a2010', true: '#2a5a2a' }}
                        thumbColor={isOut ? '#cc3333' : '#4caf50'}
                      />
                    </View>
                  );
                })}
              </ScrollView>
              {soldOutCount > 0 && (
                <TouchableOpacity style={styles.clearSoldOutBtn} onPress={handleClearSoldOut}>
                  <Text style={styles.clearSoldOutText}>✓ Mark All Available</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Prices section */}
          {activeSection === 'prices' && (
            <>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.editorList}>
                {MENU.map(item => (
                  <View key={item.id} style={styles.editorRow}>
                    <Text style={styles.editorItemNum}>{item.id}</Text>
                    <Text style={styles.editorItemName} numberOfLines={2}>{item.name}</Text>
                    <View style={styles.editorPriceWrap}>
                      <Text style={styles.editorR}>R</Text>
                      <TextInput
                        style={styles.editorInput}
                        value={draft[item.id] ?? String(item.price)}
                        onChangeText={(val) => handleChange(item.id, val)}
                        keyboardType="number-pad"
                        maxLength={4}
                        selectTextOnFocus
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.editorFooter}>
                <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                  <Text style={styles.resetBtnText}>Reset Defaults</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSavePrices}>
                  <Text style={styles.saveBtnText}>SAVE PRICES</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Kitchen Order Card ───────────────────────────────────────
function KitchenOrderCard({ order, onAdvance, onCancel }) {
  const meta = STATUS_META[order.status] || STATUS_META.done;
  const actionLabel = ACTION_LABEL[order.status];
  const actionColor = ACTION_COLOR[order.status];
  const flash = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (order.status !== 'paid') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(flash, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [order.status, flash]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      `Cancel order ${order.orderNumber} for ${order.customerName}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => onCancel(order.id) },
      ]
    );
  };

  return (
    <View style={[styles.card, { borderLeftColor: meta.color }]}>
      <View style={styles.cardHeader}>
        <View style={styles.orderIdRow}>
          <Animated.View style={[
            styles.statusDot,
            { backgroundColor: meta.color, opacity: order.status === 'paid' ? flash : 1 }
          ]} />
          <Text style={styles.orderId}>{order.orderNumber}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.timeLabel}>{order.timeLabel}</Text>
        </View>
      </View>

      <Text style={styles.customerName}>{order.customerName.toUpperCase()}</Text>
      {order.customerPhone ? <Text style={styles.customerPhone}>📞 {order.customerPhone}</Text> : null}
      {order.note ? <Text style={styles.orderNote}>📝 {order.note}</Text> : null}

      <View style={styles.itemsBox}>
        {order.items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemQty}>×{item.qty}</Text>
            <Text style={styles.itemPrice}>R{item.subtotal}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.totalLabel}>
          Total: <Text style={styles.totalAmt}>R{order.total}</Text>
        </Text>
        <View style={styles.actionBtns}>
          {order.status !== 'done' && order.status !== 'cancelled' && order.status !== 'expired' && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>✕</Text>
            </TouchableOpacity>
          )}
          {actionLabel && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: actionColor, backgroundColor: actionColor + '22' }]}
              onPress={() => onAdvance(order.id)}
            >
              <Text style={[styles.actionBtnText, { color: actionColor }]}>{actionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────
function EmptyTab({ label }) {
  const messages = {
    'New Orders':  { emoji: '🕐', text: 'No new orders',       sub: 'New orders will appear here' },
    'Preparing':   { emoji: '👨‍🍳', text: 'Nothing preparing',   sub: 'Orders move here when you start making them' },
    'Ready':       { emoji: '✅', text: 'Nothing ready yet',    sub: 'Orders move here when ready for collection' },
    'Completed':   { emoji: '🎉', text: 'No completed orders',  sub: 'Collected orders will appear here' },
    'Cancelled':   { emoji: '❌', text: 'No cancelled orders',  sub: 'Cancelled and expired orders appear here' },
  };
  const m = messages[label] || { emoji: '📋', text: 'No orders', sub: '' };
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>{m.emoji}</Text>
      <Text style={styles.emptyText}>{m.text}</Text>
      <Text style={styles.emptySub}>{m.sub}</Text>
    </View>
  );
}

// ─── Main KitchenScreen ───────────────────────────────────────
export default function KitchenScreen() {
  const { kitchenOrders, advanceOrder, clearDoneOrders, cancelOrder } = useOrderStore();
  const [activeTab, setActiveTab]         = useState('new');
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showMenuManager, setShowMenuManager] = useState(false);

  const tabOrders = useMemo(() => {
    const result = {};
    TABS.forEach(tab => {
      result[tab.key] = kitchenOrders.filter(o => tab.statuses.includes(o.status));
    });
    return result;
  }, [kitchenOrders]);

  const currentTabOrders = tabOrders[activeTab] || [];

  const renderItem = useCallback(({ item }) => (
    <KitchenOrderCard order={item} onAdvance={advanceOrder} onCancel={cancelOrder} />
  ), [advanceOrder, cancelOrder]);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>KITCHEN VIEW</Text>
          <Text style={styles.headerSub}>Kota Corner</Text>
        </View>
      </View>

      <DailySummary
        orders={kitchenOrders}
        onEditPrices={() => setShowPinPrompt(true)}
        onClearDone={clearDoneOrders}
      />

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map(tab => {
          const count = tabOrders[tab.key]?.length || 0;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              {count > 0 && (
                <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {currentTabOrders.length === 0 ? (
        <EmptyTab label={TABS.find(t => t.key === activeTab)?.label} />
      ) : (
        <FlatList
          data={currentTabOrders}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <PinPrompt
        visible={showPinPrompt}
        onSuccess={() => { setShowPinPrompt(false); setShowMenuManager(true); }}
        onDismiss={() => setShowPinPrompt(false)}
      />

      <MenuManagerModal
        visible={showMenuManager}
        onClose={() => setShowMenuManager(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  header:         { backgroundColor: COLORS.bg, paddingHorizontal: 20, paddingVertical: 14, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: COLORS.bgCard },
  headerTitle:    { color: COLORS.yellow, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  headerSub:      { color: COLORS.muted, fontSize: 11, marginTop: 2 },

  summaryBox:     { backgroundColor: COLORS.bgCard, marginHorizontal: 12, marginTop: 12, borderRadius: 14, padding: 14, gap: 10 },
  summaryTitle:   { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  summaryRow:     { flexDirection: 'row', gap: 8 },
  summaryCard:    { flex: 1, backgroundColor: COLORS.bg, borderRadius: 10, padding: 8, alignItems: 'center', gap: 3 },
  summaryValue:   { color: COLORS.yellow, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  summaryLabel:   { color: COLORS.muted, fontSize: 9, textAlign: 'center', fontWeight: '600' },
  summaryBtns:    { flexDirection: 'row', gap: 8 },
  summaryBtn:     { flex: 1, backgroundColor: COLORS.bg, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent },
  summaryBtnMuted:{ borderColor: COLORS.border },
  summaryBtnText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },

  tabScroll:      { maxHeight: 52, marginTop: 10 },
  tabRow:         { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  tab:            { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  tabActive:      { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tabLabel:       { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  tabLabelActive: { color: COLORS.text },
  tabBadge:       { backgroundColor: COLORS.border, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText:   { color: COLORS.muted, fontSize: 10, fontWeight: '800' },
  tabBadgeTextActive: { color: COLORS.text },

  list:           { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20, gap: 12 },
  card:           { backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 16, borderLeftWidth: 4, gap: 8 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderIdRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot:      { width: 8, height: 8, borderRadius: 4 },
  orderId:        { color: COLORS.text, fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  headerRight:    { alignItems: 'flex-end', gap: 4 },
  statusBadge:    { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  statusText:     { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  timeLabel:      { color: COLORS.muted, fontSize: 11 },
  customerName:   { color: COLORS.accent, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  customerPhone:  { color: COLORS.muted, fontSize: 12 },
  orderNote:      { color: COLORS.muted, fontSize: 12, fontStyle: 'italic' },
  itemsBox:       { backgroundColor: COLORS.bg, borderRadius: 8, padding: 10, gap: 6 },
  itemRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName:       { flex: 1, color: COLORS.text, fontSize: 12, lineHeight: 16 },
  itemQty:        { color: COLORS.muted, fontSize: 12, minWidth: 24, textAlign: 'right' },
  itemPrice:      { color: COLORS.yellow, fontSize: 13, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  footerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel:     { color: COLORS.muted, fontSize: 13 },
  totalAmt:       { color: COLORS.text, fontWeight: '700' },
  actionBtns:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cancelBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2a0d0d', borderWidth: 1.5, borderColor: '#cc3333', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText:  { color: '#cc3333', fontSize: 14, fontWeight: '800' },
  actionBtn:      { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  actionBtnText:  { fontSize: 13, fontWeight: '800' },

  emptyWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 40 },
  emptyEmoji:     { fontSize: 48 },
  emptyText:      { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  emptySub:       { color: COLORS.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

  // Menu Manager Modal
  editorOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  editorCard:     { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  editorHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  editorTitle:    { color: COLORS.yellow, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  editorClose:    { color: COLORS.muted, fontSize: 20, padding: 4 },

  sectionTabs:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sectionTab:     { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  sectionTabActive:{ backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  sectionTabText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  sectionTabTextActive: { color: COLORS.text },

  // Availability rows
  availRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  availInfo:      { flex: 1, gap: 4 },
  soldOutBadge:   { alignSelf: 'flex-start', backgroundColor: '#2a0d0d', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#cc3333' },
  soldOutBadgeText:{ color: '#cc3333', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  clearSoldOutBtn:{ backgroundColor: '#0d2a0d', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#4caf50' },
  clearSoldOutText:{ color: '#4caf50', fontSize: 13, fontWeight: '700' },

  // Price editor rows
  editorList:     { marginBottom: 8 },
  editorRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  editorItemNum:  { color: COLORS.yellow, fontWeight: '800', fontSize: 14, minWidth: 28 },
  editorItemName: { flex: 1, color: COLORS.text, fontSize: 11, lineHeight: 15 },
  editorPriceWrap:{ flexDirection: 'row', alignItems: 'center', gap: 2 },
  editorR:        { color: COLORS.muted, fontSize: 13 },
  editorInput:    { backgroundColor: COLORS.bg, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, color: COLORS.yellow, fontSize: 16, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 6, minWidth: 60, textAlign: 'center' },
  editorFooter:   { flexDirection: 'row', gap: 10, paddingTop: 12 },
  resetBtn:       { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  resetBtnText:   { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  saveBtn:        { flex: 2, backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnText:    { color: COLORS.text, fontSize: 14, fontWeight: '800', letterSpacing: 1 },

  // PIN
  pinOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  pinCard:        { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 28, width: '82%', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border },
  pinTitle:       { color: COLORS.yellow, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  pinSub:         { color: COLORS.muted, fontSize: 12 },
  pinInput:       { backgroundColor: COLORS.bg, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 20, paddingVertical: 12, color: COLORS.text, fontSize: 22, letterSpacing: 8, textAlign: 'center', width: 200 },
  pinError:       { color: '#cc3333', fontSize: 12 },
  pinBtn:         { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  pinBtnDisabled: { backgroundColor: '#4a2010' },
  pinBtnText:     { color: COLORS.text, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});