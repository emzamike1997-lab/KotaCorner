import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  StyleSheet, Animated, Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { OrderProvider } from './src/store/orderStore';
import { PriceProvider } from './src/store/priceStore';
import { supabase } from './src/config/supabase';
import { COLORS } from './src/constants';
import MenuScreen from './src/screens/MenuScreen';
import CartScreen from './src/screens/CartScreen';
import ConfirmScreen from './src/screens/ConfirmScreen';
import KitchenScreen from './src/screens/KitchenScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const KITCHEN_PIN = '250397';
const STORAGE_KEY = 'kota_kitchen_unlocked';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotifications() {
  if (!Device.isDevice) return null;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await supabase.from('device_tokens').upsert({ token }, { onConflict: 'token' });
  return token;
}

function usePatternTap(onMatch) {
  const phase = useRef(0);
  const phaseCount = useRef(0);
  const timer = useRef(null);

  const reset = useCallback(() => {
    phase.current = 0;
    phaseCount.current = 0;
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleTap = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (phase.current === 0) {
      phaseCount.current += 1;
      if (phaseCount.current === 2) {
        phase.current = 1;
        phaseCount.current = 0;
        timer.current = setTimeout(() => {
          phase.current = 2;
          timer.current = setTimeout(reset, 1800);
        }, 600);
      } else {
        timer.current = setTimeout(reset, 800);
      }
    } else if (phase.current === 1) {
      reset();
    } else if (phase.current === 2) {
      phaseCount.current += 1;
      if (phaseCount.current === 4) {
        reset();
        onMatch();
      } else {
        timer.current = setTimeout(reset, 800);
      }
    }
  }, [onMatch, reset]);

  return handleTap;
}

function PinModal({ visible, onSuccess, onDismiss, isUnlocked }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const shake = useRef(new Animated.Value(0)).current;

  const doShake = () => {
    Vibration.vibrate(200);
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = () => {
    if (pin === KITCHEN_PIN) { setPin(''); setError(''); onSuccess(); }
    else { setError('Wrong PIN. Try again.'); setPin(''); doShake(); }
  };

  const handleClose = () => { setPin(''); setError(''); onDismiss(); };

  if (isUnlocked) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>KITCHEN ACCESS</Text>
            <Text style={styles.modalSub}>Kitchen tab is currently unlocked.</Text>
            <TouchableOpacity style={styles.pinBtn} onPress={() => { onSuccess('hide'); }}>
              <Text style={styles.pinBtnText}>HIDE KITCHEN TAB</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
          <Text style={styles.modalTitle}>KITCHEN ACCESS</Text>
          <Text style={styles.modalSub}>Enter PIN to unlock kitchen view</Text>
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <TextInput
              style={[styles.pinInput, error ? styles.pinInputError : null]}
              value={pin}
              onChangeText={(t) => { setPin(t); setError(''); }}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="● ● ● ● ● ●"
              placeholderTextColor={COLORS.muted}
              autoFocus
            />
          </Animated.View>
          {error ? <Text style={styles.pinError}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.pinBtn, pin.length < 4 && styles.pinBtnDisabled]}
            onPress={handleSubmit}
            disabled={pin.length < 4}
          >
            <Text style={styles.pinBtnText}>UNLOCK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function CustomerStack({ onShopNameTap, deviceToken }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Menu">
        {(props) => <MenuScreen {...props} onShopNameTap={onShopNameTap} />}
      </Stack.Screen>
      <Stack.Screen name="Cart">
        {(props) => <CartScreen {...props} deviceToken={deviceToken} />}
      </Stack.Screen>
      <Stack.Screen name="Confirm" component={ConfirmScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [kitchenUnlocked, setKitchenUnlocked] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [deviceToken, setDeviceToken] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === 'true') setKitchenUnlocked(true);
    });
    registerForPushNotifications().then(token => {
      if (token) setDeviceToken(token);
    });
  }, []);

  const triggerPin = useCallback(() => setShowPin(true), []);
  const handleShopNameTap = usePatternTap(triggerPin);

  const handlePinSuccess = useCallback(async (action) => {
    setShowPin(false);
    if (action === 'hide') {
      setKitchenUnlocked(false);
      await AsyncStorage.setItem(STORAGE_KEY, 'false');
    } else {
      setKitchenUnlocked(true);
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    }
  }, []);

  const handlePinDismiss = useCallback(() => setShowPin(false), []);

  return (
    <PriceProvider>
      <OrderProvider>
        <View style={styles.appShell}>
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: COLORS.accent,
                tabBarInactiveTintColor: COLORS.muted,
                tabBarLabelStyle: styles.tabLabel,
                tabBarItemStyle: styles.tabBarItem,
              }}
            >
            <Tab.Screen
              name="Order"
              options={{
                tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>🧾</Text>,
              }}
            >
              {() => <CustomerStack onShopNameTap={handleShopNameTap} deviceToken={deviceToken} />}
            </Tab.Screen>

            {kitchenUnlocked && (
              <Tab.Screen
                name="Kitchen"
                component={KitchenScreen}
                options={{
                  tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>🍳</Text>,
                }}
              />
            )}
          </Tab.Navigator>

            <PinModal
              visible={showPin}
              isUnlocked={kitchenUnlocked}
              onSuccess={handlePinSuccess}
              onDismiss={handlePinDismiss}
            />
          </NavigationContainer>
        </View>
      </OrderProvider>
    </PriceProvider>
  );
}

const styles = StyleSheet.create({
  appShell: { flex: 1, backgroundColor: COLORS.bg },
  tabBar: {
    backgroundColor: COLORS.bgDeep,
    borderTopColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderRadius: 20,
    marginHorizontal: 12,
    marginBottom: 30,
    paddingBottom: 8,
    paddingTop: 8,
    height: 65,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  tabBarItem: { minHeight: 56, justifyContent: 'center' },
  tabLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  tabIcon: { fontSize: 22 },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalCard:      { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 28, width: '82%', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border },
  modalTitle:     { color: COLORS.yellow, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  modalSub:       { color: COLORS.muted, fontSize: 12, textAlign: 'center' },
  pinInput:       { backgroundColor: COLORS.bg, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 20, paddingVertical: 12, color: COLORS.text, fontSize: 22, letterSpacing: 8, textAlign: 'center', width: 200 },
  pinInputError:  { borderColor: '#cc3333' },
  pinError:       { color: '#cc3333', fontSize: 12, textAlign: 'center' },
  pinBtn:         { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32, marginTop: 4, width: '100%', alignItems: 'center' },
  pinBtnDisabled: { backgroundColor: '#4a2010' },
  pinBtnText:     { color: COLORS.text, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  cancelBtn:      { paddingVertical: 6 },
  cancelBtnText:  { color: COLORS.muted, fontSize: 13 },
});