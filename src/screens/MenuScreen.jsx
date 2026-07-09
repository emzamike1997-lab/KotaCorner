import React, { useCallback } from 'react';
import {
  View, Text, SectionList,
  TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { COLORS } from '../constants';
import { useOrderStore } from '../store/orderStore';
import { usePriceStore } from '../store/priceStore';
import MenuItem from '../components/MenuItem';

const STATUS_LABELS = {
  awaiting_payment: { text: '⏳ Awaiting payment — tap to view', color: '#F5C842', bg: '#2d2300', border: '#F5C842' },
  paid:             { text: '💳 Payment confirmed — tap to track', color: '#4caf50', bg: '#0d2a0d', border: '#4caf50' },
  making:           { text: '👨‍🍳 Being prepared — tap to track', color: '#F5C842', bg: '#2d2300', border: '#F5C842' },
  ready:            { text: '🍞 Ready to collect! Tap to view', color: '#4caf50', bg: '#0d2a0d', border: '#4caf50' },
  done:             { text: '✓ Order collected', color: COLORS.muted, bg: COLORS.bgCard, border: COLORS.border },
  expired:          { text: '⏰ Order expired — tap to see details', color: '#cc3333', bg: '#2a0d0d', border: '#cc3333' },
  cancelled:        { text: '❌ Order cancelled — tap to see details', color: '#cc3333', bg: '#2a0d0d', border: '#cc3333' },
};

export default function MenuScreen({ navigation, onShopNameTap }) {
  const { customerName, getCount, getTotal, lastOrder } = useOrderStore();
  const { getMenu } = usePriceStore();

  const LIVE_MENU = getMenu();
  const count = getCount();
  const total = getTotal(LIVE_MENU);
  const hasActiveOrder = !!lastOrder;

  const menuSections = [
    { title: 'Kota Menu', subtitle: 'Signature combos', key: 'kota', data: LIVE_MENU.filter((item) => item.section === 'Kota Menu') },
    { title: 'Chips', subtitle: 'Sides for sharing', key: 'chips', data: LIVE_MENU.filter((item) => item.section === 'Chips') },
    { title: 'Extras', subtitle: 'Add-ons and extras', key: 'extras', data: LIVE_MENU.filter((item) => item.section === 'Extras') },
  ].filter((section) => section.data.length > 0);

  const handleCart = useCallback(() => {
    if (count > 0) navigation.navigate('Cart');
    else if (hasActiveOrder) navigation.navigate('Confirm');
  }, [count, navigation, hasActiveOrder]);

  const handleCheckout = useCallback(() => {
    navigation.navigate('Cart');
  }, [navigation]);

  const handleTrackingBanner = useCallback(() => {
    navigation.navigate('Confirm');
  }, [navigation]);

  // Step pill navigation
  const handleStepPress = useCallback((step) => {
    if (step === 'Review Order') {
      if (count > 0) navigation.navigate('Cart');
    } else if (step === 'Pay') {
      if (count > 0) navigation.navigate('Cart');
      else if (hasActiveOrder) navigation.navigate('Confirm');
    } else if (step === 'Collect') {
      if (hasActiveOrder) navigation.navigate('Confirm');
    }
    // 'Choose Food' does nothing — already on menu
  }, [count, navigation, hasActiveOrder]);

  const renderItem = useCallback(({ item }) => <MenuItem item={item} />, []);

  const renderSectionHeader = useCallback(({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.subtitle ? <Text style={styles.sectionSubtitle}>{section.subtitle}</Text> : null}
    </View>
  ), []);

  const keyExtractor = useCallback((item) => String(item.id), []);

  const statusMeta = lastOrder ? (STATUS_LABELS[lastOrder.status] || STATUS_LABELS.awaiting_payment) : null;

  // Determine active step based on order status
  const activeStep = !hasActiveOrder ? 0
    : lastOrder.status === 'awaiting_payment' ? 2
    : lastOrder.status === 'paid' || lastOrder.status === 'making' ? 2
    : lastOrder.status === 'ready' ? 3
    : lastOrder.status === 'done' ? 3
    : 0;

  const steps = ['Choose Food', 'Review Order', 'Pay', 'Collect'];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.screenShell}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onShopNameTap} activeOpacity={1}>
            <Text style={styles.shopName}>FIREHOUSE</Text>
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

        {/* ── Tracking banner ── */}
        {hasActiveOrder && statusMeta && (
          <TouchableOpacity
            style={[styles.trackingBanner, {
              backgroundColor: statusMeta.bg,
              borderColor: statusMeta.border,
            }]}
            onPress={handleTrackingBanner}
            activeOpacity={0.8}
          >
            <Text style={[styles.trackingText, { color: statusMeta.color }]} numberOfLines={1}>
              {lastOrder.orderNumber} · {statusMeta.text}
            </Text>
            <Text style={[styles.trackingCta, { color: statusMeta.color }]}>View →</Text>
          </TouchableOpacity>
        )}

        {/* ── Step pills — functional ── */}
        <View style={styles.stepRow}>
          {steps.map((step, index) => {
            const isActive = index === activeStep;
            const isClickable = step !== 'Choose Food';
            return (
              <TouchableOpacity
                key={step}
                style={[styles.stepPill, isActive && styles.stepPillActive]}
                onPress={() => handleStepPress(step)}
                disabled={!isClickable}
                activeOpacity={isClickable ? 0.7 : 1}
              >
                <Text style={[styles.stepPillText, isActive && styles.stepPillTextActive]}>
                  {step}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Menu list ── */}
        <SectionList
          sections={menuSections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            count > 0 && { paddingBottom: 110 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
        />

        {/* ── Checkout bar — fixed at bottom ── */}
        {count > 0 && (
          <View style={styles.checkoutBar}>
            <View style={styles.checkoutInfo}>
              <Text style={styles.checkoutCount}>{count} {count === 1 ? 'item' : 'items'}</Text>
              <Text style={styles.checkoutTotal}>R{total}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
              <Text style={styles.checkoutBtnText}>Checkout →</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  screenShell:    { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },

  // Header — properly padded so shop name is visible
  header:         {
    backgroundColor: COLORS.bg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgCard,
  },
  shopName:       { color: COLORS.yellow, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  tagline:        { color: COLORS.muted, fontSize: 11, marginTop: 2, letterSpacing: 0.5 },
  cartBtn:        { backgroundColor: COLORS.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  cartIcon:       { fontSize: 16 },
  badge:          { backgroundColor: COLORS.yellow, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  badgeText:      { color: COLORS.bg, fontSize: 11, fontWeight: '800' },

  // Tracking banner
  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  trackingText:   { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  trackingCta:    { fontSize: 12, fontWeight: '800', marginLeft: 8 },

  // Step pills — tappable
  stepRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  stepPill:       { backgroundColor: COLORS.bgCard, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  stepPillActive: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  stepPillText:   { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  stepPillTextActive: { color: COLORS.yellow },

  // List
  listContent:    { paddingHorizontal: 14, paddingBottom: 20, paddingTop: 6 },
  sectionHeader:  { backgroundColor: COLORS.bgDeep, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle:   { color: COLORS.yellow, fontSize: 14, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionSubtitle:{ color: COLORS.muted, fontSize: 11, marginTop: 2 },

  // Checkout bar — fixed at bottom
  checkoutBar:    {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgDeep,
    borderTopWidth: 1,
    borderTopColor: COLORS.bgCard,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkoutInfo:   { gap: 2 },
  checkoutCount:  { color: COLORS.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  checkoutTotal:  { color: COLORS.yellow, fontSize: 24, fontWeight: '900' },
  checkoutBtn:    { backgroundColor: COLORS.accent, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  checkoutBtnText:{ color: COLORS.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
});