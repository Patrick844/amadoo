"""
Seed the database with rich test data for local development.

Run from the backend/ directory:
    source .venv/bin/activate && python seed.py

Safe to re-run — truncates all data first so you always get a clean state.
"""

import asyncio
from datetime import date, datetime, timezone, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

import bcrypt as _bcrypt

from config import settings
from database import Base
from models import User, Profile, Photo, Swipe, Match, Message, gen_uuid


def _hash(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt(rounds=4)).decode()


engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSession = async_sessionmaker(engine, expire_on_commit=False)


# ── User definitions ──────────────────────────────────────────────────────────
#
# Interest values must match the INTEREST_CATEGORIES in the frontend
# (edit-profile.tsx) so the ProfileView emoji map renders the right icons.

USERS = [

    # ── Patrick (you) ─────────────────────────────────────────────────────────
    {
        "key": "patrick",
        "email": "patrick-saade@hotmail.com",
        "password": "Test123!",
        "name": "Patrick",
        "birthday": date(1999, 3, 20),
        "gender": "male",
        "school": "AUB",
        "job": "AI Engineer",
        "bio": "Building the future one model at a time 🤖 Big fan of hiking, good coffee, and late-night coding sessions.",
        "hobbies": ["Coding", "Hiking", "Coffee", "Photography", "Reading"],
        "activities": [],
        "trips": ["Mountains", "City breaks", "Europe"],
        "chill_vibes": ["Coffee dates", "Walks", "Picnics"],
        "has_pet": False,
        "height_cm": 182,
        "workout": "3-5x week",
        "drinking": "Socially",
        "smoking": "Non-smoker",
        "religion": "Christian",
        "vibe": "Ambitious",
        "want_to_meet": ["female"],
        "age_range_min": 20,
        "age_range_max": 32,
        "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
        "is_patrick": True,
    },

    # ── Women matched with Patrick ─────────────────────────────────────────────

    {
        "key": "sophia",
        "email": "sophia@amadoo.com",
        "password": "Test123!",
        "name": "Sophia",
        "birthday": date(2000, 7, 14),
        "gender": "female",
        "school": "LAU",
        "job": "UX Designer",
        "bio": "Designing beautiful things by day, hiking mountains by weekend 🏔️ Coffee is my love language.",
        "hobbies": ["Hiking", "Photography", "Coffee", "Design", "Yoga"],
        "activities": [],
        "trips": ["Mountains", "Europe", "City breaks"],
        "chill_vibes": ["Coffee dates", "Walks", "Picnics"],
        "has_pet": True,
        "height_cm": 165,
        "workout": "3-5x week",
        "drinking": "Socially",
        "smoking": "Non-smoker",
        "religion": "Christian",
        "vibe": "Creative",
        "want_to_meet": ["male"],
        "age_range_min": 22,
        "age_range_max": 34,
        "photo": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800",
        "photos_extra": [
            ("https://images.unsplash.com/photo-1517365830460-955ce3be0547?w=800", 1),
            ("https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800", 2),
        ],
        "face_verified": True,
        "pre_match_with_patrick": True,
        "patrick_messages": [
            ("sophia", "Hey Patrick! 👋 Your hiking photos are incredible"),
            ("patrick", "Thank you!! You hike too? 🏔️"),
            ("sophia", "Yes!! I go every weekend. We should go sometime ☕"),
            ("patrick", "I'm in! Any trails you recommend?"),
            ("sophia", "Lots 😄 Let's plan it over coffee first"),
        ],
    },

    {
        "key": "nour",
        "email": "nour@amadoo.com",
        "password": "Test123!",
        "name": "Nour",
        "birthday": date(2001, 2, 8),
        "gender": "female",
        "school": "AUB",
        "job": "Software Engineer",
        "bio": "Code by day, play guitar by night 🎸 Looking for someone who can keep up with my playlists.",
        "hobbies": ["Coding", "Guitar", "Concerts", "Reading", "Coffee"],
        "activities": [],
        "trips": ["Europe", "Asia", "City breaks"],
        "chill_vibes": ["Music", "Coffee dates", "Netflix"],
        "has_pet": False,
        "height_cm": 162,
        "workout": "1-2x week",
        "drinking": "Socially",
        "smoking": "Non-smoker",
        "religion": "Agnostic",
        "vibe": "Creative",
        "want_to_meet": ["male"],
        "age_range_min": 22,
        "age_range_max": 33,
        "photo": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800",
        "photos_extra": [
            ("https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800", 1),
        ],
        "face_verified": True,
        "pre_match_with_patrick": True,
        "patrick_messages": [
            ("nour", "Hey! Fellow coder 👀"),
            ("nour", "What stack do you work with?"),
        ],
    },

    {
        "key": "lara",
        "email": "lara@amadoo.com",
        "password": "Test123!",
        "name": "Lara",
        "birthday": date(2002, 5, 19),
        "gender": "female",
        "school": "USJ",
        "job": "Marketing Manager",
        "bio": "Marketing strategist who runs half-marathons on weekends 🏃 Big foodie energy. Always planning the next trip.",
        "hobbies": ["Running", "Foodie", "Brunch", "Podcasts", "Fashion"],
        "activities": [],
        "trips": ["Americas", "Europe", "Beach", "City breaks"],
        "chill_vibes": ["Coffee dates", "Walks", "Picnics"],
        "has_pet": False,
        "height_cm": 168,
        "workout": "3-5x week",
        "drinking": "Socially",
        "smoking": "Non-smoker",
        "religion": "Christian",
        "vibe": "Adventurous",
        "want_to_meet": ["male"],
        "age_range_min": 23,
        "age_range_max": 35,
        "photo": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
        "face_verified": True,
        "pre_match_with_patrick": True,
        "patrick_messages": [],  # ← Say hi! state
    },

    # ── Women in Patrick's deck (will appear to swipe on) ─────────────────────

    {
        "key": "maya",
        "email": "maya@amadoo.com",
        "password": "Test123!",
        "name": "Maya",
        "birthday": date(2000, 9, 3),
        "gender": "female",
        "school": "AUB",
        "job": "Journalist",
        "bio": "Words are my thing. Travelling the world, one story at a time ✍️ Ask me about my next destination.",
        "hobbies": ["Writing", "Travel", "Photography", "Podcasts", "Languages"],
        "activities": [],
        "trips": ["Africa", "Asia", "Europe", "Backpacking"],
        "chill_vibes": ["Coffee dates", "Music", "Picnics"],
        "has_pet": False,
        "height_cm": 164,
        "workout": "1-2x week",
        "drinking": "Socially",
        "smoking": "Non-smoker",
        "religion": "Agnostic",
        "vibe": "Adventurous",
        "want_to_meet": ["male"],
        "age_range_min": 22,
        "age_range_max": 34,
        "photo": "https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=800",
        "photos_extra": [
            ("https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800", 1),
        ],
        "in_patrick_deck": True,
        "already_liked_patrick": True,  # ← swipe right → instant match
    },

    {
        "key": "rima",
        "email": "rima@amadoo.com",
        "password": "Test123!",
        "name": "Rima",
        "birthday": date(2001, 12, 25),
        "gender": "female",
        "school": "NDU",
        "job": "Architect",
        "bio": "Designing spaces by day, painting by night 🏛️🎨 Huge fan of good architecture and terrible puns.",
        "hobbies": ["Painting", "Drawing", "Pottery", "Yoga", "Coffee"],
        "activities": [],
        "trips": ["Europe", "Middle East", "City breaks"],
        "chill_vibes": ["Coffee dates", "Walks", "Cooking together"],
        "has_pet": True,
        "height_cm": 170,
        "workout": "1-2x week",
        "drinking": "Never",
        "smoking": "Non-smoker",
        "religion": "Christian",
        "vibe": "Creative",
        "want_to_meet": ["male"],
        "age_range_min": 22,
        "age_range_max": 33,
        "photo": "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800",
        "face_verified": True,
        "in_patrick_deck": True,
    },

    {
        "key": "celine",
        "email": "celine@amadoo.com",
        "password": "Test123!",
        "name": "Celine",
        "birthday": date(2003, 4, 7),
        "gender": "female",
        "school": "AUB",
        "job": "Student",
        "bio": "Med student surviving on coffee and sarcasm ☕ Gym rat on weekends, bookworm on weeknights.",
        "hobbies": ["Gym", "Reading", "Coffee", "Cooking", "Hiking"],
        "activities": [],
        "trips": ["Beach", "Mountains", "Europe"],
        "chill_vibes": ["Netflix", "Coffee dates", "Board games"],
        "has_pet": False,
        "height_cm": 160,
        "workout": "Every day",
        "drinking": "Never",
        "smoking": "Non-smoker",
        "religion": "Christian",
        "vibe": "Ambitious",
        "want_to_meet": ["male"],
        "age_range_min": 20,
        "age_range_max": 30,
        "photo": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
        "in_patrick_deck": True,
    },

    {
        "key": "dana",
        "email": "dana@amadoo.com",
        "password": "Test123!",
        "name": "Dana",
        "birthday": date(1999, 8, 11),
        "gender": "female",
        "school": "LAU",
        "job": "Photographer",
        "bio": "Chasing light and good moments 📸 Obsessed with street food and early morning shoots.",
        "hobbies": ["Photography", "Street food", "Cycling", "Concerts", "Baking"],
        "activities": [],
        "trips": ["Asia", "Americas", "Backpacking"],
        "chill_vibes": ["Music", "Coffee dates", "Walks"],
        "has_pet": False,
        "height_cm": 167,
        "workout": "3-5x week",
        "drinking": "Socially",
        "smoking": "Occasional",
        "religion": "Agnostic",
        "vibe": "Adventurous",
        "want_to_meet": ["male"],
        "age_range_min": 23,
        "age_range_max": 35,
        "photo": "https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=800",
        "photos_extra": [
            ("https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800", 1),
            ("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800", 2),
        ],
        "in_patrick_deck": True,
    },

    {
        "key": "jade",
        "email": "jade@amadoo.com",
        "password": "Test123!",
        "name": "Jade",
        "birthday": date(2002, 1, 16),
        "gender": "female",
        "school": "ESA",
        "job": "Fashion Stylist",
        "bio": "If it's not beautiful, I'm not interested 💅 Fashion, art, and long brunches are my religion.",
        "hobbies": ["Fashion", "Painting", "Brunch", "Wine", "Concerts"],
        "activities": [],
        "trips": ["Europe", "Luxury", "City breaks"],
        "chill_vibes": ["Cooking together", "Coffee dates", "Music"],
        "has_pet": True,
        "height_cm": 171,
        "workout": "1-2x week",
        "drinking": "Regularly",
        "smoking": "Non-smoker",
        "religion": "Agnostic",
        "vibe": "Creative",
        "want_to_meet": ["male"],
        "age_range_min": 22,
        "age_range_max": 34,
        "photo": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800",
        "face_verified": True,
        "in_patrick_deck": True,
    },

    {
        "key": "rana",
        "email": "rana@amadoo.com",
        "password": "Test123!",
        "name": "Rana",
        "birthday": date(2000, 6, 30),
        "gender": "female",
        "school": "AUB",
        "job": "Marine Biologist",
        "bio": "Ocean nerd 🐠 Scuba diver, vegetarian, and absolute sucker for stargazing.",
        "hobbies": ["Scuba diving", "Nature", "Stargazing", "Gardening", "Yoga"],
        "activities": [],
        "trips": ["Beach", "Asia", "Backpacking", "Americas"],
        "chill_vibes": ["Picnics", "Walks", "Netflix"],
        "has_pet": True,
        "height_cm": 163,
        "workout": "3-5x week",
        "drinking": "Never",
        "smoking": "Non-smoker",
        "religion": "Spiritual",
        "vibe": "Outdoorsy",
        "want_to_meet": ["male"],
        "age_range_min": 22,
        "age_range_max": 33,
        "photo": "https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=800",
        "in_patrick_deck": True,
    },

    # ── Generic test account ───────────────────────────────────────────────────
    {
        "key": "alex",
        "email": "test@amadoo.com",
        "password": "Test123!",
        "name": "Alex",
        "birthday": date(1998, 5, 15),
        "gender": "male",
        "school": "AUB",
        "job": "Product Manager",
        "bio": "Building products that matter. Hiker, reader, bad cook. 🏔️📚",
        "hobbies": ["Hiking", "Reading", "Coding", "Photography", "Coffee"],
        "activities": [],
        "trips": ["Mountains", "Europe", "City breaks"],
        "chill_vibes": ["Coffee dates", "Walks", "Board games"],
        "has_pet": False,
        "height_cm": 180,
        "workout": "3-5x week",
        "drinking": "Socially",
        "smoking": "Non-smoker",
        "religion": "Agnostic",
        "vibe": "Ambitious",
        "want_to_meet": ["female"],
        "age_range_min": 20,
        "age_range_max": 32,
        "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
    },
]


