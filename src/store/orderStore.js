/**
 * src/store/orderStore.js
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../config/supabase';

const OrderContext = createContext(null);

const STATUS_ORDER = ['awaiting_payment', 'paid', 'making', 'ready', 'done', 'expired', 'cancelled'];

function formatTime(date) {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

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
  const [phoneNumber, setPhoneNumber]     = useState('');
  const [note, setNote]                   = useState('');
  const [lastOrder, setLastOrder]         = useState(null);
  const [kitchenOrders, setKitchenOrders] = useState([]);

  const sortOrders = useCallback((orders) => {
    return [...orders].sort((a, b) => {
      const indexA = STATUS_ORDER.indexOf(a.status);
      const indexB = STATUS_ORDER.indexOf(b.status);
      const statusA = indexA >= 0 ? indexA : STATUS_ORDER.length;
      const statusB = indexB >= 0 ? indexB : STATUS_ORDER.length;
      if (statusA !== statusB) return statusA - statusB;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, []);

  // Realtime subscription
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
          return sortOrders(newOrders);
        });
        setLastOrder(prev =>
          prev && prev.id === updated.id ? { ...prev, status: updated.status } : prev
        );
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [sortOrders]);

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

  // ── Place order ────────────────────────────────────────────
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
    const phone = phoneNumber.trim();
    const orderNote = note.trim();
    const orderId = `${num}-${Date.now()}`;
    const expiresAt = now.getTime() + 30 * 60 * 1000;

    const kitchenOrder = {
      id: orderId,
      orderNumber: num,
      customerName: name,
      customerPhone: phone,
      note: orderNote,
      items: orderItems,
      total,
      status: 'awaiting_payment',
      paymentStatus: 'awaiting_payment',
      createdAt: now,
      expiresAt,
      paymentConfirmedAt: null,
      expiredAt: null,
      timeLabel: formatTime(now),
      deviceToken: deviceToken || null,
    };

    const receipt = {
      id: orderId,
      orderNumber: num,
      customerName: name,
      customerPhone: phone,
      note: orderNote,
      items: orderItems,
      total,
      status: 'awaiting_payment',
      paymentStatus: 'awaiting_payment',
      expiresAt,
      paymentConfirmedAt: null,
      expiredAt: null,
      timeLabel: formatTime(now),
    };

    setKitchenOrders(prev => sortOrders([kitchenOrder, ...prev]));
    setLastOrder(receipt);
    setItems({});
    setCustomerName('');
    setPhoneNumber('');
    setNote('');

    supabase.from('orders').insert({
      id: orderId,
      order_number: num,
      customer_name: name,
      phone_number: phone,
      note: orderNote,
      items: orderItems,
      total,
      status: 'awaiting_payment',
      time_label: formatTime(now),
      device_token: deviceToken || null,
    }).then(({ error }) => {
      if (error) console.log('Supabase insert error:', error.message);
    });

    return num;
  }, [items, customerName, phoneNumber, note, sortOrders]);

  // ── Mark as paid ───────────────────────────────────────────
  const markOrderAsPaid = useCallback(async (orderId) => {
    const currentOrder = kitchenOrders.find(o => o.id === orderId) || lastOrder;
    if (!currentOrder) return;

    const updatedOrder = {
      ...currentOrder,
      status: 'paid',
      paymentStatus: 'paid',
      paymentConfirmedAt: new Date().toISOString(),
    };

    setKitchenOrders(prev => sortOrders(prev.map(o => o.id === orderId ? updatedOrder : o)));
    setLastOrder(prev => prev && prev.id === orderId ? { ...prev, status: 'paid', paymentStatus: 'paid' } : prev);

    supabase.from('orders').update({ status: 'paid' }).eq('id', orderId).then(({ error }) => {
      if (error) console.log('Supabase update error:', error.message);
    });
  }, [kitchenOrders, lastOrder, sortOrders]);

  // ── Expire order ───────────────────────────────────────────
  const expireOrder = useCallback(async (orderId) => {
    const currentOrder = kitchenOrders.find(o => o.id === orderId) || lastOrder;
    if (!currentOrder || currentOrder.status !== 'awaiting_payment') return;

    const updatedOrder = {
      ...currentOrder,
      status: 'expired',
      paymentStatus: 'expired',
      expiredAt: new Date().toISOString(),
    };

    setKitchenOrders(prev => sortOrders(prev.map(o => o.id === orderId ? updatedOrder : o)));
    setLastOrder(prev => prev && prev.id === orderId ? { ...prev, status: 'expired', paymentStatus: 'expired' } : prev);

    supabase.from('orders').update({ status: 'expired' }).eq('id', orderId).then(({ error }) => {
      if (error) console.log('Supabase update error:', error.message);
    });
  }, [kitchenOrders, lastOrder, sortOrders]);

  // ── Cancel order ───────────────────────────────────────────
  const cancelOrder = useCallback(async (orderId) => {
    const currentOrder = kitchenOrders.find(o => o.id === orderId);
    if (!currentOrder) return;

    const updatedOrder = {
      ...currentOrder,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    };

    setKitchenOrders(prev => sortOrders(prev.map(o => o.id === orderId ? updatedOrder : o)));
    setLastOrder(prev => prev && prev.id === orderId ? { ...prev, status: 'cancelled' } : prev);

    supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId).then(({ error }) => {
      if (error) console.log('Supabase update error:', error.message);
    });

    // Notify customer their order was cancelled
    if (currentOrder.deviceToken) {
      sendPushNotification(
        currentOrder.deviceToken,
        '❌ Order Cancelled',
        `Sorry, order ${currentOrder.orderNumber} has been cancelled. Please contact the shop for assistance.`
      );
    }
  }, [kitchenOrders, sortOrders]);

  // ── Advance order status ───────────────────────────────────
  const advanceOrder = useCallback(async (orderId) => {
    const currentOrder = kitchenOrders.find(o => o.id === orderId);
    if (!currentOrder) return;

    let nextStatus = 'done';
    if (currentOrder.status === 'awaiting_payment') nextStatus = 'paid';
    else if (currentOrder.status === 'paid') nextStatus = 'making';
    else if (currentOrder.status === 'making') nextStatus = 'ready';
    else if (currentOrder.status === 'ready') nextStatus = 'done';

    const updatedOrder = { ...currentOrder, status: nextStatus };
    setKitchenOrders(prev => sortOrders(prev.map(o => o.id === orderId ? updatedOrder : o)));

    supabase.from('orders').update({ status: nextStatus }).eq('id', orderId).then(({ error }) => {
      if (error) console.log('Supabase update error:', error.message);
    });

    // Send push notification based on new status
    if (currentOrder.deviceToken) {
      if (nextStatus === 'making') {
        sendPushNotification(
          currentOrder.deviceToken,
          '👨‍🍳 Your kota is being prepared!',
          `Order ${currentOrder.orderNumber} is now being made. It will be ready soon!`
        );
      } else if (nextStatus === 'ready') {
        sendPushNotification(
          currentOrder.deviceToken,
          '🍞 Your kota is ready!',
          `Order ${currentOrder.orderNumber} is ready for collection. Come to the counter!`
        );
      }
    }
  }, [kitchenOrders, sortOrders]);

  // ── Clear done/cancelled/expired orders ────────────────────
  const clearDoneOrders = useCallback(() => {
    setKitchenOrders(prev =>
      prev.filter(o => o.status !== 'done' && o.status !== 'expired' && o.status !== 'cancelled')
    );
  }, []);

  const clearLastOrder = useCallback(() => setLastOrder(null), []);

  const value = {
    items,
    customerName,
    phoneNumber,
    note,
    setName: setCustomerName,
    setPhoneNumber,
    setNote,
    addItem,
    removeItem,
    getQty,
    getTotal,
    getCount,
    getCartItems,
    placeOrder,
    markOrderAsPaid,
    expireOrder,
    cancelOrder,
    lastOrder,
    clearLastOrder,
    kitchenOrders,
    advanceOrder,
    clearDoneOrders,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export const useOrderStore = () => useContext(OrderContext);