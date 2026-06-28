/**
 * src/screens/KitchenScreen.jsx
 */
import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  StyleSheet, SafeAreaView, StatusBar, Animated,
  TextInput, ScrollView, Alert,
} from 'react-native';
import { COLORS, MENU } from '../constants';
import { useOrderStore } from '../store/orderStore';
import { usePriceStore } from '../store/priceStore';

const KITCHEN_PIN = '250397';

const STATUS_META = {
  pending: { label: 'NEW',       color: '#4caf50', bg: '#0d2a0d' },
  making:  { label: 'MAKING',    color: '#F5C842', bg: '#2d2300' },
  ready:   { label: 'READY',     color: '#E8500A', bg: '#3a1208' },
  done:    { label: 'COLLECTED', color: COLORS.muted, bg: COLORS.bgCard },
};

const ACTION_LABEL = {
  pending: 'Start Making',
  making:  'Mark Ready',
  ready:   'Collected ✓',
  done:    null,
};

const ACTION_COLOR = {
  pending: '#4caf50',
  making:  '#F5C842',
  ready:   '#E8500A',
  done:    null,
};

// ─── Daily Summary ────────────────────────────────────────────
function DailySummary({ orders, onEditPrices, onClearDone }) {
  const today = new Date().toDateString();

  const todayOrders = useMemo(() =>
    orders.filter(o =>
      new Date(o.createdAt).toDateString() === today && o.status === 'done'
    ), [orders, today]);

  const totalRevenue = useMemo(() =>
    todayOrders.reduce((s, o) => s + o.total, 0), [todayOrders]);

  const mostOrdered = useMemo(() => {
    const counts = {};
    todayOrders.forEach(o => {
      o.items.forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + item.qty;
      });
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    const short = top[0].split(' + ').slice(0, 2).join(' + ');
    return { name: short, count: top[1] };
  }, [todayOrders]);

  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryTitle}>TODAY'S SUMMARY</Text>

      {/* Stats row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{todayOrders.length}</Text>
          <Text style={styles.summaryLabel}>Collected</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>R{totalRevenue}</Text>
          <Text style={styles.summaryLabel}>Revenue</Text>
        </View>
        <View style={[styles.summaryCard, { flex: 1.5 }]}>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {mostOrdered ? mostOrdered.name : '—'}
          </Text>
          <Text style={styles.summaryLabel}>
            {mostOrdered ? `Top (×${mostOrdered.count})` : 'No sales yet'}
          </Text>
        </View>
      </View>

      {/* Action buttons inside summary */}
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
          <Text style={styles.pinSub}>Required to edit prices</Text>
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

