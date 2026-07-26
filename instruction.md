# Smittenz — Privacy-First Couple Vault
## Project Overview for Frontend Development

---

## 🧠 What is Smittenz?

Smittenz is a **privacy-first mobile application** built exclusively for couples. It provides a secure, encrypted digital space for private communication, shared memories, and relationship milestones — accessible only between two connected partners.

**Core Principles:**
- Privacy-first architecture
- Emotional connection through design
- End-to-end data security

---

## 👥 Target Audience

- Couples (18–30 primary demographic)
- Gen Z & Millennial users
- Privacy-conscious individuals
- Long-distance relationship users

**Design Tone:** Warm, intimate, modern, Gen Z-native — think soft dark themes, glassy UI, smooth micro-animations, expressive typography.

---

## 📱 Platform

- **React Native** (Android + iOS)
- Mobile-first, responsive design
- Bottom tab navigation

---

## 🗂️ App Structure & Screens

### 1. Onboarding & Auth
- Splash screen
- Sign up / Login (email + password)
- Partner invite flow (link or code)
- Subscription/payment screen (Cashfree / PhonePe)

### 2. Home Dashboard
- Relationship summary card
- Recent memories highlight
- Quick actions
- Partner online status

### 3. Secure Chat
- Real-time messaging
- Image & video sharing
- GIF search (Tenor API)
- Sticker browser (category tabs: Love, Happy, Sad, Fun, Sleep)
- Emoji picker
- Quick action buttons (Good night, On my way, Working, etc.)
- Disappearing message options (24h / 7d / 90d)

### 4. Private Vault
- My Vault (upload, manage, delete)
- Partner Vault (view-only, no download)
- Secure media streaming
- No file export / no screenshots

### 5. Memory Calendar
- Calendar view with highlighted memory dates
- Add memory: image + description + date
- "Our Journey" timeline view
- Memory highlights on dashboard

### 6. Profile & Settings
- Account management
- Subscription status
- Privacy controls
- Partner revocation
- Data deletion

### 7. Hidden App Mode (Privacy Enhancement)
- App disguised as calculator or notes app
- Unlock via secret code

### 8. Panic Mode
- Instantly switches to a fake dummy interface
- Triggered by shake or quick-tap

### 9. Ads Section (Future)
- Placeholder cards ("Coming Soon")
- Reserved for sponsored content

---

## 🎨 Frontend Design System

### Color Palette (Recommended)
- Background: Deep matte black / dark plum `#0D0D0D` / `#1A0A1E`
- Surface: Soft glassmorphic panels
- Accent: Rose pink `#FF4F7B` + soft gold `#FFD700`
- Text: Off-white `#F5F0FF`
- Muted: `#6B6B8A`

### Typography
- Display: Playfair Display / Cormorant Garamond (romantic, premium)
- Body: DM Sans / Plus Jakarta Sans (clean, modern)
- Code/Labels: JetBrains Mono (minimal usage)

### UI Style
- Glassmorphism cards with blur + border glow
- Soft gradient meshes in backgrounds
- Lottie animations for emotional moments (heart sends, memory saves)
- Haptic feedback on key interactions
- Bottom sheet modals (not full-screen push navigations)
- Skeleton loaders instead of spinners

---

## 🧰 Recommended Tech Stack (Frontend)

| Category | Library/Tool |
|---|---|
| Framework | React Native (Expo or bare) |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| Animations | React Native Reanimated 3 |
| Gestures | React Native Gesture Handler |
| Graphics | React Native Skia |
| Gradients | Expo Linear Gradient |
| Blur/Glass | @react-native-community/blur |
| Lottie Animations | lottie-react-native |
| Chat UI Base | React Native Gifted Chat |
| Images | React Native Fast Image |
| Video | Expo AV |
| Calendar | React Native Calendars |
| GIF Integration | Tenor API |
| Screenshot Block | react-native-screenshot-prevent |
| Secure Storage | React Native Keychain |
| Biometrics | Expo Local Authentication |
| Icons | React Native Vector Icons / Phosphor Icons |
| State Management | Zustand or Redux Toolkit |
| API Calls | Axios + React Query |

---

## 🔐 Privacy & Security (Frontend Considerations)

- Screenshot prevention active on all media/chat screens
- iOS: black screen masking on screenshot attempt
- No media download buttons exposed in UI
- Biometric lock on app open (optional user setting)
- Secure storage for tokens (no AsyncStorage for sensitive data)
- Auto-lock after inactivity timeout

---

## 🧩 Key Features Summary

| Feature | Priority |
|---|---|
| Secure Chat with GIFs/Stickers | P0 |
| Private Vault (My + Partner) | P0 |
| Memory Calendar | P0 |
| End-to-End Encryption UI | P0 |
| Screenshot Prevention | P0 |
| Disappearing Messages | P1 |
| Hidden App Mode | P1 |
| Panic Mode | P1 |
| Quick Action Messages | P1 |
| Subscription/Payment Flow | P0 |
| Ads Section | P3 (Future) |

---

## 💡 Gen Z Design Principles for Smittenz

1. **Dark mode first** — always
2. **Micro-interactions everywhere** — taps should feel alive
3. **Glassmorphism** — frosted panels, blurred backgrounds
4. **Expressive typography** — big, bold display fonts for headers
5. **Animated empty states** — Lottie illustrations, not plain text
6. **Haptic feedback** — critical for feel
7. **Bottom sheets > modals** — feels native and smooth
8. **Skeleton loading** — no spinners
9. **Swipe gestures** — swipe to reply, swipe to delete
10. **Personalized touches** — partner name shown contextually throughout UI

---

## 📂 Suggested Folder Structure (React Native)

```
/src
  /screens
    /auth         → Login, Signup, Invite, Payment
    /home         → Dashboard
    /chat         → Chat, GIFPicker, StickerPanel
    /vault        → MyVault, PartnerVault, MediaViewer
    /calendar     → MemoryCalendar, AddMemory, Journey
    /profile      → Settings, Privacy, Subscription
    /hidden       → CalculatorMode, PanicMode
  /components
    /ui           → Buttons, Cards, Sheets, Inputs
    /chat         → MessageBubble, QuickActions, EmojiBar
    /vault        → MediaCard, UploadButton
    /memory       → CalendarDay, MemoryCard, Timeline
  /hooks
  /store          → Zustand stores
  /services       → API, Auth, Storage, Encryption
  /assets
    /fonts
    /lottie
    /images
  /constants
  /utils
```

---

*Last updated: 2026 | Stack: React Native | Platform: Android + iOS*