# SplitBill App Architecture

This document summarizes the project’s structure, navigation, providers, domain modules, and key conventions so contributors can quickly understand and work on the app.

## Overview
- Platform: Expo (React Native + Expo Router)
- Language: TypeScript
- Navigation: expo-router (file-based routing) with React Navigation under the hood
- Styling: React Native style objects; theme utilities in `constants/theme.ts`
- Fonts: Poppins via `@expo-google-fonts/poppins`
- Animations: `react-native-reanimated`
- State/context: Custom contexts for Auth and Split Bill domain
- Polyfills: `polyfills/react-internals.ts` imported at app root

## Scripts
Defined in `package.json`:
- `start`: expo start
- `android`: expo run:android
- `ios`: expo run:ios
- `web`: expo start --web
- `reset-project`: node ./scripts/reset-project.js
- `lint`: expo lint

## Directory Structure (key paths)
- `app/` — Expo Router entry and screens
  - `_layout.tsx` — Root stack, fonts loading, splash handling, providers
  - `(auth)/` — Auth group: `_layout.tsx`, `login.tsx`, `register.tsx`
  - `(tabs)/` — Bottom tabs group: `_layout.tsx`, `index.tsx`, `explore.tsx`
  - `transactions/` — Nested stack: `_layout.tsx`, `index.tsx`, `[recordId].tsx`
  - Other screens: `participants.tsx`, `expenses.tsx`, `additional-expenses.tsx`, `payment-methods.tsx`, `summary.tsx`, `scan.tsx`, `profile.tsx`, `modal.tsx`
- `components/` — Reusable UI components
  - `ui/` — Common primitives and wrappers (collapsible, icon symbols)
  - Other: `haptic-tab`, `hello-wave`, `parallax-scroll-view`, `themed-*`
- `constants/` — Static config: `fonts.ts`, `theme.ts`
- `context/` — React Context providers (Auth, SplitBill)
- `hooks/` — Cross-cutting hooks; theme and color scheme helpers
- `lib/` — Domain logic
  - `auth/` — auth client and types
  - `split-bill/` — calculations, formatting, types, and API integration
- `polyfills/` — RN polyfills (react internals)
- `scripts/` — Project tooling scripts

## App Root Responsibilities (app/_layout.tsx)
- Load Poppins fonts and set default `Text`/`TextInput` styles globally.
- Manage splash screen (prevent auto hide until fonts are ready).
- Provide root contexts: `AuthProvider`, `SplitBillProvider`.
- Configure the root stack via `<Stack>` with routes:
  - `(auth)` — no header
  - `index` — no header
  - `participants` — title: "Kelola Teman"
  - `expenses` — title: "Catat Pengeluaran"
  - `additional-expenses` — title: "Additional Expense"
  - `payment-methods` — title: "Metode Pembayaran"
  - `transactions` — no header (nested layout)
  - `summary` — title: "Ringkasan Split Bill"
  - `scan` — title: "Scan Bill dengan AI"
  - `profile` — title: "Profil Kamu"
  - `modal` — modal presentation
- Theme: Uses `ThemeProvider` with `DefaultTheme`.
- StatusBar: dark style with background `#f6fafb`.

## Navigation
- Uses Expo Router’s file-based conventions.
- Group layouts (`(auth)/_layout.tsx`, `(tabs)/_layout.tsx`) scope screens and control headers/tab bars within groups.
- Nested stacks (e.g., `transactions/_layout.tsx`) manage flow-specific navigation (e.g., list -> detail via dynamic route `[recordId].tsx`).

## State & Data Flow
- `AuthProvider` (context/auth-context.tsx)
  - Holds user auth state and actions (login, logout, register). Typically used to gate access to protected routes and show appropriate stacks.
- `SplitBillProvider` (context/split-bill-context.tsx)
  - Centralizes participants, expenses, payment methods, and derived summary.
  - Consumes helpers in `lib/split-bill/` for pure computations and formatting.
- Screens consume contexts via hooks to read/write state and to perform actions.

## Domain Modules (lib/split-bill)
- `types.ts` — Core domain types (Participant, Expense, PaymentMethod, Transaction, Summary, etc.).
- `calculations.ts` — Pure functions to compute split outcomes (per-person share, balances, settlement suggestions).
- `format.ts` — Currency/number formatting helpers; labels for UI.
- `api.ts` — Server/data access stub or implementation for persistence.

## UI Components
- `components/ui/*` provide primitives and wrappers that handle theming and platform differences.
- `themed-text` and `themed-view` integrate with color scheme and theme tokens.
- `haptic-tab` wraps tab interactions with haptic feedback.
- `parallax-scroll-view` provides enhanced scroll effects for screens like profile/summary.

## Theming & Fonts
- `constants/theme.ts` defines color palette, spacing, radii, and other tokens.
- Text and TextInput defaults are set globally in `app/_layout.tsx` to use Poppins Regular.
- Consider using `constants/fonts.ts` for additional mapping if needed.

## Polyfills
- `polyfills/react-internals.ts` imported at the app root to stabilize React Native internals with the current React/Expo versions.

## Conventions
- Prefer pure functions in `lib/*` for business logic; call them from contexts or screens.
- UI-only state local to a screen/component stays in component state; cross-screen/domain state goes in contexts.
- Keep screens thin; factor reusable UI into `components/*` and domain logic into `lib/*`.
- Avoid logic in layouts; layouts wire providers and navigation.
- Type everything in `lib/*` and `context/*` with explicit types from `types.ts`.

## Extension Points
- Add flows inside `app/` using Expo Router conventions. Create a group with its own `_layout.tsx` for scoping.
- Extend domain logic in `lib/split-bill/*` and expose via `SplitBillProvider`.
- Introduce feature flags/config under `constants/` for environment-dependent behavior.

## Known Gaps / Next Steps
- Tests: No unit testing setup. Suggested next step is to add Jest + ts-jest + `@testing-library/react-native` for:
  - `lib/split-bill/calculations.ts` (pure functions)
  - critical screens and hooks
- Linting: ESLint is configured via `eslint-config-expo`. Consider adding stricter TypeScript rules if desired.
- Error handling: standardize error boundaries and toast/notification strategy for API failures.
- Analytics/Logging: add an abstracted analytics/logger layer if needed.

---
This document should be updated alongside significant changes to navigation, providers, or domain logic.