"""
Seed test data for visual / functional testing of Amadoo.

Creates one verified, onboarded test account you can log into, plus a cast of
high-quality, realistic profiles so the deck, likes, matches and chat screens
render real content. Photos are curated, gender-accurate Unsplash portraits
(each URL verified to load).

Run from the backend dir with the venv active:
    python seed_test_data.py

Login for the main account:  alex@amadoo.io  /  test1234

Idempotent: wipes all rows in the test tables, then re-inserts. Safe because the
amadoo dev DB holds only test data.

Coverage: at least 5 profiles per intent (dating / activity / business).
"""
import asyncio
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config import settings
from auth_utils import hash_password
from models import User, Profile, Photo, Swipe, Match, Message

NOW = datetime(2026, 6, 4, 12, 0, 0, tzinfo=timezone.utc)

# Beirut, Lebanon base — each profile is offset slightly so the deck shows varied distances.
BASE_LAT, BASE_LON = 33.8938, 35.5018


def U(photo_id: str, w: int = 900) -> str:
    """High-quality, face-cropped Unsplash portrait (verified to load)."""
    return f"https://images.unsplash.com/photo-{photo_id}?w={w}&q=80&fit=crop&crop=faces"


# Curated, gender-accurate portrait IDs (all verified 200 / image).
M = [U(i) for i in (
    "1507003211169-0a1dd7228f2d",  # 0
    "1500648767791-00dcc994a43e",  # 1
    "1539571696357-5a69c17a67c6",  # 2
    "1506794778202-cad84cf45f1d",  # 3
    "1517841905240-472988babdf9",  # 4
    "1496440737103-cd596325d314",  # 5
    "1463453091185-61582044d556",  # 6
    "1472099645785-5658abf4ff4e",  # 7
    "1519085360753-af0119f7cbe7",  # 8
    "1535713875002-d1d0cf377fde",  # 9
    "1521119989659-a83eee488004",  # 10
    "1545167622-3a6ac756afa4",     # 11
)]
W = [U(i) for i in (
    "1494790108377-be9c29b29330",  # 0
    "1438761681033-6461ffad8d80",  # 1
    "1534528741775-53994a69daeb",  # 2
    "1531123897727-8f129e1688ce",  # 3
    "1524504388940-b1c1722653e1",  # 4
    "1488716820095-cbe80883c496",  # 5
    "1485875437342-9b39470b3d95",  # 6
    "1502823403499-6ccfcf4fb453",  # 7
    "1524250502761-1ac6f2e30d43",  # 8
    "1508002366005-75a695ee2d17",  # 9
    "1489424731084-a5d8b219a5bb",  # 10
    "1521146764736-56c929d59c83",  # 11
    "1573496359142-b8d87734a5a2",  # 12
    "1499952127939-9bbf5af6c51c",  # 13
    "1487412720507-e7ab37603c6f",  # 14
    "1529626455594-4ff0802cfb7e",  # 15
    "1558898479-33c0057a5d12",     # 16
    "1502685104226-ee32379fefbe",  # 17
)]


def birthday(age: int) -> date:
    return date(2026 - age, 5, 1)


engine = create_async_engine(settings.DATABASE_URL, echo=False)
Session = async_sessionmaker(engine, expire_on_commit=False)


async def make_user(s: AsyncSession, *, email, name, gender, age, intents,
                    want_to_meet, photos, bio="", school=None, job=None,
                    industry=None, looking_for=None, dating_goal=None,
                    hangout_vibes=None, hobbies=None, activities=None,
                    lat_off=0.0, lon_off=0.0, password=None, is_main=False):
    u = User(
        email=email,
        password_hash=hash_password(password) if password else None,
        is_email_verified=True,
        is_face_verified=True,
        is_onboarded=True,
        last_active=NOW - timedelta(minutes=5),
    )
    s.add(u)
    await s.flush()  # populate u.id

    p = Profile(
        user_id=u.id,
        name=name,
        birthday=birthday(age),
        gender=gender,
        bio=bio,
        school=school,
        job=job,
        industry=industry,
        looking_for=looking_for or [],
        dating_goal=dating_goal,
        hangout_vibes=hangout_vibes or [],
        hobbies=hobbies or [],
        activities=activities or [],
        intents=intents,
        want_to_meet=want_to_meet,
        age_range_min=18,
        age_range_max=100,
        latitude=BASE_LAT + lat_off,
        longitude=BASE_LON + lon_off,
        location_updated_at=NOW,
    )
    s.add(p)

    for i, url in enumerate(photos):
        s.add(Photo(user_id=u.id, url=url, position=i,
                    category=None if i == 0 else "activity"))
    return u


