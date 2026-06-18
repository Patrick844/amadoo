-- Drop the DB-level match-creation trigger.
--
-- Why: a trigger (trg_create_match → create_match_if_mutual) was auto-inserting the
-- `matches` row on every mutual like. The application's swipe handler
-- (routers/swipes.py) ALSO creates the match — and additionally queues the
-- new_match notification and fires the push. Because the trigger ran first (on the
-- swipe INSERT/flush), the app's `existing_match` check always found a match and took
-- the "already exists — skipping" path, so it:
--   1. returned {matched: false, match_id: null}  → no "It's a match!" overlay
--   2. never queued the new_match Notification rows
--   3. never sent the push to the matched user
--
-- Match creation is owned by the application (it does the full job). Remove the
-- conflicting trigger so the handler works as intended.

DROP TRIGGER IF EXISTS trg_create_match ON swipes;
DROP FUNCTION IF EXISTS create_match_if_mutual();
