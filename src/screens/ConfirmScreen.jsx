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

export default function ConfirmScreen({ navigation }) {
  const { lastOrder, clearLastOrder, markOrderAsPaid, expireOrder } = useOrderStore();
  const pulse = useRef(new Animated.Value(1)).current;
  const receiptRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  useEffect(() => {
    if (!lastOrder?.expiresAt || lastOrder.status !== 'awaiting_payment') return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((lastOrder.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        expireOrder(lastOrder.id);
      }
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

  const captureReceipt = () => {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const uri = await captureRef(receiptRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
          });
          resolve(uri);
        } catch (e) {
          reject(e);
        }
      }, 400);
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const uri = await captureReceipt();
      const { status } = await MediaLibrary.requestPermissionsAsync(false);
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save to your gallery.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('✅ Saved!', 'Receipt saved to your gallery.');
    } catch (e) {
      console.log('Save error:', e);
      Alert.alert('Error', `${e?.message || 'Could not save receipt.'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      const uri = await captureReceipt();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Kota Corner Order ${lastOrder?.orderNumber}`,
        UTI: 'public.png',
      });
    } catch (e) {
      console.log('Share error:', e);
      Alert.alert('Error', `${e?.message || 'Could not share receipt.'}`);
    } finally {
      setSharing(false);
    }
  };

  const paymentStatusText = useMemo(() => {
    if (!lastOrder) return 'Awaiting payment';
    if (lastOrder.status === 'paid') return 'Payment confirmed';
    if (lastOrder.status === 'expired') return 'Expired';
    return 'Awaiting payment';
  }, [lastOrder]);

  const paymentMessage = useMemo(() => {
    if (lastOrder?.status === 'paid') return 'Payment confirmed. Your order is now ready for the kitchen.';
    if (lastOrder?.status === 'expired') return 'Your order expired because payment was not confirmed within 30 minutes.';
    return 'Your order will only be prepared after payment is confirmed.';
  }, [lastOrder]);

  const countdownText = useMemo(() => {
    if (timeLeft === null || lastOrder?.status !== 'awaiting_payment') return null;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [timeLeft, lastOrder]);

  if (!lastOrder) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
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
        <View style={styles.cardShell}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>{lastOrder.status === 'paid' ? '✓' : '⏳'}</Text>
          </View>

          <Text style={styles.title}>{lastOrder.status === 'paid' ? 'PAYMENT CONFIRMED' : 'PAYMENT REQUIRED'}</Text>

          <Animated.Text style={[styles.orderNum, { transform: [{ scale: pulse }] }]}>
            {lastOrder.orderNumber}
          </Animated.Text>

          <View style={styles.stepRow}>
            {['Choose Food', 'Review Order', 'Pay', 'Collect'].map((step, index) => (
              <View key={step} style={[styles.stepPill, index === 2 && styles.stepPillActive]}>
                <Text style={[styles.stepPillText, index === 2 && styles.stepPillTextActive]}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusValue}>{paymentStatusText}</Text>
            <Text style={styles.statusText}>{paymentMessage}</Text>
            {lastOrder.status === 'awaiting_payment' && countdownText ? (
              <View style={styles.countdownBox}>
                <Text style={styles.countdownLabel}>Payment window</Text>
                <Text style={styles.countdownValue}>{countdownText}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sub}>Payment required before preparation. Your order will only be prepared after payment is confirmed.</Text>

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
              {lastOrder.customerPhone ? (
                <Text style={styles.infoValueSmall}>{lastOrder.customerPhone}</Text>
              ) : null}
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

            <View style={styles.collectionBox}>
              <Text style={styles.collectionTitle}>Collection only</Text>
              <Text style={styles.collectionText}>Pay in-store when collecting</Text>
            </View>

            <Text style={styles.receiptFooter}>📞 +27 73 786 9844  ·  +27 78 954 9721</Text>
            <Text style={styles.receiptFooterSub}>Thank you for your order!</Text>
          </View>

          {lastOrder.status === 'awaiting_payment' ? (
            <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
              <Text style={styles.payBtnText}>CONFIRM PAYMENT</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.saveBtn, (saving || sharing) && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving || sharing}
            >
              <Text style={styles.actionBtnText}>{saving ? 'Saving...' : '📥 Save'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.shareBtn, (saving || sharing) && styles.btnDisabled]}
              onPress={handleShare}
              disabled={saving || sharing}
            >
              <Text style={styles.actionBtnText}>{sharing ? 'Sharing...' : '📤 Share'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.newOrderBtn} onPress={handleNewOrder}>
            <Text style={styles.newOrderText}>BACK TO MENU</Text>
          </TouchableOpacity>

          <Text style={styles.contact}>📞  +27 73 786 9844  ·  +27 78 954 9721</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  inner: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 24, gap: 14 },
  cardShell: { alignItems: 'center', gap: 12 },
  checkCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: COLORS.text, fontSize: 30, fontWeight: '700' },
  title: { color: COLORS.yellow, fontSize: 20, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  orderNum: { color: COLORS.text, fontSize: 44, fontWeight: '900', letterSpacing: 8 },
  sub: { color: COLORS.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  stepPill: { backgroundColor: COLORS.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  stepPillActive: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  stepPillText: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  stepPillTextActive: { color: COLORS.yellow },
  statusCard: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 14, width: '100%', gap: 6, borderWidth: 1, borderColor: COLORS.border },
  statusLabel: { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  statusValue: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  statusText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  countdownBox: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 4 },
  countdownLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  countdownValue: { color: COLORS.yellow, fontSize: 24, fontWeight: '900' },
  receiptCard: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 20, width: '100%', gap: 10, borderWidth: 1, borderColor: COLORS.border },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptShop: { color: COLORS.yellow, fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  receiptTime: { color: COLORS.muted, fontSize: 11 },
  orderNumBox: { alignItems: 'center', paddingVertical: 12, backgroundColor: COLORS.bg, borderRadius: 10 },
  receiptOrderLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  receiptOrderNum: { color: COLORS.yellow, fontSize: 52, fontWeight: '900', letterSpacing: 8 },
  infoBox: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, gap: 2 },
  infoLabel: { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  infoValue: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  infoValueSmall: { color: COLORS.muted, fontSize: 12 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  receiptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  receiptQty: { color: COLORS.yellow, fontWeight: '800', fontSize: 13, minWidth: 24 },
  receiptItem: { flex: 1, color: COLORS.text, fontSize: 12, lineHeight: 17 },
  receiptPrice: { color: COLORS.yellow, fontSize: 13, fontWeight: '700' },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTotalLabel: { color: COLORS.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  receiptTotalAmt: { color: COLORS.yellow, fontSize: 22, fontWeight: '900' },
  collectionBox: { backgroundColor: COLORS.accentSoft, borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 4 },
  collectionTitle: { color: COLORS.yellow, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  collectionText: { color: COLORS.text, fontSize: 12, marginTop: 2 },
  receiptFooter: { color: COLORS.muted, fontSize: 10, textAlign: 'center', marginTop: 4 },
  receiptFooterSub: { color: COLORS.muted, fontSize: 10, textAlign: 'center' },
  payBtn: { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 13, width: '100%', alignItems: 'center' },
  payBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtn: { backgroundColor: COLORS.bgCard, borderWidth: 1.5, borderColor: COLORS.yellow },
  shareBtn: { backgroundColor: COLORS.accent },
  actionBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  btnDisabled: { opacity: 0.5 },
  newOrderBtn: { borderWidth: 1.5, borderColor: COLORS.accent, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 40 },
  newOrderText: { color: COLORS.accent, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  contact: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
});