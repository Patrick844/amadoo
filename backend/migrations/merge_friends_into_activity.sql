-- Phase 1: the "friends" intent was merged into "activity".
-- Rewrite every profile's intents array, replacing 'friends' with 'activity' and
-- de-duplicating (a profile that had both ends up with a single 'activity').
UPDATE profiles
SET intents = (
    SELECT ARRAY(
        SELECT DISTINCT CASE WHEN i = 'friends' THEN 'activity' ELSE i END
        FROM unnest(intents) AS i
    )
)
WHERE 'friends' = ANY(intents);
