import React, { useCallback } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { COLORS } from '../constants';
import { useOrderStore } from '../store/orderStore';
import { usePriceStore } from '../store/priceStore';
import MenuItem from '../components/MenuItem';

export default function MenuScreen({ navigation, onShopNameTap }) {
  const { customerName, setName, getCount, getTotal, lastOrder } = useOrderStore();
  const { getMenu } = usePriceStore();

  const LIVE_MENU = getMenu();

  const count = getCount();
  const total = getTotal(LIVE_MENU);
  const canOrder = count > 0 && customerName.trim().length > 0;
  const hasActiveOrder = lastOrder && count === 0;

  const handleCart = useCallback(() => {
    if (count > 0) {
      navigation.navigate('Cart');
    } else if (hasActiveOrder) {
      navigation.navigate('Confirm');
    }
  }, [count, navigation, hasActiveOrder]);

  const handleOrder = useCallback(() => {
    if (canOrder) navigation.navigate('Cart');
  }, [canOrder, navigation]);

  const renderItem = useCallback(({ item }) => <MenuItem item={item} />, []);
  const keyExtractor = useCallback((item) => String(item.id), []);

  const Header = (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionText}>TODAY'S MENU</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onShopNameTap} activeOpacity={1}>
          <Text style={styles.shopName}>KOTA CORNER</Text>
          <Text style={styles.tagline}>Order & Collect  ·  Open Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cartBtn}
          onPress={handleCart}
          disabled={count === 0 && !hasActiveOrder}
        >
          <Text style={styles.cartIcon}>🛒</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {hasActiveOrder && (
        <TouchableOpacity
          style={styles.trackingBanner}
          onPress={() => navigation.navigate('Confirm')}
        >
          <Text style={styles.trackingText}>
            📍 Order {lastOrder.orderNumber} in progress — tap to track
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={LIVE_MENU}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {count > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalAmount}>
                <Text style={styles.totalCur}>R </Text>{total}
              </Text>
            </View>
            <Text style={styles.itemCount}>{count} {count === 1 ? 'item' : 'items'}</Text>
          </View>

          <TextInput
            style={styles.nameInput}
            placeholder="Your name for collection..."
            placeholderTextColor={COLORS.muted}
            value={customerName}
            onChangeText={setName}
            autoCorrect={false}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[styles.orderBtn, !canOrder && styles.orderBtnDisabled]}
            onPress={handleOrder}
            disabled={!canOrder}
          >
            <Text style={[styles.orderBtnText, !canOrder && styles.orderBtnTextDisabled]}>
              {canOrder ? '⚡  REVIEW ORDER' : 'ENTER YOUR NAME'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.bg },
  header:           { backgroundColor: COLORS.bg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: COLORS.bgCard },
  shopName:         { color: COLORS.yellow, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  tagline:          { color: COLORS.muted, fontSize: 11, marginTop: 2, letterSpacing: 0.5 },
  cartBtn:          { backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  cartIcon:         { fontSize: 16 },
  badge:            { backgroundColor: COLORS.yellow, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  badgeText:        { color: COLORS.bg, fontSize: 11, fontWeight: '800' },
  trackingBanner:   { backgroundColor: '#0d2a0d', borderBottomWidth: 1, borderBottomColor: '#1a4a1a', paddingHorizontal: 16, paddingVertical: 10 },
  trackingText:     { color: '#4caf50', fontSize: 12, fontWeight: '700' },
  list:             { paddingBottom: 8 },
  sectionLabel:     { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  sectionText:      { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  footer:           { backgroundColor: COLORS.bgDeep, borderTopWidth: 1, borderTopColor: COLORS.bgCard, padding: 16, paddingBottom: 40, gap: 10 },
  totalRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  totalLabel:       { color: COLORS.muted, fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  totalAmount:      { color: COLORS.yellow, fontSize: 28, fontWeight: '800', lineHeight: 32 },
  totalCur:         { fontSize: 15, fontWeight: '400', color: COLORS.muted },
  itemCount:        { color: COLORS.muted, fontSize: 12 },
  nameInput:        { backgroundColor: COLORS.bgCard, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, fontSize: 14 },
  orderBtn:         { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  orderBtnDisabled: { backgroundColor: '#4a2010' },
  orderBtnText:     { color: COLORS.text, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  orderBtnTextDisabled: { color: COLORS.muted },
});