/**
 * src/store/orderStore.js
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../config/supabase';

const OrderContext = createContext(null);

function formatTime(date) {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

const STATUS_FLOW = ['pending', 'making', 'ready', 'done'];

async function sendPushNotification(token, title, body) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default', priority: 'high' }),
    });
  } catch (e) {
    console.log('Push notification error:', e);
  }
}

export function OrderProvider({ children }) {
  const [items, setItems]                 = useState({});
  const [customerName, setCustomerName]   = useState('');
  const [lastOrder, setLastOrder]         = useState(null);
  const [kitchenOrders, setKitchenOrders] = useState([]);

  // ── Realtime: listen for status changes from Supabase ──────
  useEffect(() => {
    const channel = supabase
      .channel('orders-kitchen')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
      }, (payload) => {
        const updated = payload.new;
        setKitchenOrders(prev => {
          const newOrders = prev.map(o =>
            o.id === updated.id ? { ...o, status: updated.status } : o
          );
          const order = ['pending', 'making', 'ready', 'done'];
          return newOrders.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
        });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ── Customer actions ───────────────────────────────────────
  const addItem = useCallback((id) =>
    setItems(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 })), []);

  const removeItem = useCallback((id) =>
    setItems(prev => {
      if (!prev[id] || prev[id] <= 1) { const n = { ...prev }; delete n[id]; return n; }
      return { ...prev, [id]: prev[id] - 1 };
    }), []);

  const getQty       = useCallback((id) => items[id] || 0, [items]);
  const getCount     = useCallback(() => Object.values(items).reduce((a, b) => a + b, 0), [items]);
  const getTotal     = useCallback((menu) => menu.reduce((s, m) => s + (items[m.id] || 0) * m.price, 0), [items]);
  const getCartItems = useCallback((menu) =>
    menu.filter(m => (items[m.id] || 0) > 0)
      .map(m => ({ ...m, qty: items[m.id], subtotal: items[m.id] * m.price })),
    [items]);

  // ── placeOrder ─────────────────────────────────────────────
  const placeOrder = useCallback(async (menu, deviceToken) => {
    const num = `#${Math.floor(1000 + Math.random() * 8999)}`;

    const orderItems = menu
      .filter(m => (items[m.id] || 0) > 0)
      .map(m => ({
        id: m.id,
        name: m.name,
        qty: items[m.id],
        price: m.price,
        subtotal: items[m.id] * m.price,
      }));

    const total = orderItems.reduce((s, i) => s + i.subtotal, 0);
    const now = new Date();
    const name = customerName.trim() || 'Guest';
    const orderId = `${num}-${Date.now()}`;

    const kitchenOrder = {
      id: orderId,
      orderNumber: num,
      customerName: name,
      items: orderItems,
      total,
      status: 'pending',
      createdAt: now,
      timeLabel: formatTime(now),
      deviceToken: deviceToken || null,
    };

    const receipt = {
      orderNumber: num,
      customerName: name,
      items: orderItems,
      total,
      timeLabel: formatTime(now),
    };

    // ── Set local state FIRST — this is what the screens read ──
    setKitchenOrders(prev => [kitchenOrder, ...prev]);
    setLastOrder(receipt);
    setItems({});
    setCustomerName('');

    // ── Sync to Supabase in background — won't block navigation ──
    supabase.from('orders').insert({
      id: orderId,
      order_number: num,
      customer_name: name,
      items: orderItems,
      total,
      status: 'pending',
      time_label: formatTime(now),
      device_token: deviceToken || null,
    }).then(({ error }) => {
      if (error) console.log('Supabase insert error:', error.message);
    });

    return num;
  }, [items, customerName]);

  // ── Kitchen: advance order ─────────────────────────────────
  const advanceOrder = useCallback(async (orderId) => {
    const currentOrder = kitchenOrders.find(o => o.id === orderId);
    if (!currentOrder) return;

    const nextIdx = STATUS_FLOW.indexOf(currentOrder.status) + 1;
    const nextStatus = STATUS_FLOW[nextIdx] || 'done';

    // Update local state immediately
    setKitchenOrders(prev => {
      const updated = prev.map(o =>
        o.id === orderId ? { ...o, status: nextStatus } : o
      );
      const order = ['pending', 'making', 'ready', 'done'];
      return updated.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
    });

    // Sync to Supabase in background
    supabase.from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId)
      .then(({ error }) => {
        if (error) console.log('Supabase update error:', error.message);
      });

    // Send push notification when ready
    if (nextStatus === 'ready' && currentOrder.deviceToken) {
      sendPushNotification(
        currentOrder.deviceToken,
        '🍞 Your kota is ready!',
        `Order ${currentOrder.orderNumber} is ready for collection!`
      );
    }
  }, [kitchenOrders]);

  const clearDoneOrders = useCallback(() => {
    setKitchenOrders(prev => prev.filter(o => o.status !== 'done'));
  }, []);

  const clearLastOrder = useCallback(() => setLastOrder(null), []);

  const value = {
    items,
    customerName,
    setName: setCustomerName,
    addItem,
    removeItem,
    getQty,
    getTotal,
    getCount,
    getCartItems,
    placeOrder,
    lastOrder,
    clearLastOrder,
    kitchenOrders,
    advanceOrder,
    clearDoneOrders,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export const useOrderStore = () => useContext(OrderContext);