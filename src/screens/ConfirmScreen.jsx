/**
 * src/screens/ConfirmScreen.jsx
 * Live order status tracker via Supabase realtime (through orderStore)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Animated, ScrollView, Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { COLORS } from '../constants';
import { useOrderStore } from '../store/orderStore';

// ─── Status stages ────────────────────────────────────────────
const STAGES = [
  {
    key: 'awaiting_payment',
    label: 'Awaiting Payment',
    icon: '⏳',
    sub: 'Pay within 30 minutes to confirm your order',
  },
  {
    key: 'paid',
    label: 'Payment Confirmed',
    icon: '💳',
    sub: 'Your payment has been confirmed',
  },
  {
    key: 'making',
    label: 'Being Prepared',
    icon: '👨‍🍳',
    sub: 'Your kota is being freshly made',
  },
  {
    key: 'ready',
    label: 'Ready to Collect!',
    icon: '✅',
    sub: 'Come to the counter with your order number',
  },
];

const STATUS_INDEX = {
  awaiting_payment: 0,
  paid: 1,
  making: 2,
  ready: 3,
  done: 4,
  expired: -1,
  cancelled: -1,
};

// ─── Live Status Tracker ──────────────────────────────────────
function StatusTracker({ status }) {
  const currentIdx = STATUS_INDEX[status] ?? 0;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  if (status === 'expired') {
    return (
      <View style={styles.trackerBox}>
        <View style={styles.expiredBox}>
          <Text style={styles.expiredIcon}>⏰</Text>
          <Text style={styles.expiredTitle}>Order Expired</Text>
          <Text style={styles.expiredSub}>Payment was not confirmed within 30 minutes. Please place a new order.</Text>
        </View>
      </View>
    );
  }

  if (status === 'cancelled') {
    return (
      <View style={styles.trackerBox}>
        <View style={styles.cancelledBox}>
          <Text style={styles.expiredIcon}>❌</Text>
          <Text style={styles.expiredTitle}>Order Cancelled</Text>
          <Text style={styles.expiredSub}>This order has been cancelled. Please place a new order.</Text>
        </View>
      </View>
    );
  }

  if (status === 'done') {
    return (
      <View style={styles.trackerBox}>
        <View style={styles.doneBox}>
          <Text style={styles.expiredIcon}>🎉</Text>
          <Text style={styles.doneTitle}>Order Collected!</Text>
          <Text style={styles.expiredSub}>Thank you for your order. Enjoy your kota!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.trackerBox}>
      <Text style={styles.trackerTitle}>ORDER STATUS</Text>
      {STAGES.map((stage, idx) => {
        const isDone    = currentIdx > idx;
        const isActive  = currentIdx === idx;
        const isPending = currentIdx < idx;

        return (
          <View key={stage.key} style={styles.stageWrap}>
            {/* Connector line */}
            {idx > 0 && (
              <View style={styles.connectorWrap}>
                <View style={[styles.connector, isDone ? styles.connectorDone : styles.connectorPending]} />
              </View>
            )}

            <View style={styles.stageRow}>
              {/* Circle */}
              <Animated.View style={[
                styles.stageCircle,
                isDone    && styles.stageCircleDone,
                isActive  && styles.stageCircleActive,
                isPending && styles.stageCirclePending,
                isActive  && { transform: [{ scale: pulse }] },
              ]}>
                <Text style={styles.stageIcon}>
                  {isDone ? '✓' : stage.icon}
                </Text>
              </Animated.View>

              {/* Label */}
              <View style={styles.stageLabelWrap}>
                <Text style={[
                  styles.stageLabel,
                  isDone    && styles.stageLabelDone,
                  isActive  && styles.stageLabelActive,
                  isPending && styles.stageLabelPending,
                ]}>
                  {stage.label}
                </Text>
                {isActive && (
                  <Text style={styles.stageSub}>{stage.sub}</Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main ConfirmScreen ───────────────────────────────────────
export default function ConfirmScreen({ navigation }) {
  const { lastOrder, clearLastOrder, markOrderAsPaid, expireOrder } = useOrderStore();
  const pulse      = useRef(new Animated.Value(1)).current;
  const receiptRef = useRef(null);
  const [saving, setSaving]   = useState(false);
  const [sharing, setSharing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  // Pulse animation for order number
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  // Payment countdown timer
  useEffect(() => {
    if (!lastOrder?.expiresAt || lastOrder.status !== 'awaiting_payment') return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((lastOrder.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) expireOrder(lastOrder.id);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [lastOrder?.id, lastOrder?.expiresAt, lastOrder?.status, expireOrder]);

  const handleNewOrder = () => {
    clearLastOrder();
    navigation.navigate('Menu');
  };

  const handlePay = async () => {
    if (!lastOrder?.id) return;
    await markOrderAsPaid(lastOrder.id);
  };

  const captureReceipt = () => new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const uri = await captureRef(receiptRef, { format: 'png', quality: 1, result: 'tmpfile' });
        resolve(uri);
      } catch (e) { reject(e); }
    }, 400);
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      const uri = await captureReceipt();
      const { status } = await MediaLibrary.requestPermissionsAsync(false);
      if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow gallery access.'); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('✅ Saved!', 'Receipt saved to your gallery.');
    } catch (e) {
      Alert.alert('Error', `${e?.message || 'Could not save receipt.'}`);
    } finally { setSaving(false); }
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      const uri = await captureReceipt();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Kota Corner Order ${lastOrder?.orderNumber}`, UTI: 'public.png' });
    } catch (e) {
      Alert.alert('Error', `${e?.message || 'Could not share receipt.'}`);
    } finally { setSharing(false); }
  };

  const countdownText = useMemo(() => {
    if (timeLeft === null || lastOrder?.status !== 'awaiting_payment') return null;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [timeLeft, lastOrder?.status]);

  const isActive = lastOrder?.status && !['done', 'expired', 'cancelled'].includes(lastOrder.status);

  if (!lastOrder) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.fallback}>
          <Text style={styles.sub}>Something went wrong.</Text>
          <TouchableOpacity style={styles.newOrderBtn} onPress={() => navigation.navigate('Menu')}>
            <Text style={styles.newOrderText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

        {/* Check / hourglass */}
        <View style={[styles.checkCircle, lastOrder.status === 'ready' && styles.checkCircleReady]}>
          <Text style={styles.checkMark}>
            {lastOrder.status === 'ready' ? '🍞' : lastOrder.status === 'awaiting_payment' ? '⏳' : '✓'}
          </Text>
        </View>

        <Text style={styles.title}>
          {lastOrder.status === 'ready' ? 'READY TO COLLECT!' :
           lastOrder.status === 'awaiting_payment' ? 'PAYMENT REQUIRED' :
           lastOrder.status === 'paid' ? 'PAYMENT CONFIRMED' :
           lastOrder.status === 'making' ? 'BEING PREPARED' :
           lastOrder.status === 'done' ? 'ORDER COMPLETE' : 'ORDER PLACED'}
        </Text>

        {/* Pulsing order number */}
        <Animated.Text style={[styles.orderNum, { transform: [{ scale: pulse }] }]}>
          {lastOrder.orderNumber}
        </Animated.Text>

        {/* Countdown timer */}
        {countdownText && (
          <View style={styles.countdownBox}>
            <Text style={styles.countdownLabel}>Payment window closes in</Text>
            <Text style={[
              styles.countdownValue,
              timeLeft < 300 && { color: '#cc3333' }
            ]}>{countdownText}</Text>
          </View>
        )}

        {/* Live status tracker */}
        <StatusTracker status={lastOrder.status} />

        {/* Pay now button */}
        {lastOrder.status === 'awaiting_payment' && (
          <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
            <Text style={styles.payBtnText}>💳  CONFIRM PAYMENT</Text>
          </TouchableOpacity>
        )}

        {/* Ready notification */}
        {lastOrder.status === 'ready' && (
          <View style={styles.readyBanner}>
            <Text style={styles.readyBannerText}>
              🎉 Show order {lastOrder.orderNumber} at the counter to collect your kota!
            </Text>
          </View>
        )}

        {/* Receipt card — capturable */}
        <View ref={receiptRef} collapsable={false} style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptShop}>KOTA CORNER</Text>
            <Text style={styles.receiptTime}>{lastOrder.timeLabel}</Text>
          </View>

          <View style={styles.orderNumBox}>
            <Text style={styles.receiptOrderLabel}>ORDER NUMBER</Text>
            <Text style={styles.receiptOrderNum}>{lastOrder.orderNumber}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>{lastOrder.customerName.toUpperCase()}</Text>
            {lastOrder.customerPhone ? <Text style={styles.infoValueSmall}>{lastOrder.customerPhone}</Text> : null}
          </View>

          {lastOrder.note ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Note</Text>
              <Text style={styles.infoValueSmall}>{lastOrder.note}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          {lastOrder.items.map((item) => (
            <View key={item.id} style={styles.receiptRow}>
              <Text style={styles.receiptQty}>{item.qty}×</Text>
              <Text style={styles.receiptItem} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.receiptPrice}>R{item.subtotal}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.receiptTotalRow}>
            <Text style={styles.receiptTotalLabel}>TOTAL</Text>
            <Text style={styles.receiptTotalAmt}>R{lastOrder.total}</Text>
          </View>

          <Text style={styles.receiptFooter}>📞 +27 73 786 9844  ·  +27 78 954 9721</Text>
          <Text style={styles.receiptFooterSub}>Thank you for your order!</Text>
        </View>

        {/* Save / Share buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.saveBtn, (saving || sharing) && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving || sharing}
          >
            <Text style={styles.actionBtnText}>{saving ? 'Saving...' : '📥  Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.shareBtn, (saving || sharing) && styles.btnDisabled]}
            onPress={handleShare}
            disabled={saving || sharing}
          >
            <Text style={styles.actionBtnText}>{sharing ? 'Sharing...' : '📤  Share'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.newOrderBtn} onPress={handleNewOrder}>
          <Text style={styles.newOrderText}>BACK TO MENU</Text>
        </TouchableOpacity>

        <Text style={styles.contact}>📞  +27 73 786 9844  ·  +27 78 954 9721</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: COLORS.bg },
  inner:              { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 28, gap: 14 },
  fallback:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },

  checkCircle:        { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  checkCircleReady:   { backgroundColor: '#4caf50' },
  checkMark:          { fontSize: 30 },
  title:              { color: COLORS.yellow, fontSize: 18, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  orderNum:           { color: COLORS.text, fontSize: 44, fontWeight: '900', letterSpacing: 8 },
  sub:                { color: COLORS.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Countdown
  countdownBox:       { backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  countdownLabel:     { color: COLORS.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  countdownValue:     { color: COLORS.yellow, fontSize: 32, fontWeight: '900' },

  // Status tracker
  trackerBox:         { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  trackerTitle:       { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  stageWrap:          { gap: 0 },
  connectorWrap:      { paddingLeft: 15, height: 20, justifyContent: 'center' },
  connector:          { width: 2, flex: 1 },
  connectorDone:      { backgroundColor: COLORS.accent },
  connectorPending:   { backgroundColor: COLORS.border },
  stageRow:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  stageCircle:        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stageCircleDone:    { backgroundColor: COLORS.accent },
  stageCircleActive:  { backgroundColor: COLORS.accent, borderWidth: 3, borderColor: COLORS.yellow },
  stageCirclePending: { backgroundColor: COLORS.bgDeep, borderWidth: 1.5, borderColor: COLORS.border },
  stageIcon:          { fontSize: 14 },
  stageLabelWrap:     { flex: 1 },
  stageLabel:         { fontSize: 13, fontWeight: '700' },
  stageLabelDone:     { color: COLORS.accent },
  stageLabelActive:   { color: COLORS.yellow },
  stageLabelPending:  { color: COLORS.muted },
  stageSub:           { color: COLORS.muted, fontSize: 11, marginTop: 2 },

  // Special states
  expiredBox:         { alignItems: 'center', gap: 8, padding: 8 },
  cancelledBox:       { alignItems: 'center', gap: 8, padding: 8 },
  doneBox:            { alignItems: 'center', gap: 8, padding: 8 },
  expiredIcon:        { fontSize: 36 },
  expiredTitle:       { color: '#cc3333', fontSize: 16, fontWeight: '800' },
  doneTitle:          { color: '#4caf50', fontSize: 16, fontWeight: '800' },
  expiredSub:         { color: COLORS.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Pay button
  payBtn:             { backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center' },
  payBtnText:         { color: COLORS.text, fontSize: 15, fontWeight: '800', letterSpacing: 1 },

  // Ready banner
  readyBanner:        { backgroundColor: '#0d2a0d', borderRadius: 14, padding: 14, width: '100%', borderWidth: 1, borderColor: '#4caf50' },
  readyBannerText:    { color: '#4caf50', fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 20 },

  // Receipt
  receiptCard:        { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 20, width: '100%', gap: 10, borderWidth: 1, borderColor: COLORS.border },
  receiptHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptShop:        { color: COLORS.yellow, fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  receiptTime:        { color: COLORS.muted, fontSize: 11 },
  orderNumBox:        { alignItems: 'center', paddingVertical: 12, backgroundColor: COLORS.bg, borderRadius: 10 },
  receiptOrderLabel:  { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  receiptOrderNum:    { color: COLORS.yellow, fontSize: 48, fontWeight: '900', letterSpacing: 8 },
  infoBox:            { backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, gap: 2 },
  infoLabel:          { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  infoValue:          { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  infoValueSmall:     { color: COLORS.muted, fontSize: 12 },
  divider:            { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  receiptRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  receiptQty:         { color: COLORS.yellow, fontWeight: '800', fontSize: 13, minWidth: 24 },
  receiptItem:        { flex: 1, color: COLORS.text, fontSize: 12, lineHeight: 17 },
  receiptPrice:       { color: COLORS.yellow, fontSize: 13, fontWeight: '700' },
  receiptTotalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTotalLabel:  { color: COLORS.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  receiptTotalAmt:    { color: COLORS.yellow, fontSize: 22, fontWeight: '900' },
  receiptFooter:      { color: COLORS.muted, fontSize: 10, textAlign: 'center', marginTop: 4 },
  receiptFooterSub:   { color: COLORS.muted, fontSize: 10, textAlign: 'center' },

  // Buttons
  btnRow:             { flexDirection: 'row', gap: 12, width: '100%' },
  actionBtn:          { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtn:            { backgroundColor: COLORS.bgCard, borderWidth: 1.5, borderColor: COLORS.yellow },
  shareBtn:           { backgroundColor: COLORS.accent },
  actionBtnText:      { color: COLORS.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  btnDisabled:        { opacity: 0.5 },
  newOrderBtn:        { borderWidth: 1.5, borderColor: COLORS.accent, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 40 },
  newOrderText:       { color: COLORS.accent, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  contact:            { color: COLORS.muted, fontSize: 11, marginTop: 4 },
});