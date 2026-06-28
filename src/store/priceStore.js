/**
 * src/store/priceStore.js
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MENU } from '../constants';

const PRICES_KEY = 'kota_custom_prices';
const PriceContext = createContext(null);

const getDefaults = () => {
  const defaults = {};
  MENU.forEach(item => { defaults[item.id] = item.price; });
  return defaults;
};

export function PriceProvider({ children }) {
  const [prices, setPrices] = useState(getDefaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PRICES_KEY).then((val) => {
      if (val) {
        try {
          const saved = JSON.parse(val);
          setPrices(prev => ({ ...prev, ...saved }));
        } catch (e) {
          console.log('Price load error:', e);
        }
      }
      setLoaded(true);
    });
  }, []);

  const getPrice = useCallback((id) => prices[id], [prices]);

  const getMenu = useCallback(() =>
    MENU.map(item => ({ ...item, price: prices[item.id] ?? item.price })),
    [prices]);

  // Save entire price map at once — fixes the revert bug
  const saveAllPrices = useCallback(async (newPrices) => {
    const validated = {};
    Object.entries(newPrices).forEach(([id, val]) => {
      const parsed = parseInt(String(val), 10);
      if (!isNaN(parsed) && parsed >= 1) {
        validated[Number(id)] = parsed;
      }
    });
    setPrices(prev => ({ ...prev, ...validated }));
    await AsyncStorage.setItem(PRICES_KEY, JSON.stringify({ ...prices, ...validated }));
  }, [prices]);

  const resetPrices = useCallback(async () => {
    const defaults = getDefaults();
    setPrices(defaults);
    await AsyncStorage.removeItem(PRICES_KEY);
  }, []);

  return (
    <PriceContext.Provider value={{ prices, getPrice, getMenu, saveAllPrices, resetPrices, loaded }}>
      {children}
    </PriceContext.Provider>
  );
}

export const usePriceStore = () => useContext(PriceContext);