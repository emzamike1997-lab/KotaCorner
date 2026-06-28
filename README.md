# Kota Corner 🍞🔥

An Expo Go ordering app for a local kota spot.
Customers order on their phone and collect in-store when ready.

## Quick Start

```bash
cd KotaCorner
npm install
npx expo start
```

Then scan the QR code with the **Expo Go** app on your phone.

## Project Structure

```
KotaCorner/
├── App.js                        ← Root: tab navigator
├── app.json                      ← Expo config
├── package.json
└── src/
    ├── constants/
    │   └── index.js              ← MENU data, COLORS, TAG_COLORS
    ├── store/
    │   └── orderStore.js         ← Zustand global state
    ├── components/
    │   └── MenuItem.jsx          ← Individual menu item card
    └── screens/
        ├── MenuScreen.jsx        ← Main menu + name entry
        ├── CartScreen.jsx        ← Review order before placing
        ├── ConfirmScreen.jsx     ← Order confirmed + order number
        └── KitchenScreen.jsx     ← Owner/kitchen view
```

## Screens

| Screen | Who sees it | What it does |
|--------|-------------|--------------|
| Menu | Customer | Browse items, adjust quantities, enter name |
| Cart | Customer | Review order, adjust, confirm total |
| Confirm | Customer | Order number + summary, animated pulse |
| Kitchen | Shop owner | See all orders, advance status: New → Making → Ready → Done |

## Adding a Real Backend (next step)

Replace the mock orders in `KitchenScreen.jsx` with a real-time source.
Recommended free options for solo dev:

- **Supabase** (Postgres + real-time subscriptions) — free tier is generous
- **Firebase Firestore** — easy real-time, free tier works well for low volume
- **AsyncStorage** — offline-only, fine for local single-device use

## Building a Standalone APK

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

This produces an `.apk` you can install directly on Android phones
without needing the Play Store.

## Contacts on the menu
+27 73 786 9844 / +27 78 954 9721
