import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, TAG_COLORS } from '../constants';
import { useOrderStore } from '../store/orderStore';

export default function MenuItem({ item }) {
  const { getQty, addItem, removeItem } = useOrderStore();
  
  const qty = getQty(item.id);
  const selected = qty > 0;
  const tagColor = TAG_COLORS[item.tag] || COLORS.muted;

  const handleAdd = useCallback(() => addItem(item.id), [item.id]);
  const handleRemove = useCallback(() => removeItem(item.id), [item.id]);

  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <View style={[styles.indicator, { backgroundColor: selected ? COLORS.accent : 'transparent' }]} />
      <View style={styles.numWrap}>
        <Text style={styles.num}>{item.id}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name.toUpperCase()}</Text>
        <View style={[styles.tag, { backgroundColor: tagColor + '33' }]}>
          <Text style={[styles.tagText, { color: tagColor }]}>{item.tag}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}><Text style={styles.priceCur}>R</Text>{item.price}</Text>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 12,
    marginHorizontal: 12, marginVertical: 4, overflow: 'hidden',
  },
  cardSelected: { backgroundColor: '#3a1d08' },
  indicator: { width: 4, alignSelf: 'stretch' },
  numWrap: { paddingHorizontal: 10 },
  num: { fontWeight: '800', fontSize: 18, color: COLORS.yellow, minWidth: 22, textAlign: 'center' },
  info: { flex: 1, paddingVertical: 12, paddingRight: 8, gap: 4 },
  name: { color: COLORS.text, fontSize: 11, fontWeight: '600', letterSpacing: 0.3, lineHeight: 15 },
  tag: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 2 },
  tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  right: { alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  price: { color: COLORS.yellow, fontSize: 20, fontWeight: '800' },
  priceCur: { fontSize: 13, fontWeight: '400', color: COLORS.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  stepBtnAdd: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  stepBtnDisabled: { borderColor: COLORS.border },
  stepBtnText: { color: COLORS.accent, fontSize: 16, fontWeight: '700', lineHeight: 18 },
  qty: { color: COLORS.text, fontSize: 15, fontWeight: '600', minWidth: 18, textAlign: 'center' },
});