# ── Seed ──────────────────────────────────────────────────────────────────────

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession() as db:
        created_ids: dict[str, str] = {}

        # ── Pass 1: users, profiles, photos ───────────────────────────────────
        for data in USERS:
            uid = gen_uuid()
            created_ids[data["key"]] = uid

            db.add(User(
                id=uid,
                email=data["email"],
                password_hash=_hash(data["password"]),
                is_email_verified=True,
                is_onboarded=True,
                is_face_verified=data.get("face_verified", False),
            ))

            db.add(Profile(
                user_id=uid,
                name=data["name"],
                birthday=data["birthday"],
                gender=data["gender"],
                bio=data.get("bio"),
                school=data.get("school"),
                job=data.get("job"),
                height_cm=data.get("height_cm"),
                workout=data.get("workout"),
                drinking=data.get("drinking"),
                smoking=data.get("smoking"),
                religion=data.get("religion"),
                vibe=data.get("vibe"),
                hobbies=data.get("hobbies", []),
                activities=data.get("activities", []),
                trips=data.get("trips", []),
                chill_vibes=data.get("chill_vibes", []),
                has_pet=data.get("has_pet", False),
                want_to_meet=data.get("want_to_meet", ["male", "female"]),
                age_range_min=data.get("age_range_min", 18),
                age_range_max=data.get("age_range_max", 60),
            ))

            db.add(Photo(user_id=uid, url=data["photo"], position=0))
            for url, pos in data.get("photos_extra", []):
                db.add(Photo(user_id=uid, url=url, position=pos))

            print(f"  ✓ {data['name']} ({data['email']})")

        await db.flush()

        patrick_id = created_ids["patrick"]
        now = datetime.now(timezone.utc)

        # ── Pass 2: swipes, matches, messages ─────────────────────────────────
        for data in USERS:
            uid = created_ids[data["key"]]
            if uid == patrick_id:
                continue

            # Pre-liked Patrick → swipe right = instant match popup
            if data.get("already_liked_patrick"):
                db.add(Swipe(swiper_id=uid, swiped_id=patrick_id, action="like"))
                print(f"  ✓ {data['name']} pre-liked Patrick (match on swipe)")

            # Pre-matched with Patrick (mutual likes + match row + messages)
            if data.get("pre_match_with_patrick"):
                db.add(Swipe(swiper_id=patrick_id, swiped_id=uid, action="like"))
                db.add(Swipe(swiper_id=uid, swiped_id=patrick_id, action="like"))

                user_a, user_b = sorted([patrick_id, uid])
                match_id = gen_uuid()
                db.add(Match(id=match_id, user_a_id=user_a, user_b_id=user_b, is_active=True))

                messages = data.get("patrick_messages", [])
                for i, (sender_key, content) in enumerate(messages):
                    sender_id = patrick_id if sender_key == "patrick" else uid
                    msg_time = now - timedelta(minutes=len(messages) - i)
                    is_unread = i == len(messages) - 1 and sender_id != patrick_id
                    db.add(Message(
                        match_id=match_id,
                        sender_id=sender_id,
                        content=content,
                        type="text",
                        sent_at=msg_time,
                        read_at=None if is_unread else now - timedelta(seconds=30),
                    ))

                print(f"  ✓ Matched Patrick ↔ {data['name']} ({len(messages)} messages)")

        await db.commit()

    print("\n✅ Seed complete!")
    print("\nLogin:")
    print("  patrick-saade@hotmail.com / Test123!")
    print("  test@amadoo.com         / Test123!")
    print("\nOTP bypass: enter 000000 on the verify-email screen (dev only)")
    print("\nPatrick's state:")
    print("  Deck   → Maya (pre-liked you!), Rima, Celine, Dana, Jade, Rana")
    print("  Matches → Sophia (full chat), Nour (2 unread), Lara (say hi!)")


if __name__ == "__main__":
    asyncio.run(seed())
