import React, { useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
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
  const { customerName, placeOrder, getCartItems, getTotal } = useOrderStore();
  const { getMenu } = usePriceStore();

  const LIVE_MENU = getMenu();
  const cartItems = getCartItems(LIVE_MENU);
  const total = getTotal(LIVE_MENU);

  const player = useAudioPlayer(require('../../assets/sounds/ding.wav'));

  const handlePlace = useCallback(async () => {
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      console.log('Sound play error:', e);
    }
    await placeOrder(LIVE_MENU, deviceToken);
    navigation.navigate('Confirm');
  }, [placeOrder, navigation, deviceToken, player, LIVE_MENU]);

  const renderItem = useCallback(({ item }) => <CartRow item={item} />, []);
  const keyExtractor = useCallback((item) => String(item.id), []);

  const Header = (
    <View style={styles.cartHeader}>
      <Text style={styles.sectionText}>ORDER FOR</Text>
      <Text style={styles.customerName}>{customerName.toUpperCase()}</Text>
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
        <Text style={[styles.summaryValue, { color: '#4a9a4a' }]}>In-store</Text>
      </View>
      <View style={[styles.summaryRow, styles.summaryTotal]}>
        <Text style={styles.totalLabel}>TOTAL DUE</Text>
        <Text style={styles.totalAmount}>R{total}</Text>
      </View>
    </View>
  );

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
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
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      <View style={styles.footer}>
        <TouchableOpacity style={styles.placeBtn} onPress={handlePlace}>
          <Text style={styles.placeBtnText}>⚡  PLACE ORDER</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>Come collect in-store when ready</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: COLORS.bg },
  navBar:             { backgroundColor: COLORS.bgDeep, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: COLORS.bgCard },
  backBtn:            { paddingVertical: 4, paddingRight: 12, minWidth: 60 },
  backBtnText:        { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  navTitle:           { color: COLORS.yellow, fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  list:               { paddingBottom: 8 },
  cartHeader:         { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  sectionText:        { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  customerName:       { color: COLORS.text, fontSize: 20, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  cartRow:            { backgroundColor: COLORS.bgCard, borderRadius: 12, marginHorizontal: 12, marginVertical: 4, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartRowLeft:        { flex: 1 },
  cartItemName:       { color: COLORS.text, fontSize: 11, fontWeight: '600', lineHeight: 15 },
  cartItemSub:        { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  cartRowRight:       { alignItems: 'flex-end', gap: 8 },
  stepper:            { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn:            { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  stepBtnAdd:         { backgroundColor: COLORS.accent },
  stepBtnText:        { color: COLORS.accent, fontSize: 16, fontWeight: '700', lineHeight: 18 },
  qty:                { color: COLORS.text, fontSize: 15, fontWeight: '600', minWidth: 18, textAlign: 'center' },
  cartItemSubtotal:   { color: COLORS.yellow, fontSize: 16, fontWeight: '800' },
  summaryBox:         { backgroundColor: COLORS.bgCard, borderRadius: 12, marginHorizontal: 12, marginTop: 12, padding: 16, gap: 8 },
  summaryRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel:       { color: COLORS.muted, fontSize: 13 },
  summaryValue:       { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  summaryTotal:       { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 4 },
  totalLabel:         { color: COLORS.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  totalAmount:        { color: COLORS.yellow, fontSize: 22, fontWeight: '800' },
  footer:             { backgroundColor: COLORS.bgDeep, borderTopWidth: 1, borderTopColor: COLORS.bgCard, padding: 16, paddingBottom: 24, gap: 8 },
  placeBtn:           { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  placeBtnText:       { color: COLORS.text, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  footerNote:         { color: COLORS.muted, fontSize: 11, textAlign: 'center' },
  emptyWrap:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyEmoji:         { fontSize: 48 },
  emptyText:          { color: COLORS.muted, fontSize: 16 },
  emptyLink:          { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
});