# Everyone is open to meeting Alex (male) so the deck stays populated for testing.
BOTH = ["male", "female"]


async def seed():
    async with Session() as s:
        # Wipe in FK-safe order
        for model in (Message, Match, Swipe, Photo, Profile, User):
            await s.execute(delete(model))
        await s.commit()

        # ── Main account (you log in as this) ───────────────────────────────
        me = await make_user(
            s, email="alex@amadoo.io", password="test1234", is_main=True,
            name="Alex", gender="male", age=28,
            intents=["dating", "activity", "business"], want_to_meet=BOTH,
            bio="Product designer who runs on espresso and weekend hikes.",
            school="NYU", job="Product Designer @ Figma", industry="Design",
            looking_for=["Co-founder", "Mentor"], dating_goal="Long-term",
            hangout_vibes=["Coffee", "Hiking", "Live music"],
            hobbies=["Photography", "Climbing"], activities=["Tennis", "Surfing"],
            photos=[M[0]],
        )

        # ── Deck users (no swipes with me → show in deck) ───────────────────
        deck = [
            # DATING
            dict(email="sofia@amadoo.io", name="Sofia", gender="female", age=26,
                 intents=["dating", "activity"],
                 bio="Architect who sketches buildings and chases sunsets.",
                 school="Columbia", job="Architect", dating_goal="Long-term",
                 hangout_vibes=["Museums", "Wine bars"], hobbies=["Painting"],
                 activities=["Yoga"], photos=[W[0]], lat_off=0.018, lon_off=0.004),
            dict(email="maya@amadoo.io", name="Maya", gender="female", age=24,
                 intents=["dating"],
                 bio="Med student, dog mom, terrible at chess but trying.",
                 school="Cornell", job="Medical Resident", dating_goal="Casual",
                 hobbies=["Cooking", "Chess"], photos=[W[2]], lat_off=-0.012, lon_off=0.006),
            dict(email="chloe@amadoo.io", name="Chloe", gender="female", age=25,
                 intents=["dating", "activity"],
                 bio="Photographer chasing golden hour. Will travel for tacos.",
                 job="Photographer", dating_goal="Long-term",
                 hobbies=["Photography", "Travel"], activities=["Surfing"],
                 photos=[W[5]], lat_off=0.026, lon_off=-0.01),
            dict(email="liam@amadoo.io", name="Liam", gender="male", age=29,
                 intents=["dating"],
                 bio="Jazz, ramen, and long bike rides. Looking for a partner in crime.",
                 school="Berklee", job="Music Teacher", dating_goal="Long-term",
                 hobbies=["Guitar", "Cooking"], photos=[M[1]], lat_off=0.02, lon_off=0.012),
            dict(email="theo@amadoo.io", name="Theo", gender="male", age=27,
                 intents=["dating", "activity"],
                 bio="Rock climber and amateur chef. I make a mean carbonara.",
                 job="Sous Chef", dating_goal="Casual", activities=["Climbing", "Running"],
                 hangout_vibes=["Brunch"], photos=[M[2]], lat_off=-0.022, lon_off=0.014),
            dict(email="hannah@amadoo.io", name="Hannah", gender="female", age=30,
                 intents=["dating", "business"],
                 bio="Growth lead who loves a clean roadmap and a good natural wine.",
                 job="Head of Growth", industry="SaaS", dating_goal="Long-term",
                 looking_for=["Partnerships"], photos=[W[12]], lat_off=0.028, lon_off=0.016),

            # ACTIVITY
            dict(email="jonas@amadoo.io", name="Jonas", gender="male", age=28,
                 intents=["activity"],
                 bio="Marathoner and weekend kayaker. Always down for a trail.",
                 job="Physiotherapist", activities=["Running", "Kayaking"],
                 hangout_vibes=["Running", "Coffee"], photos=[M[9]], lat_off=0.013, lon_off=-0.006),
            dict(email="aria@amadoo.io", name="Aria", gender="female", age=26,
                 intents=["activity", "dating"],
                 bio="Yoga teacher and ocean lover. Sunrise swims are my therapy.",
                 job="Yoga Instructor", dating_goal="Long-term",
                 activities=["Yoga", "Swimming"], hangout_vibes=["Beach"],
                 photos=[W[8]], lat_off=0.007, lon_off=0.003),
            dict(email="diego@amadoo.io", name="Diego", gender="male", age=30,
                 intents=["activity", "business"],
                 bio="Cyclist building a fitness app. Let's ride or brainstorm.",
                 job="Founder", industry="Fitness Tech", looking_for=["Co-founder"],
                 activities=["Cycling", "Running"], photos=[M[6]], lat_off=0.021, lon_off=-0.014),
            dict(email="nina@amadoo.io", name="Nina", gender="female", age=28,
                 intents=["activity"],
                 bio="Bouldering, bonfires, and bad puns. Tag along?",
                 job="UX Researcher", activities=["Climbing", "Hiking"],
                 hobbies=["Pottery"], photos=[W[11]], lat_off=-0.011, lon_off=-0.005),
            dict(email="lena@amadoo.io", name="Lena", gender="female", age=29,
                 intents=["activity", "business"],
                 bio="Trail runner and product manager. Ship fast, run far.",
                 job="Product Manager", industry="SaaS", looking_for=["Mentor"],
                 activities=["Running", "Skiing"], photos=[W[6]], lat_off=0.019, lon_off=0.019),

            # BUSINESS
            dict(email="marcus@amadoo.io", name="Marcus", gender="male", age=34,
                 intents=["business"],
                 bio="VC associate. Always up for a founder coffee.",
                 job="Investor @ Sequoia", industry="Venture Capital",
                 looking_for=["Founders", "Deal flow"], photos=[M[8]], lat_off=0.04, lon_off=0.02),
            dict(email="priya@amadoo.io", name="Priya", gender="female", age=31,
                 intents=["business", "activity"],
                 bio="Climate-tech founder. Coffee-fueled and deadline-driven.",
                 job="Founder @ Watt", industry="Climate Tech",
                 looking_for=["Co-founder", "Investor"], activities=["Running"],
                 photos=[W[10]], lat_off=0.034, lon_off=-0.016),
            dict(email="david@amadoo.io", name="David", gender="male", age=38,
                 intents=["business"],
                 bio="20 years in fintech. Angel investor and mentor — pitch me.",
                 job="Angel Investor", industry="Fintech", looking_for=["Founders"],
                 photos=[M[11]], lat_off=0.05, lon_off=0.03),
            dict(email="yuki@amadoo.io", name="Yuki", gender="female", age=27,
                 intents=["business"],
                 bio="Brand designer for startups. I make pitch decks pretty.",
                 job="Brand Designer", industry="Design",
                 looking_for=["Clients", "Collaborators"], hobbies=["Illustration"],
                 photos=[W[7]], lat_off=0.028, lon_off=-0.02),
            dict(email="sam@amadoo.io", name="Sam", gender="male", age=33,
                 intents=["business", "activity"],
                 bio="Engineer-turned-PM building dev tools. Climbing on weekends.",
                 job="Product Lead", industry="Dev Tools", looking_for=["Co-founder"],
                 activities=["Climbing"], photos=[M[3]], lat_off=0.025, lon_off=0.022),
        ]
        for d in deck:
            await make_user(s, want_to_meet=BOTH, **d)

        # ── Likes users (they liked me, I haven't swiped → show in Likes) ────
        emma = await make_user(s, email="emma@amadoo.io", name="Emma", gender="female",
                               age=27, intents=["dating"], want_to_meet=BOTH,
                               bio="Editor who collects books and houseplants.",
                               school="Brown", job="Editor", dating_goal="Long-term",
                               hobbies=["Reading", "Gardening"], photos=[W[1]],
                               lat_off=0.009, lon_off=0.008)
        noah = await make_user(s, email="noah@amadoo.io", name="Noah", gender="male",
                               age=31, intents=["business", "activity"], want_to_meet=BOTH,
                               bio="Building in climate tech. Climber on weekends.",
                               job="Founder @ Volt", industry="Climate Tech",
                               looking_for=["Co-founder"], activities=["Climbing"],
                               photos=[M[7]], lat_off=-0.015, lon_off=0.011)

        # ── Matched users (match + messages → show in Matches & Chat) ────────
        olivia = await make_user(s, email="olivia@amadoo.io", name="Olivia", gender="female",
                                 age=25, intents=["dating", "activity"], want_to_meet=BOTH,
                                 bio="Pastry chef. I will judge your coffee order (lovingly).",
                                 job="Pastry Chef", dating_goal="Long-term",
                                 hangout_vibes=["Brunch", "Markets"], photos=[W[9]],
                                 lat_off=0.006, lon_off=-0.004)
        ava = await make_user(s, email="ava@amadoo.io", name="Ava", gender="female",
                              age=28, intents=["dating"], want_to_meet=BOTH,
                              bio="Travel writer between flights. Ask me about Lisbon.",
                              job="Travel Writer", dating_goal="Long-term",
                              hobbies=["Travel", "Languages"], photos=[W[13]],
                              lat_off=0.014, lon_off=0.017)

        await s.flush()

        # Incoming likes
        s.add(Swipe(swiper_id=emma.id, swiped_id=me.id, action="like"))
        s.add(Swipe(swiper_id=noah.id, swiped_id=me.id, action="like"))

        # Mutual likes → matches
        for other in (olivia, ava):
            s.add(Swipe(swiper_id=me.id, swiped_id=other.id, action="like"))
            s.add(Swipe(swiper_id=other.id, swiped_id=me.id, action="like"))
            a, b = sorted([me.id, other.id])
            match = Match(user_a_id=a, user_b_id=b, created_at=NOW - timedelta(hours=6), is_active=True)
            s.add(match)
            await s.flush()

            if other is olivia:
                convo = [
                    (olivia.id, "Hey Alex! Loved your hiking photos 🏔️", 300, True),
                    (me.id, "Thanks! That one's from Bear Mountain. You hike?", 290, True),
                    (olivia.id, "Whenever I'm not glued to an oven 😄", 280, True),
                    (me.id, "Ha, fair. Coffee this weekend then?", 200, True),
                    (olivia.id, "I'd love that. Saturday morning?", 30, False),
                ]
            else:
                convo = [
                    (me.id, "Lisbon is on my list — best neighborhood to stay?", 120, True),
                    (ava.id, "Alfama, no question. I'll send you a list 📝", 60, False),
                ]

            for sender, text, mins_ago, read in convo:
                s.add(Message(
                    match_id=match.id, sender_id=sender, content=text, type="text",
                    sent_at=NOW - timedelta(minutes=mins_ago),
                    read_at=(NOW - timedelta(minutes=mins_ago - 1)) if read else None,
                ))

        await s.commit()

        # Report
        print("✅ Seed complete")
        print("   Login:  alex@amadoo.io  /  test1234")
        print(f"   Deck:   {len(deck)} profiles (dating / activity / business, 5+ each)")
        print("   Likes:  Emma, Noah (liked you)")
        print("   Matches: Olivia (5 msgs, 1 unread), Ava (2 msgs, 1 unread)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
