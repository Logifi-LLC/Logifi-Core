# Logifi: Total Hours and User Merge SQL

## Table and column for total hours

- **Table:** `log_entries`
- **User column:** `user_id` (UUID, references `auth.users(id)`)
- **Total hours:** Not a single column. Total hours are the **sum per row** of the numeric value inside the JSONB column **`flight_time`** under the key **`total`**:
  - In app: `entry.flightTime.total`
  - In DB: `flight_time->>'total'` (text) or `(flight_time->>'total')::numeric`

So “total hours” = sum over all rows (for a given user) of `COALESCE((flight_time->>'total')::numeric, 0)`.

---

## 1. Find all unique `user_id` and their hour totals

Run this in the **Supabase SQL Editor** (Dashboard → SQL Editor). It lists each `user_id` with its total flight count and total hours.

```sql
SELECT
  user_id,
  COUNT(*) AS entry_count,
  ROUND(SUM(COALESCE((flight_time->>'total')::numeric, 0))::numeric, 1) AS total_hours
FROM log_entries
GROUP BY user_id
ORDER BY total_hours DESC;
```

To also see the auth email for each user (helps identify which ID is “live” vs old):

```sql
SELECT
  le.user_id,
  au.email,
  COUNT(*) AS entry_count,
  ROUND(SUM(COALESCE((le.flight_time->>'total')::numeric, 0))::numeric, 1) AS total_hours
FROM log_entries le
LEFT JOIN auth.users au ON au.id = le.user_id
GROUP BY le.user_id, au.email
ORDER BY total_hours DESC;
```

---

## 2. Merge flights to your current live user (UPDATE script)

After you know the **old/different user IDs** you want to reassign and your **current live user ID**:

1. Replace `'YOUR_LIVE_USER_ID'` with your actual live auth user UUID (the one you’re logged in as on logifi.io).
2. Replace `'OLD_USER_ID_1'`, `'OLD_USER_ID_2'`, … with the UUIDs you want to merge from (from the query above).

Run in Supabase SQL Editor (run with care; consider a transaction and `SELECT` first to verify row counts).

```sql
-- Optional: run as a transaction so you can ROLLBACK if needed
-- BEGIN;

-- Preview: how many rows will be updated per source user
SELECT user_id, COUNT(*) AS rows_to_update
FROM log_entries
WHERE user_id IN (
  'OLD_USER_ID_1',
  'OLD_USER_ID_2'
)
GROUP BY user_id;

-- Perform the merge: reassign all those entries to your live user
UPDATE log_entries
SET user_id = 'YOUR_LIVE_USER_ID'
WHERE user_id IN (
  'OLD_USER_ID_1',
  'OLD_USER_ID_2'
);

-- Optional: commit if you used BEGIN;
-- COMMIT;
```

After the merge, RLS will show those rows to your live user, and total hours on the live site should match the sum of all merged rows.

---

## 3. Profile name and `user_profiles`

Profile name is stored in **`user_profiles.full_name`**. The app was only reading/writing the pilot profile from **localStorage**, not from `user_profiles`, so profile name changes did not sync. Code has been updated so that when you’re authenticated the app also loads and saves the pilot profile to `user_profiles` (see dashboard pilot profile load/save and sync to Supabase).
