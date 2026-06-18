# Dummy Data — Local Dev Setup

## Setup

```bash
# From the backend/ directory:
uv run python seed.py
```

Safe to re-run — skips rows that already exist.

---

## Test accounts

### Your login (User A)

| Email | Password | Name | Age |
|---|---|---|---|
| `test@amadoo.com` | `Test123!` | Alex | 27 |

---

### Swipe deck (appear in Alex's deck)

| Email | Name | Age | Notes |
|---|---|---|---|
| `sarah@amadoo.com` | Sarah | 25 | **Has pre-liked Alex** → instant match animation |
| `lara@amadoo.com` | Lara | 22 | Normal card |
| `celine@amadoo.com` | Celine | 23 | No bio — tests empty-bio card state |
| `rima@amadoo.com` | Rima | 26 | ✓ Face-verified badge |
| `dana@amadoo.com` | Dana | 24 | 3 photos — tests photo gallery |
| `hana@amadoo.com` | Hana | 21 | No hobbies — sparse profile |

---

### Pre-matched (appear in Matches tab immediately)

| Email | Name | State |
|---|---|---|
| `maya@amadoo.com` | Maya | Active conversation — both sides replied |
| `nour@amadoo.com` | Nour | Sent 2 messages, Alex hasn't replied (unread badge) |
| `rana@amadoo.com` | Rana | No messages yet ("Say hi! 👋" empty state) |

---

## Test cases covered

| Test | How to trigger |
|---|---|
| **Match animation** | Swipe right on Sarah |
| **Match — active conversation** | Open Matches tab → Maya |
| **Match — unread badge** | Open Matches tab → Nour has badge |
| **Match — empty state** | Open Matches tab → Rana shows "Say hi! 👋" |
| **Verified badge on card** | Rima and Nour show ✓ badge |
| **No bio card** | Celine's swipe card has no bio |
| **Multiple photos** | Dana's card has 3 photos |
| **Sparse profile** | Hana has no hobbies/activities |
| **Swipe right (like)** | Any card in deck |
| **Swipe left (dislike)** | Any card in deck |
| **Snap back** | Drag card partially then release |
| **Undo** | Hit the yellow back-arrow button |

---

## OTP

**Dev bypass:** enter `000000` on any verify-email screen.

Real OTPs are also sent to `patricksaade8@gmail.com` via Gmail SMTP
(configured in `backend/.env`).

---

## Photos used (Unsplash — no download needed)

| User | URL |
|---|---|
| Alex | `photo-1507003211169-0a1dd7228f2d` |
| Sarah | `photo-1529626455594-4ff0802cfb7e` |
| Lara | `photo-1531746020798-e6953c6e8e04` |
| Celine | `photo-1517841905240-472988babdf9` |
| Rima | `photo-1504703395950-b89145a5425b` |
| Dana | `photo-1488716820095-cbe80883c496` |
| Hana | `photo-1488426862026-3ee34a7d66df` |
| Maya | `photo-1524504388940-b1c1722653e1` |
| Nour | `photo-1534528741775-53994a69daeb` |
| Rana | `photo-1504703395950-b89145a5425b` |

Full URL format: `https://images.unsplash.com/<id>?w=800`

---

## Reset everything

```sql
TRUNCATE swipes, matches, messages, photos, profiles,
         otp_codes, auth_tokens, social_auth, notifications,
         reports, blocks, boosts, face_checks, users
RESTART IDENTITY CASCADE;
```

Then re-run `uv run python seed.py`.

---

## Database schema at a glance

```
users          — auth + flags (is_onboarded, is_email_verified, is_face_verified)
profiles       — all profile data (name, birthday, gender, bio, hobbies, etc.)
photos         — one or more photos per user (position=0 is main photo)
swipes         — who liked/disliked whom
matches        — mutual likes create a match row
messages       — chat messages inside a match
otp_codes      — OTP codes for email verify / password reset
auth_tokens    — refresh tokens (hashed)
```
