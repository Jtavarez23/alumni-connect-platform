# 🚀 Reconnect Hive V2 Database Migration Guide

Since we can't run automated migrations, here's how to manually apply the V2 schema updates through Supabase Dashboard:

## Step 1: Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `dyhloaxsdcfgfyfhrdfc`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **"New query"**

## Step 2: Run Migration Scripts (In Order)

### Migration 1: Core V2 Schema
Copy and paste the contents of `supabase/migrations/20250903160000_multi_school_v2_architecture.sql` into the SQL editor and click **"Run"**.

This will create:
- ✅ `user_education` table for multi-school support
- ✅ Updated `profiles` table with subscription tiers
- ✅ `profile_views` for premium analytics
- ✅ `search_quotas` for daily limits
- ✅ `messaging_permissions` for network restrictions
- ✅ All other V2 tables and RLS policies

### Migration 2: Data Migration
Copy and paste the contents of `supabase/migrations/20250903161000_migrate_existing_data.sql` and click **"Run"**.

This will:
- ✅ Backup existing data
- ✅ Migrate current school relationships to `user_education`
- ✅ Set up subscription tiers
- ✅ Initialize search quotas
- ✅ Create messaging permissions for existing friendships

### Migration 3: RPC Functions  
Copy and paste the contents of `supabase/migrations/20250903162000_add_rpc_functions.sql` and click **"Run"**.

This adds:
- ✅ Search quota management functions
- ✅ Profile analytics functions
- ✅ Activity feed functions
- ✅ Messaging permission checks

## Step 3: Verify Migration Success

Run this verification query in SQL editor:

```sql
-- Check if all tables exist and have data
SELECT 
  schemaname,
  tablename,
  n_tup_ins as "rows_inserted",
  n_tup_upd as "rows_updated"
FROM pg_stat_user_tables 
WHERE tablename IN (
  'user_education',
  'profile_views', 
  'search_quotas',
  'messaging_permissions',
  'social_connections',
  'classmate_suggestions',
  'activity_feed',
  'group_chats'
)
ORDER BY tablename;
```

## Step 4: Test New Features

Run this query to check if the data migration worked:

```sql
-- Verify migration success
SELECT * FROM verify_migration_v2();
```

If all checks show `success = true`, run the cleanup:

```sql
-- Clean up after successful migration
SELECT cleanup_migration_v2();
```

## Step 5: Update RLS Policies (If Needed)

If you encounter permission issues, you may need to update RLS policies. The migrations should handle this automatically, but if needed, you can run:

```sql
-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

## Expected Results After Migration:

✅ **Free Tier Users:**
- Can add 1 school
- 3 searches per day  
- Message only network connections
- Year-limited networking

✅ **Premium Users:**
- Unlimited schools
- Unlimited searches
- Message anyone
- All-years networking
- Profile analytics

✅ **Data Integrity:**
- All existing users migrated
- School relationships preserved
- Friendships maintained
- No data loss

## Troubleshooting:

### "Permission denied" errors:
- Make sure you're logged in as the project owner
- Check that RLS policies are properly set

### "Table already exists" errors:
- This is normal for some tables - the migration will continue

### "Function does not exist" errors:
- Make sure Migration 3 (RPC functions) completed successfully

## Next Steps After Migration:

Once migration is complete, you can proceed with:
1. ✅ Testing the new subscription features
2. ✅ Integrating search quota widgets  
3. ✅ Adding messaging restrictions
4. ✅ Building premium features

---

💡 **Need Help?** Check the browser console for detailed error messages, or run the verification queries to see what might be missing.