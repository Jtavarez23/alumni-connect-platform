-- Fix for activity_feed RLS - it's a view, not a table
-- Check if activity_feed is a view or table

SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'activity_feed';

-- If it's a view, we need to either:
-- 1. Skip RLS for views (they inherit permissions from underlying tables), OR
-- 2. Modify the RLS migration to handle views properly

-- For now, let's modify the RLS migration to skip activity_feed
-- Remove the activity_feed RLS section from the migration

-- The activity_feed view should have security defined through its underlying tables
-- and the view definition itself should handle security appropriately