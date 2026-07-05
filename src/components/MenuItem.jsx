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
      <View style={styles.mainRow}>
        <View style={styles.leftBlock}>
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>{item.id}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name.toUpperCase()}</Text>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
            {item.tag ? (
              <View style={[styles.tag, { backgroundColor: `${tagColor}22` }]}>
                <Text style={[styles.tagText, { color: tagColor }]}>{item.tag}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.rightBlock}>
          <Text style={styles.price}>R{item.price}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  cardSelected: {
    backgroundColor: '#3a1d08',
    borderColor: COLORS.accent,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  numberText: {
    color: COLORS.yellow,
    fontSize: 12,
    fontWeight: '800',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  description: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rightBlock: {
    alignItems: 'flex-end',
    gap: 8,
    minWidth: 92,
  },
  price: {
    color: COLORS.yellow,
    fontSize: 18,
    fontWeight: '800',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnAdd: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  stepBtnDisabled: {
    borderColor: COLORS.border,
  },
  stepBtnText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  qty: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'center',
  },
});