import React, { useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Alert } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { COLORS } from '../constants';
import { useOrderStore } from '../store/orderStore';
import { usePriceStore } from '../store/priceStore';

function CartRow({ item }) {
  const { addItem, removeItem } = useOrderStore();
  return (
    <View style={styles.cartRow}>
      <View style={styles.cartRowLeft}>
        <Text style={styles.cartItemName}>{item.name.toUpperCase()}</Text>
        <Text style={styles.cartItemSub}>R{item.price} each</Text>
      </View>
      <View style={styles.cartRowRight}>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => removeItem(item.id)}>
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qty}>{item.qty}</Text>
          <TouchableOpacity style={[styles.stepBtn, styles.stepBtnAdd]} onPress={() => addItem(item.id)}>
            <Text style={[styles.stepBtnText, { color: COLORS.text }]}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.cartItemSubtotal}>R{item.subtotal}</Text>
      </View>
    </View>
  );
}

export default function CartScreen({ navigation, deviceToken }) {
  const { customerName, phoneNumber, note, setName, setPhoneNumber, setNote, placeOrder, getCartItems, getTotal } = useOrderStore();
  const { getMenu } = usePriceStore();

  const LIVE_MENU = getMenu();
  const cartItems = getCartItems(LIVE_MENU);
  const total = getTotal(LIVE_MENU);
  const isPhoneValid = phoneNumber.replace(/[^0-9]/g, '').length >= 10;
  const canPlace = cartItems.length > 0 && customerName.trim().length > 0 && isPhoneValid;

  const player = useAudioPlayer(require('../../assets/sounds/ding.wav'));

  const handlePlace = useCallback(async () => {
    if (!canPlace) {
      Alert.alert('Details needed', 'Please add your name and a valid phone or WhatsApp number before placing your order.');
      return;
    }

    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      console.log('Sound play error:', e);
    }
    await placeOrder(LIVE_MENU, deviceToken);
    navigation.navigate('Confirm');
  }, [canPlace, placeOrder, navigation, deviceToken, player, LIVE_MENU]);

  const renderItem = useCallback(({ item }) => <CartRow item={item} />, []);
  const keyExtractor = useCallback((item) => String(item.id), []);

  const Header = (
    <View style={styles.infoCard}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionText}>CHECK OUT</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Collection only</Text>
        </View>
      </View>

      <View style={styles.stepRow}>
        {['Choose Food', 'Review Order', 'Pay', 'Collect'].map((step, index) => (
          <View key={step} style={[styles.stepPill, index === 2 && styles.stepPillActive]}>
            <Text style={[styles.stepPillText, index === 2 && styles.stepPillTextActive]}>{step}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.customerName}>{customerName.trim() ? customerName.toUpperCase() : 'YOUR NAME'}</Text>
      <Text style={styles.smallText}>Pay within 30 minutes to confirm your order.</Text>

      <View style={styles.formBlock}>
        <Text style={styles.inputLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={customerName}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={COLORS.muted}
          autoCapitalize="words"
        />

        <Text style={styles.inputLabel}>Phone / WhatsApp</Text>
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="e.g. 0712345678"
          placeholderTextColor={COLORS.muted}
          keyboardType="phone-pad"
        />

        <Text style={styles.inputLabel}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          placeholder="Any extra notes for the kitchen"
          placeholderTextColor={COLORS.muted}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const Footer = (
    <View style={styles.summaryBox}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryValue}>R{total}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Collection</Text>
        <Text style={[styles.summaryValue, styles.collectionValue]}>In-store</Text>
      </View>
      <View style={[styles.summaryRow, styles.summaryTotal]}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <Text style={styles.totalAmount}>R{total}</Text>
      </View>
    </View>
  );

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.screenShell}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle}>YOUR ORDER</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🍞</Text>
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.emptyLink}>Add items from the menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
      <View style={styles.screenShell}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>YOUR ORDER</Text>
          <View style={{ width: 60 }} />
        </View>
        <FlatList
          data={cartItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={Header}
          ListFooterComponent={Footer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
        <View style={styles.footer}>
          {!canPlace && (
            <Text style={styles.warning}>Please add your name and a valid phone number to continue.</Text>
          )}
          <TouchableOpacity style={[styles.placeBtn, !canPlace && styles.placeBtnDisabled]} onPress={handlePlace} disabled={!canPlace}>
            <Text style={styles.placeBtnText}>SUBMIT ORDER</Text>
          </TouchableOpacity>
          <Text style={styles.footerNote}>Payment required before preparation · Your order will only be prepared after payment is confirmed.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  screenShell: { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },
  navBar: { backgroundColor: COLORS.bgDeep, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: COLORS.bgCard },
  backBtn: { paddingVertical: 4, paddingRight: 12, minWidth: 60 },
  backBtnText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  navTitle: { color: COLORS.yellow, fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 },
  infoCard: { backgroundColor: COLORS.bgCard, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sectionText: { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  pill: { backgroundColor: COLORS.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { color: COLORS.yellow, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 6 },
  stepPill: { backgroundColor: COLORS.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  stepPillActive: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  stepPillText: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  stepPillTextActive: { color: COLORS.yellow },
  customerName: { color: COLORS.text, fontSize: 20, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  smallText: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  formBlock: { marginTop: 14, gap: 10 },
  inputLabel: { color: COLORS.yellow, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  input: { backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 14 },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
  cartRow: { backgroundColor: COLORS.bgCard, borderRadius: 14, marginBottom: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border },
  cartRowLeft: { flex: 1 },
  cartItemName: { color: COLORS.text, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  cartItemSub: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  cartRowRight: { alignItems: 'flex-end', gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  stepBtnAdd: { backgroundColor: COLORS.accent },
  stepBtnText: { color: COLORS.accent, fontSize: 16, fontWeight: '700', lineHeight: 18 },
  qty: { color: COLORS.text, fontSize: 15, fontWeight: '700', minWidth: 18, textAlign: 'center' },
  cartItemSubtotal: { color: COLORS.yellow, fontSize: 16, fontWeight: '800' },
  summaryBox: { backgroundColor: COLORS.bgCard, borderRadius: 16, marginTop: 6, padding: 16, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: COLORS.muted, fontSize: 13 },
  summaryValue: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  collectionValue: { color: '#4a9a4a' },
  summaryTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 4 },
  totalLabel: { color: COLORS.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  totalAmount: { color: COLORS.yellow, fontSize: 22, fontWeight: '800' },
  footer: { backgroundColor: COLORS.bgDeep, borderTopWidth: 1, borderTopColor: COLORS.bgCard, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 8 },
  warning: { color: '#f5c842', fontSize: 12, textAlign: 'center' },
  placeBtn: { backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  placeBtnDisabled: { backgroundColor: '#4a2010' },
  placeBtnText: { color: COLORS.text, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  footerNote: { color: COLORS.muted, fontSize: 11, textAlign: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: COLORS.muted, fontSize: 16 },
  emptyLink: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
});