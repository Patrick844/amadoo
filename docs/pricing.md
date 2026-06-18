# Pricing & Monetization

How Amadoo makes money. The multi-intent model is the advantage: **four monetization
surfaces with very different willingness-to-pay**, instead of one. Price to each.

> Status: the in-app paywall (`app/(app)/subscription.tsx`), the Likes unlock, and
> Boosts are **simulated** — they flip a local `isPremium` flag / show confirmations.
> No real billing yet. Wire to StoreKit / Play Billing + a backend entitlement before
> launch. Prices below are placeholders in USD (App Store / Play handle local currency).

---

## 1. Amadoo Premium (subscription) — one plan, value across every intent

The core recurring revenue. A single subscription that unlocks perks app-wide so the
UI stays simple (no four-way paywall maze).

**Perks**
- 🔓 See who likes you (reveal the Likes tab)
- ♾️ Unlimited likes & connection requests
- 🎯 Pro filters — industry, age, distance, per intent
- ✅ Verified badge (trust — matters most for business)
- 🚀 5 Boosts / month included
- 🙈 Browse incognito

**Plans** (shown in the paywall)

| Plan      | Price   | Effective | Notes        |
|-----------|---------|-----------|--------------|
| 1 month   | $9.99   | $9.99/mo  |              |
| 6 months  | $39.99  | $6.67/mo  | "Popular"    |
| 12 months | $59.99  | $5.00/mo  | "Best value" |

Localize for Lebanon: keep USD on stores, but the *real* price ceiling for residents
is lower than US/EU — test a lower local tier; diaspora tolerates full price.

---

## 2. Boosts (consumable) — universal, intent-agnostic

Pay to be the top profile in your decks for ~30 min. Works in **any** intent's deck,
so it's the cleanest cross-intent revenue. Wired to the Boost button on the swipe
screen (simulated).

| Pack      | Price  |
|-----------|--------|
| 1 Boost   | $3.99  |
| 5 Boosts  | $14.99 |
| 10 Boosts | $24.99 |

Super-Likes / "priority requests" can be sold the same way.

---

## 3. Per-intent add-ons — price to willingness-to-pay

Willingness-to-pay differs *wildly* per intent. This is where the model shines.

| Intent       | WTP    | How to monetize |
|--------------|--------|-----------------|
| **Business** | High   | LinkedIn-Premium economics. Verified-Pro badge, advanced industry/role filters, unlimited intros, "see who viewed you". **B2B tier** (recruiter seats, verified company accounts, event hosting) may out-earn consumer subs in Lebanon. |
| **Dating**   | Medium | Classic: Boosts, Super-Likes, see-who-likes-you, incognito. Reliable, price-sensitive. |
| **Friends**  | Low    | Don't sell subscriptions. Monetize via **events/experiences** (ticketed meetups). |
| **Activity** | Low    | Same — **B2B partnerships** (gyms, clubs, padel courts), event tickets, sponsored activities. |

---

## Sequencing (important)
Don't switch monetization on hard before liquidity — paywalling a cold app strangles
the growth you need.
1. **Build the graph free** (dating/friends mostly free) to reach density in one node.
2. **Lead revenue with Business** — it has WTP now and tolerates thinner liquidity.
3. **Boosts + events** as early transactional money.
4. **Premium subscription** scales once the network is dense and "see who likes you"
   has real pull.

## Double win
**Verification monetizes *and* strengthens the product** — a paid Verified badge is
exactly what business connections need to feel safe. Revenue and trust from one feature.

## Where it lives in code
- Paywall screen: `app/(app)/subscription.tsx` (reached from Settings + the Likes unlock).
- Entitlement flag: `isPremium` in `stores/auth.store.ts` (persisted; replace with a
  backend entitlement when billing is real).
- Likes gating: `app/(app)/likes.tsx`. Boosts: swipe screen `triggerBoost`.
