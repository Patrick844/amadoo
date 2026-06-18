# 10 — Package Managers & Dependencies: npm vs bun, and How to Avoid Install Errors

## What is a package manager?

When you build a React Native app, you don't write every line of code from scratch. You install libraries (packages) written by other developers — things like `expo-camera`, `zustand`, `react-native-reanimated`.

A **package manager** downloads these libraries from the internet and puts them in your `node_modules/` folder. It also tracks which libraries you need in `package.json`.

There are three main package managers for JavaScript/TypeScript projects:

| Package manager | Command | Speed | Notes |
|----------------|---------|-------|-------|
| **npm** | `npm install` | Baseline | Built into Node.js. Most common. Has peer dep issues. |
| **yarn** | `yarn` | ~2x faster | Made by Meta, popular for React projects |
| **bun** | `bun install` | 10-25x faster | Recommended for Amadoo |

---

## Why Amadoo uses bun

During setup, running `npm install` caused two problems:

1. **It was slow** — npm would hang for minutes with just a loading spinner, no feedback
2. **ERESOLVE errors** — npm's strict peer dependency checking would refuse to install certain combinations of packages

bun handles both of these:
- It's dramatically faster (installs 929 packages in seconds, not minutes)
- It resolves peer dependencies without throwing errors

### Installing bun (Mac)

```bash
curl -fsSL https://bun.sh/install | bash
# Close and reopen your terminal, then:
bun --version
```

### Using bun

```bash
# Install all packages listed in package.json
bun install

# Add a new package
bun add some-library

# Add a dev-only package
bun add -d some-dev-library

# Remove a package
bun remove some-library
```

---

## The .npmrc file — why it exists

Even though Amadoo uses bun, some Expo tools (like `npx expo install --fix`) internally call npm under the hood. If those npm calls hit peer dependency conflicts, they fail.

The fix is a `.npmrc` file in the project root:

```
legacy-peer-deps=true
```

This single line tells npm to skip its strict peer dependency checks, falling back to the old behavior. npm automatically reads this file before every command, including when it's called internally by Expo tools.

**You should never delete this file.** It's required for `npx expo install --fix` to work.

---

## Understanding peer dependencies

A **peer dependency** is when library A says "you also need to install library B yourself — I won't install it for you."

Example: `react-native-reanimated` v4 has this peer dependency:

```
react-native-reanimated@4.x requires react-native-worklets@~0.6.0
```

This means:
- Installing `react-native-reanimated` alone is not enough
- You must also manually add `react-native-worklets` to your `package.json`
- If you don't, the Babel build step fails with: `Cannot find module 'react-native-worklets/plugin'`

This split happened because Reanimated v4 extracted the "worklet" system into its own package so other libraries could also use it.

**In Amadoo, both are already in `package.json`:**
```json
"react-native-reanimated": "~4.1.1",
"react-native-worklets": "~0.6.0"
```

---

## ERESOLVE error — what it means and how to fix it

The `ERESOLVE` error from npm looks like this:

```
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error
npm error While resolving: amadoo@1.0.0
npm error Found: react@19.1.0
npm error node_modules/react
npm error   react@"19.1.0" from the root project
npm error
npm error Could not resolve dependency:
npm error   peerDependencies: react@"^18.0.0"
```

**What this means:** A library says it needs React 18, but you have React 19. npm refuses to continue.

**Why it's usually wrong:** Most libraries that say `react@"^18"` in their peer deps actually work fine with React 19 — they just haven't updated their declaration yet. The code itself is compatible.

**How to fix it:**

Option 1 — Use bun (doesn't have this problem):
```bash
bun install
```

Option 2 — Add `.npmrc` with `legacy-peer-deps=true`:
```bash
echo "legacy-peer-deps=true" > .npmrc
npm install
```

Option 3 — Pass the flag each time:
```bash
npm install --legacy-peer-deps
```

---

## npx expo install — Expo's version resolver

For Expo libraries, always use `npx expo install` instead of `bun add` or `npm install`. Expo's install command automatically picks the version of each library that is compatible with your specific Expo SDK version.

```bash
# Correct — Expo picks the right version for SDK 54
npx expo install expo-camera

# Also correct — install from package.json and fix mismatches
npx expo install --fix
```

The `--fix` flag scans your `package.json` and updates any library versions that don't match what Expo SDK 54 expects.

---

## The correct install sequence for Amadoo

If you ever need to set up the project from scratch (new computer, deleted node_modules, etc.):

```bash
# 1. Make sure bun is installed
bun --version

# 2. Install all dependencies
bun install

# 3. Let Expo fix any version mismatches
npx expo install --fix
# (this uses npm internally, which reads .npmrc automatically)

# 4. Start the app
npx expo start
```

---

## Common install errors and their fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `npm error ERESOLVE` | npm's strict peer dep checks | Use bun, or add `.npmrc` with `legacy-peer-deps=true` |
| `Cannot find module 'react-native-worklets/plugin'` | Missing peer dep of Reanimated v4 | Add `"react-native-worklets": "~0.6.0"` to package.json, then `bun install` |
| `Unable to resolve "expo-linking"` | expo-router requires expo-linking as a peer dep | Add `"expo-linking": "~8.0.12"` to package.json, then `bun install` |
| `Project is incompatible with this version of Expo Go` | Expo Go on your phone is a different SDK | Download Expo Go that matches your SDK version (SDK 54) |
| `The required package expo-asset cannot be found` | Missing package in package.json | `npx expo install expo-asset` |
| npm hangs with no output | npm is slow on large trees | Switch to bun |

---

## SDK versions — why they must match

Expo releases a new **SDK** (Software Development Kit) every ~3 months. Each SDK version locks in specific versions of React, React Native, and all Expo libraries.

Amadoo uses **SDK 54**:
- `expo`: `~54.0.0`
- `react`: `19.1.0`
- `react-native`: `0.81.5`
- `expo-router`: `~6.0.0`

**The Expo Go app on your phone must also be SDK 54.** If your Expo Go is SDK 52 or SDK 53, you'll see:

```
Project is incompatible with this version of Expo Go.
SDK: 54.0.0 | Expo Go: 52.0.0
```

Fix: Update Expo Go from the App Store.

If the App Store doesn't show an update, it means the latest Expo Go is newer than SDK 54 — this shouldn't happen, but if it does, use the iOS Simulator (`npx expo start` then press `i`) or build a custom dev client.

---

## Resources

- bun docs: https://bun.sh/docs
- npm peer deps explained: https://docs.npmjs.com/cli/v10/using-npm/package-spec
- Expo SDK versions: https://docs.expo.dev/versions/latest/
- `npx expo install` docs: https://docs.expo.dev/more/expo-cli/#install
