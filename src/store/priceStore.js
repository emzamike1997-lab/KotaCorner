/**
 * src/store/priceStore.js
 * Manages prices and sold out status for menu items
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MENU } from '../constants';

const PRICES_KEY   = 'kota_custom_prices';
const SOLDOUT_KEY  = 'kota_sold_out';

const PriceContext = createContext(null);

const getDefaults = () => {
  const defaults = {};
  MENU.forEach(item => { defaults[item.id] = item.price; });
  return defaults;
};

export function PriceProvider({ children }) {
  const [prices, setPrices]     = useState(getDefaults);
  const [soldOut, setSoldOut]   = useState({});   // { [id]: true/false }
  const [loaded, setLoaded]     = useState(false);

  // Load saved prices and sold out state on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PRICES_KEY),
      AsyncStorage.getItem(SOLDOUT_KEY),
    ]).then(([pricesVal, soldOutVal]) => {
      if (pricesVal) {
        try { setPrices(prev => ({ ...prev, ...JSON.parse(pricesVal) })); } catch (e) {}
      }
      if (soldOutVal) {
        try { setSoldOut(JSON.parse(soldOutVal)); } catch (e) {}
      }
      setLoaded(true);
    });
  }, []);

  const getPrice = useCallback((id) => prices[id], [prices]);

  const isSoldOut = useCallback((id) => !!soldOut[id], [soldOut]);

  // Full menu with current prices and sold out flags
  const getMenu = useCallback(() =>
    MENU.map(item => ({
      ...item,
      price: prices[item.id] ?? item.price,
      soldOut: !!soldOut[item.id],
    })),
    [prices, soldOut]);

  // Save all prices at once
  const saveAllPrices = useCallback(async (newPrices) => {
    const validated = {};
    Object.entries(newPrices).forEach(([id, val]) => {
      const parsed = parseInt(String(val), 10);
      if (!isNaN(parsed) && parsed >= 1) {
        validated[Number(id)] = parsed;
      }
    });
    const updated = { ...prices, ...validated };
    setPrices(updated);
    await AsyncStorage.setItem(PRICES_KEY, JSON.stringify(updated));
  }, [prices]);

  // Toggle sold out for a single item
  const toggleSoldOut = useCallback(async (id) => {
    const updated = { ...soldOut, [id]: !soldOut[id] };
    // Clean up false values to keep storage small
    if (!updated[id]) delete updated[id];
    setSoldOut(updated);
    await AsyncStorage.setItem(SOLDOUT_KEY, JSON.stringify(updated));
  }, [soldOut]);

  // Mark item as available again
  const markAvailable = useCallback(async (id) => {
    const updated = { ...soldOut };
    delete updated[id];
    setSoldOut(updated);
    await AsyncStorage.setItem(SOLDOUT_KEY, JSON.stringify(updated));
  }, [soldOut]);

  // Reset all prices to defaults
  const resetPrices = useCallback(async () => {
    setPrices(getDefaults());
    await AsyncStorage.removeItem(PRICES_KEY);
  }, []);

  // Clear all sold out items
  const clearSoldOut = useCallback(async () => {
    setSoldOut({});
    await AsyncStorage.removeItem(SOLDOUT_KEY);
  }, []);

  return (
    <PriceContext.Provider value={{
      prices, soldOut, loaded,
      getPrice, isSoldOut, getMenu,
      saveAllPrices, toggleSoldOut, markAvailable,
      resetPrices, clearSoldOut,
    }}>
      {children}
    </PriceContext.Provider>
  );
}

export const usePriceStore = () => useContext(PriceContext);