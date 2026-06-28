/**
 * src/screens/ConfirmScreen.jsx
 */
import React, { useEffect, useRef, useState } from 'react';
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
  const { lastOrder, clearLastOrder } = useOrderStore();
  const pulse = useRef(new Animated.Value(1)).current;
  const receiptRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const handleNewOrder = () => {
    clearLastOrder();
    navigation.navigate('Menu');
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

  // ── Save to gallery ───────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      const uri = await captureReceipt();
      const { status } = await MediaLibrary.requestPermissionsAsync(false); // false = no audio
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

  // ── Share ─────────────────────────────────────────────────
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

        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>

        <Text style={styles.title}>ORDER PLACED!</Text>

        <Animated.Text style={[styles.orderNum, { transform: [{ scale: pulse }] }]}>
          {lastOrder.orderNumber}
        </Animated.Text>

        <Text style={styles.sub}>
          Your kota is being made fresh.{'\n'}Show your order number at the counter!
        </Text>

        {/* Capturable receipt */}
        <View ref={receiptRef} collapsable={false} style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptShop}>KOTA CORNER</Text>
            <Text style={styles.receiptTime}>{lastOrder.timeLabel}</Text>
          </View>

          <View style={styles.orderNumBox}>
            <Text style={styles.receiptOrderLabel}>ORDER NUMBER</Text>
            <Text style={styles.receiptOrderNum}>{lastOrder.orderNumber}</Text>
          </View>

          <Text style={styles.receiptFor}>
            FOR: <Text style={styles.receiptName}>{lastOrder.customerName.toUpperCase()}</Text>
          </Text>

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
            <Text style={styles.receiptTotalLabel}>TOTAL PAID</Text>
            <Text style={styles.receiptTotalAmt}>R{lastOrder.total}</Text>
          </View>

          <Text style={styles.receiptFooter}>📞 +27 73 786 9844  ·  +27 78 954 9721</Text>
          <Text style={styles.receiptFooterSub}>Thank you for your order!</Text>
        </View>

        {/* Buttons */}
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
          <Text style={styles.newOrderText}>+ NEW ORDER</Text>
        </TouchableOpacity>

        <Text style={styles.contact}>📞  +27 73 786 9844  ·  +27 78 954 9721</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: COLORS.bg },
  inner:              { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 14 },
  checkCircle:        { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  checkMark:          { color: COLORS.text, fontSize: 36, fontWeight: '700' },
  title:              { color: COLORS.yellow, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  orderNum:           { color: COLORS.text, fontSize: 48, fontWeight: '900', letterSpacing: 8 },
  sub:                { color: COLORS.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  receiptCard:        { backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 20, width: '100%', gap: 10, borderWidth: 1, borderColor: COLORS.border },
  receiptHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptShop:        { color: COLORS.yellow, fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  receiptTime:        { color: COLORS.muted, fontSize: 11 },
  orderNumBox:        { alignItems: 'center', paddingVertical: 12, backgroundColor: COLORS.bg, borderRadius: 10 },
  receiptOrderLabel:  { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  receiptOrderNum:    { color: COLORS.yellow, fontSize: 52, fontWeight: '900', letterSpacing: 8 },
  receiptFor:         { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  receiptName:        { color: COLORS.accent, fontWeight: '800' },
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