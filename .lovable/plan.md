

## Plan: Real-time Used Credits Tracking

### Problem
1. **User Dashboard**: "You've used so far" count only loads once on page mount. After generating speech, the count doesn't update until page refresh.
2. **Admin Panel**: "Used Credits" column fetches once on load via `get_user_usage_stats` RPC. It's accurate but doesn't auto-refresh.

### Solution

#### 1. User Dashboard - Real-time Used Credits
**File: `src/components/layout/DashboardLayout.tsx`**
- Add a realtime subscription on `generation_tasks` table (filtered by `user_id`) alongside the existing `user_api_keys` subscription
- When any task is inserted/updated/deleted, re-fetch the used credits count
- This ensures the "You've used so far" number updates immediately after every generation

#### 2. Admin Panel - Auto-refresh Used Credits
**File: `src/pages/admin/AdminUsers.tsx`**
- Add a realtime subscription on `generation_tasks` table (all users, since admin sees all)
- When any task changes, re-fetch users list to get updated usage stats
- Debounce the refresh to avoid excessive re-fetching during batch operations

#### 3. Enable Realtime on generation_tasks
- Run a migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_tasks;`
- This is required for the Postgres Changes subscription to work

### Technical Details

**DashboardLayout changes:**
- Add second realtime channel for `generation_tasks` with `filter: user_id=eq.${user.id}`
- On any `postgres_changes` event, re-query `generation_tasks` to recalculate `userUsedCredits`

**AdminUsers changes:**
- Add realtime channel for `generation_tasks` (no filter - admin sees all)
- On change, call `fetchUsers()` with a debounce (e.g., 2 seconds) to avoid rapid re-fetches

**Migration:**
- Single SQL statement to enable realtime publication on `generation_tasks`

