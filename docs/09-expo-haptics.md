# 09 — expo-haptics: Making the Phone Vibrate

## What is haptics?

**Haptics** is the technical word for the physical vibration/buzz you feel when your phone gives you feedback.

Examples you already know:
- When you press a button on your iPhone and feel a tiny click → that's haptics
- When you get a notification and the phone buzzes → that's haptics
- When you hold an app icon to delete it and feel a pulse → that's haptics
- When you pull down to refresh and feel a small tap → that's haptics

Apple calls their system **Taptic Engine** — it's a tiny motor inside the iPhone that can produce very precise, short vibrations. It's not just a buzz — it can feel like a real physical click.

Android (Samsung etc.) has something similar but less precise.

---

## Why use haptics in Amadoo?

Haptics make the app feel **alive and responsive**. Without haptics, tapping buttons feels flat and digital. With haptics, it feels like you're touching something real.

In Amadoo specifically:
- **Swiping right (like)** → medium impact — satisfying "yes" feeling
- **Swiping left (dislike)** → light impact — subtle "no" feeling  
- **It's a Match!** → success notification — celebratory buzz
- **Tapping a hobby chip** → selection feedback — tiny click
- **Pressing any button** → light impact — confirms the tap registered

These are tiny details. But they're the difference between an app that feels cheap and one that feels like Tinder or Instagram.

---

## The three types of haptics in expo-haptics

### 1. Impact Feedback
Short, sharp taps. Used for button presses and interactions.

```typescript
import * as Haptics from 'expo-haptics'

// Light — barely noticeable, for small actions
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

// Medium — noticeable click, for standard buttons
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

// Heavy — strong tap, for important actions
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
```

Think of it like this:
- Light = tapping a keyboard key
- Medium = pressing a button on a camera
- Heavy = clicking a mechanical keyboard key

### 2. Notification Feedback
Patterns that communicate success, warning, or error.

```typescript
// Success — double tap (used for "It's a Match!")
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

// Warning — triple tap
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)

// Error — three rapid taps (used when a form submission fails)
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
```

You've felt these before: when you try to unlock your iPhone with the wrong Face ID, it gives you that specific "error" buzz pattern.

### 3. Selection Feedback
An ultra-subtle click, used when scrolling through a list or toggling a picker.

```typescript
await Haptics.selectionAsync()
```

This is the tiny tick you hear/feel when spinning the scroll wheel to pick a time in the Clock app.

---

## How it's used in Amadoo (real examples from the code)

### In the Button component — every button tap
```typescript
// components/ui/Button.tsx
async function handlePress() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  onPress()  // then run the actual button action
}
```
The haptic fires first (instantly), then the action runs. Users feel the button "click" before anything happens on screen. This makes the app feel fast even if an API call takes 1 second.

### In the MultiSelect component — selecting hobbies
```typescript
// components/onboarding/MultiSelect.tsx
async function handleToggle(value: string) {
  await Haptics.selectionAsync()  // tiny click when tapping a chip
  onToggle(value)
}
```

### In the Swipe screen — swiping right vs left
```typescript
// app/(app)/index.tsx
function handleLike() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)  // satisfying "yes"
  advanceDeck()
}

function handleDislike() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)  // subtle "no"
  advanceDeck()
}

function handleSuperLike() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)  // special!
  advanceDeck()
}
```

Notice the difference:
- Like = Medium (bigger, more satisfying)
- Dislike = Light (small, doesn't feel great — slight psychological nudge toward liking)
- Super Like = Success notification (special pattern, feels different from regular taps)

---

## Platform differences

| Feature | iPhone | Android (Samsung) |
|---------|--------|-------------------|
| Precision | Very precise, multiple patterns | More basic |
| ImpactFeedbackStyle | Works perfectly | Falls back to simple vibration |
| notificationAsync | Works perfectly | Falls back to simple vibration |
| selectionAsync | Works perfectly | May not work on all devices |

You don't need to handle this difference yourself. Expo automatically uses the best available haptic on each device. On Android, if a specific pattern isn't supported, it gracefully falls back to a simple buzz — it never crashes.

---

## How to use it yourself

```typescript
import * as Haptics from 'expo-haptics'

// In any function that responds to a user action:
async function handleDelete() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  // ... then do the delete
}
```

**Rule of thumb:** Only use haptics in response to something the user **intentionally** did (tap, swipe, select). Never use it automatically without user action — that feels annoying and spammy.

---

## Installation

Already installed in Amadoo (it's in `package.json`). If you ever start a new project:
```bash
npx expo install expo-haptics
```

Use `npx expo install` (not `npm install`) for Expo libraries — it automatically picks the version that works with your Expo SDK.

---

## Summary

| Type | Use when | Feel |
|------|---------|------|
| `Impact.Light` | Small button taps, toggles | Barely noticeable click |
| `Impact.Medium` | Standard actions, swiping right | Satisfying click |
| `Impact.Heavy` | Destructive actions, force press | Strong thud |
| `Notification.Success` | Match, saved, completed | Double-tap pattern |
| `Notification.Warning` | Are you sure? | Triple-tap |
| `Notification.Error` | Form error, failed action | Rapid triple-tap |
| `selectionAsync` | Picker scroll, chip selection | Ultra-subtle tick |

Docs: https://docs.expo.dev/versions/latest/sdk/haptics/
