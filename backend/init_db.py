"""Prepare the database for a hosted deploy (e.g. Render).

1. Creates all tables from the SQLAlchemy models (idempotent — only adds what's missing).
2. Seeds the demo data ONCE, only when the DB is empty, so redeploys never wipe real data.

Run before the server starts:  python init_db.py
"""
import asyncio

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from config import settings
from database import Base
import models  # noqa: F401 — importing registers every model on Base.metadata
from models import User


async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as s:
        count = (await s.execute(select(func.count()).select_from(User))).scalar() or 0
    await engine.dispose()

    if count == 0:
        print("[init_db] Empty database — seeding demo data…")
        from seed_test_data import seed
        await seed()
    else:
        print(f"[init_db] Database already has {count} users — skipping seed.")


if __name__ == "__main__":
    asyncio.run(main())
