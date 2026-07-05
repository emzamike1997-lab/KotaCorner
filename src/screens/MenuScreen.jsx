import React, { useCallback } from 'react';
import {
  View, Text, SectionList,
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

  const menuSections = [
    { title: 'Kota Menu', subtitle: 'Signature combos', key: 'kota', data: LIVE_MENU.filter((item) => item.section === 'Kota Menu') },
    { title: 'Chips', subtitle: 'Sides for sharing', key: 'chips', data: LIVE_MENU.filter((item) => item.section === 'Chips') },
    { title: 'Extras', subtitle: 'Add-ons and extras', key: 'extras', data: LIVE_MENU.filter((item) => item.section === 'Extras') },
  ].filter((section) => section.data.length > 0);

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
  const renderSectionHeader = useCallback(({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.subtitle ? <Text style={styles.sectionSubtitle}>{section.subtitle}</Text> : null}
    </View>
  ), []);

  const keyExtractor = useCallback((item) => String(item.id), []);

  const Header = (
    <View style={styles.heroCard}>
      <View style={styles.heroTop}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>FIREHOUSE</Text>
        </View>
        <TouchableOpacity style={styles.cartBtn} onPress={handleCart} disabled={count === 0 && !hasActiveOrder}>
          <Text style={styles.cartIcon}>🛒</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Text style={styles.shopName}>KOTA CORNER</Text>
      <Text style={styles.tagline}>Fresh kota, ready for collection · Open now</Text>
      <View style={styles.stepRow}>
        {['Choose Food', 'Review Order', 'Pay', 'Collect'].map((step, index) => (
          <View key={step} style={[styles.stepPill, index === 0 && styles.stepPillActive]}>
            <Text style={[styles.stepPillText, index === 0 && styles.stepPillTextActive]}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.screenShell}>
        {hasActiveOrder && (
          <TouchableOpacity style={styles.trackingBanner} onPress={() => navigation.navigate('Confirm')}>
            <Text style={styles.trackingText}>📍 Order {lastOrder.orderNumber} in progress — tap to track</Text>
          </TouchableOpacity>
        )}

        <SectionList
          sections={menuSections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={keyExtractor}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
        />

        {count > 0 && (
          <TouchableOpacity style={styles.summaryBar} onPress={handleOrder} activeOpacity={0.9}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryLabel}>View Order</Text>
              <Text style={styles.summaryText}>{count} {count === 1 ? 'item' : 'items'} · R{total}</Text>
            </View>
            <Text style={styles.summaryCta}>Checkout</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screenShell: {
    flex: 1,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingBottom: 0,
  },
  heroCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: {
    color: COLORS.yellow,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  shopName: {
    color: COLORS.yellow,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginTop: 10,
  },
  tagline: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  stepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  stepPill: {
    backgroundColor: COLORS.bg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepPillActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  stepPillText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stepPillTextActive: {
    color: COLORS.yellow,
  },
  cartBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cartIcon: {
    fontSize: 15,
  },
  badge: {
    backgroundColor: COLORS.yellow,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.bg,
    fontSize: 11,
    fontWeight: '800',
  },
  trackingBanner: {
    backgroundColor: '#0d2a0d',
    borderBottomWidth: 1,
    borderBottomColor: '#1a4a1a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 14,
    marginTop: 6,
    borderRadius: 12,
  },
  trackingText: {
    color: '#4caf50',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 180,
    paddingTop: 4,
  },
  sectionHeader: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    color: COLORS.yellow,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  summaryBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 92,
    maxWidth: 780,
    alignSelf: 'center',
    backgroundColor: COLORS.bgDeep,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  summaryCopy: {
    flex: 1,
    paddingRight: 12,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  summaryText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  summaryCta: {
    color: COLORS.bg,
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});