// ─── Price Editor Modal ───────────────────────────────────────
function PriceEditorModal({ visible, onClose }) {
  const { prices, saveAllPrices, resetPrices } = usePriceStore();

  // Local editable copy — keyed by item id, values are strings for TextInput
  const [draft, setDraft] = useState({});

  // Sync draft when modal opens
  useEffect(() => {
    if (visible) {
      const initial = {};
      MENU.forEach(item => {
        initial[item.id] = String(prices[item.id] ?? item.price);
      });
      setDraft(initial);
    }
  }, [visible, prices]);

  const handleChange = (id, val) => {
    setDraft(prev => ({ ...prev, [id]: val }));
  };

  const handleSave = async () => {
    // Validate — all must be numbers >= 1
    for (const item of MENU) {
      const val = parseInt(draft[item.id], 10);
      if (isNaN(val) || val < 1) {
        Alert.alert('Invalid Price', `Price for "${item.name}" must be a number greater than 0.`);
        return;
      }
    }
    // Convert draft to number map
    const numericPrices = {};
    MENU.forEach(item => {
      numericPrices[item.id] = parseInt(draft[item.id], 10);
    });
    await saveAllPrices(numericPrices);
    Alert.alert('✅ Saved', 'Prices updated successfully.');
    onClose();
  };

  const handleReset = () => {
    Alert.alert('Reset Prices', 'Reset all prices to default?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        await resetPrices();
        onClose();
      }},
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.editorOverlay}>
        <View style={styles.editorCard}>
          <View style={styles.editorHeader}>
            <Text style={styles.editorTitle}>EDIT PRICES</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.editorClose}>✕</Text>
            </TouchableOpacity>
          </View>

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
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>SAVE PRICES</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Kitchen Order Card ───────────────────────────────────────
function KitchenOrderCard({ order, onAdvance }) {
  const meta = STATUS_META[order.status];
  const actionLabel = ACTION_LABEL[order.status];
  const actionColor = ACTION_COLOR[order.status];
  const flash = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (order.status !== 'pending') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(flash, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [order.status, flash]);

  return (
    <View style={[styles.card, { borderLeftColor: meta.color }]}>
      <View style={styles.cardHeader}>
        <View style={styles.orderIdRow}>
          <Animated.View style={[
            styles.statusDot,
            { backgroundColor: meta.color, opacity: order.status === 'pending' ? flash : 1 }
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
  );
}

// ─── Main KitchenScreen ───────────────────────────────────────
export default function KitchenScreen() {
  const { kitchenOrders, advanceOrder, clearDoneOrders } = useOrderStore();
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showPriceEditor, setShowPriceEditor] = useState(false);

  const newCount    = kitchenOrders.filter(o => o.status === 'pending').length;
  const makingCount = kitchenOrders.filter(o => o.status === 'making').length;
  const readyCount  = kitchenOrders.filter(o => o.status === 'ready').length;

  const renderItem = useCallback(({ item }) => (
    <KitchenOrderCard order={item} onAdvance={advanceOrder} />
  ), [advanceOrder]);

  const keyExtractor = useCallback((item) => item.id, []);

  const ListHeader = (
    <View>
      <DailySummary
        orders={kitchenOrders}
        onEditPrices={() => setShowPinPrompt(true)}
        onClearDone={clearDoneOrders}
      />
      <View style={styles.statsRow}>
        {newCount > 0    && <View style={[styles.statChip, { backgroundColor: '#0d2a0d' }]}><Text style={[styles.statText, { color: '#4caf50' }]}>NEW: {newCount}</Text></View>}
        {makingCount > 0 && <View style={[styles.statChip, { backgroundColor: '#2d2300' }]}><Text style={[styles.statText, { color: '#F5C842' }]}>MAKING: {makingCount}</Text></View>}
        {readyCount > 0  && <View style={[styles.statChip, { backgroundColor: '#3a1208' }]}><Text style={[styles.statText, { color: '#E8500A' }]}>READY: {readyCount}</Text></View>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      {/* Clean header — no buttons */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>KITCHEN VIEW</Text>
          <Text style={styles.headerSub}>Kota Corner</Text>
        </View>
      </View>

      {kitchenOrders.length === 0 ? (
        <ScrollView>
          <DailySummary
            orders={kitchenOrders}
            onEditPrices={() => setShowPinPrompt(true)}
            onClearDone={clearDoneOrders}
          />
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🍳</Text>
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySub}>New orders will appear here instantly</Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={kitchenOrders}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <PinPrompt
        visible={showPinPrompt}
        onSuccess={() => { setShowPinPrompt(false); setShowPriceEditor(true); }}
        onDismiss={() => setShowPinPrompt(false)}
      />

      <PriceEditorModal
        visible={showPriceEditor}
        onClose={() => setShowPriceEditor(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  header:         { backgroundColor: COLORS.bg, paddingHorizontal: 20, paddingVertical: 14, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: COLORS.bgCard },
  headerTitle:    { color: COLORS.yellow, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  headerSub:      { color: COLORS.muted, fontSize: 11, marginTop: 2 },

  // Summary
  summaryBox:     { backgroundColor: COLORS.bgCard, margin: 12, borderRadius: 14, padding: 16, gap: 12 },
  summaryTitle:   { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  summaryRow:     { flexDirection: 'row', gap: 10 },
  summaryCard:    { flex: 1, backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, alignItems: 'center', gap: 4 },
  summaryValue:   { color: COLORS.yellow, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  summaryLabel:   { color: COLORS.muted, fontSize: 10, textAlign: 'center', fontWeight: '600' },
  summaryBtns:    { flexDirection: 'row', gap: 8 },
  summaryBtn:     { flex: 1, backgroundColor: COLORS.bg, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent },
  summaryBtnMuted:{ borderColor: COLORS.border },
  summaryBtnText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },

  statsRow:       { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 4, flexWrap: 'wrap' },
  statChip:       { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statText:       { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  list:           { paddingHorizontal: 12, paddingBottom: 20, gap: 12 },
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
  itemsBox:       { backgroundColor: COLORS.bg, borderRadius: 8, padding: 10, gap: 6 },
  itemRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName:       { flex: 1, color: COLORS.text, fontSize: 12, lineHeight: 16 },
  itemQty:        { color: COLORS.muted, fontSize: 12, minWidth: 24, textAlign: 'right' },
  itemPrice:      { color: COLORS.yellow, fontSize: 13, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  footerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel:     { color: COLORS.muted, fontSize: 13 },
  totalAmt:       { color: COLORS.text, fontWeight: '700' },
  actionBtn:      { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  actionBtnText:  { fontSize: 13, fontWeight: '800' },

  empty:          { alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyEmoji:     { fontSize: 52 },
  emptyText:      { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  emptySub:       { color: COLORS.muted, fontSize: 13 },

  // Price editor
  editorOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  editorCard:     { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  editorHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  editorTitle:    { color: COLORS.yellow, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  editorClose:    { color: COLORS.muted, fontSize: 20, padding: 4 },
  editorList:     { marginBottom: 8 },
  editorRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  editorItemNum:  { color: COLORS.yellow, fontWeight: '800', fontSize: 14, minWidth: 22 },
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