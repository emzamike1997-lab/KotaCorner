import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, TAG_COLORS } from '../constants';
import { useOrderStore } from '../store/orderStore';

export default function MenuItem({ item }) {
  const { getQty, addItem, removeItem } = useOrderStore();
  const qty      = getQty(item.id);
  const selected = qty > 0;
  const tagColor = TAG_COLORS[item.tag] || COLORS.muted;
  const isSoldOut = !!item.soldOut;

  const handleAdd    = useCallback(() => { if (!isSoldOut) addItem(item.id); }, [item.id, isSoldOut]);
  const handleRemove = useCallback(() => removeItem(item.id), [item.id]);

  return (
    <View style={[
      styles.card,
      selected && !isSoldOut && styles.cardSelected,
      isSoldOut && styles.cardSoldOut,
    ]}>
      <View style={[
        styles.indicator,
        { backgroundColor: isSoldOut ? '#cc3333' : selected ? COLORS.accent : 'transparent' }
      ]} />

      {/* Item number */}
      <View style={styles.numWrap}>
        <Text style={[styles.num, isSoldOut && styles.numMuted]}>{item.id}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, isSoldOut && styles.nameMuted]}>
          {item.name.toUpperCase()}
        </Text>
        {item.description ? (
          <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
        ) : null}
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: tagColor + '33' }]}>
            <Text style={[styles.tagText, { color: tagColor }]}>{item.tag}</Text>
          </View>
          {isSoldOut && (
            <View style={styles.soldOutBadge}>
              <Text style={styles.soldOutText}>SOLD OUT</Text>
            </View>
          )}
        </View>
      </View>

      {/* Price + stepper */}
      <View style={styles.right}>
        <Text style={[styles.price, isSoldOut && styles.priceMuted]}>
          <Text style={styles.priceCur}>R</Text>{item.price}
        </Text>

        {isSoldOut ? (
          <View style={styles.soldOutBtn}>
            <Text style={styles.soldOutBtnText}>✕</Text>
          </View>
        ) : (
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepBtn, qty === 0 && styles.stepBtnDisabled]}
              onPress={handleRemove}
              disabled={qty === 0}
            >
              <Text style={[styles.stepBtnText, qty === 0 && { color: COLORS.border }]}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qty}>{qty}</Text>
            <TouchableOpacity style={[styles.stepBtn, styles.stepBtnAdd]} onPress={handleAdd}>
              <Text style={[styles.stepBtnText, { color: COLORS.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:           { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: 14, marginVertical: 4, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardSelected:   { backgroundColor: '#3a1d08', borderColor: COLORS.accent },
  cardSoldOut:    { opacity: 0.55 },
  indicator:      { width: 4, alignSelf: 'stretch' },
  numWrap:        { paddingHorizontal: 10 },
  num:            { fontWeight: '800', fontSize: 16, color: COLORS.yellow, minWidth: 24, textAlign: 'center' },
  numMuted:       { color: COLORS.muted },
  info:           { flex: 1, paddingVertical: 12, paddingRight: 8, gap: 3 },
  name:           { color: COLORS.text, fontSize: 11, fontWeight: '700', letterSpacing: 0.3, lineHeight: 15 },
  nameMuted:      { color: COLORS.muted },
  description:    { color: COLORS.muted, fontSize: 10, lineHeight: 13 },
  tagRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  tag:            { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText:        { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  soldOutBadge:   { backgroundColor: '#2a0d0d', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#cc3333' },
  soldOutText:    { color: '#cc3333', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  right:          { alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  price:          { color: COLORS.yellow, fontSize: 18, fontWeight: '800' },
  priceMuted:     { color: COLORS.muted },
  priceCur:       { fontSize: 12, fontWeight: '400', color: COLORS.muted },
  stepper:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn:        { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  stepBtnAdd:     { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  stepBtnDisabled:{ borderColor: COLORS.border },
  stepBtnText:    { color: COLORS.accent, fontSize: 16, fontWeight: '700', lineHeight: 18 },
  qty:            { color: COLORS.text, fontSize: 15, fontWeight: '600', minWidth: 18, textAlign: 'center' },
  soldOutBtn:     { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#cc3333', alignItems: 'center', justifyContent: 'center' },
  soldOutBtnText: { color: '#cc3333', fontSize: 14, fontWeight: '800' },
});