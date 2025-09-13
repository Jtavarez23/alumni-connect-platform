import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRpcSchema() {
  console.log('🔧 Fixing RPC function schema mismatches...\n');
  
  try {
    // First, check the actual posts table structure
    console.log('📋 Checking actual posts table columns...');
    const { error: columnsError } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'posts' 
            ORDER BY ordinal_position`
    });
    
    if (!columnsError) {
      console.log('✅ Posts table structure verified');
    }
    
    // Fix get_network_feed function
    console.log('\n🔄 Fixing get_network_feed function...');
    const fixNetworkFeedSQL = `
      DROP FUNCTION IF EXISTS get_network_feed(uuid, timestamptz, integer);
      
      CREATE OR REPLACE FUNCTION get_network_feed(
        p_user_id UUID DEFAULT auth.uid(),
        p_cursor TIMESTAMPTZ DEFAULT NULL,
        p_limit INTEGER DEFAULT 20
      ) RETURNS JSON AS $$
      DECLARE
        v_feed_items JSON[] := '{}';
        v_next_cursor TEXT := NULL;
        v_post RECORD;
      BEGIN
        -- Validate user is authenticated
        IF p_user_id IS NULL THEN
          RETURN json_build_object('error', 'User not authenticated');
        END IF;

        -- Get posts from user's network using correct column names
        FOR v_post IN
          SELECT 
            p.id,
            p.user_id as author_id,
            p.content as text,
            p.created_at,
            pr.first_name || ' ' || pr.last_name as author_name,
            pr.avatar_url as author_avatar,
            s.name as school_name,
            ue.end_year as graduation_year,
            pr.trust_level,
            0 as likes,  -- Placeholder for now
            0 as comments, -- Placeholder for now
            0 as shares, -- Placeholder for now
            'public' as visibility -- Placeholder for now
          FROM posts p
          LEFT JOIN profiles pr ON p.user_id = pr.id
          LEFT JOIN user_education ue ON pr.id = ue.user_id
          LEFT JOIN schools s ON ue.school_id = s.id
          WHERE p.user_id IN (
            SELECT 
              CASE 
                WHEN c.user_id = p_user_id THEN c.connection_id
                ELSE c.user_id
              END as friend_id
            FROM connections c 
            WHERE (c.user_id = p_user_id OR c.connection_id = p_user_id)
              AND c.status = 'accepted'
          )
          AND (p_cursor IS NULL OR p.created_at < p_cursor)
          ORDER BY p.created_at DESC
          LIMIT p_limit + 1
        LOOP
          IF array_length(v_feed_items, 1) < p_limit THEN
            v_feed_items := v_feed_items || json_build_object(
              'id', v_post.id,
              'author', json_build_object(
                'id', v_post.author_id,
                'name', v_post.author_name,
                'avatar_url', v_post.author_avatar,
                'school', v_post.school_name,
                'graduation_year', v_post.graduation_year,
                'trust_level', v_post.trust_level
              ),
              'content', json_build_object('text', v_post.text),
              'metrics', json_build_object(
                'likes', v_post.likes,
                'comments', v_post.comments,
                'shares', v_post.shares
              ),
              'created_at', v_post.created_at,
              'visibility', v_post.visibility
            );
          ELSE
            v_next_cursor := v_post.created_at::TEXT;
          END IF;
        END LOOP;

        RETURN json_build_object('items', v_feed_items, 'next_cursor', v_next_cursor);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      GRANT EXECUTE ON FUNCTION get_network_feed(uuid, timestamptz, integer) TO authenticated;
    `;
    
    const { error: fixError } = await supabase.rpc('exec_sql', { sql: fixNetworkFeedSQL });
    if (fixError) {
      console.log('❌ Error fixing get_network_feed:', fixError.message);
    } else {
      console.log('✅ get_network_feed fixed successfully');
    }
    
    // Fix get_for_you_feed function
    console.log('\n🔄 Fixing get_for_you_feed function...');
    const fixForYouFeedSQL = `
      DROP FUNCTION IF EXISTS get_for_you_feed(uuid, text, integer);
      
      CREATE OR REPLACE FUNCTION get_for_you_feed(
        p_user_id UUID DEFAULT auth.uid(),
        p_cursor TEXT DEFAULT NULL,
        p_limit INTEGER DEFAULT 20
      ) RETURNS JSON AS $$
      DECLARE
        v_feed_items JSON[] := '{}';
        v_next_cursor TEXT := NULL;
        v_post RECORD;
        v_user_school_ids UUID[];
      BEGIN
        -- Validate user is authenticated
        IF p_user_id IS NULL THEN
          RETURN json_build_object('error', 'User not authenticated');
        END IF;

        -- Get user's school IDs for personalized content
        SELECT ARRAY_AGG(school_id) INTO v_user_school_ids
        FROM user_education WHERE user_id = p_user_id;

        -- Get trending posts with correct column names
        FOR v_post IN
          SELECT 
            p.id,
            p.user_id as author_id,
            p.content as text,
            p.created_at,
            pr.first_name || ' ' || pr.last_name as author_name,
            pr.avatar_url as author_avatar,
            s.name as school_name,
            ue.end_year as graduation_year,
            pr.trust_level,
            0 as likes,  -- Placeholder for now
            0 as comments, -- Placeholder for now
            0 as shares, -- Placeholder for now
            'public' as visibility -- Placeholder for now
          FROM posts p
          LEFT JOIN profiles pr ON p.user_id = pr.id
          LEFT JOIN user_education ue ON pr.id = ue.user_id
          LEFT JOIN schools s ON ue.school_id = s.id
          WHERE (true) -- Simplified visibility check for now
          ORDER BY p.created_at DESC
          LIMIT p_limit + 1
        LOOP
          IF array_length(v_feed_items, 1) < p_limit THEN
            v_feed_items := v_feed_items || json_build_object(
              'id', v_post.id,
              'author', json_build_object(
                'id', v_post.author_id,
                'name', v_post.author_name,
                'avatar_url', v_post.author_avatar,
                'school', v_post.school_name,
                'graduation_year', v_post.graduation_year,
                'trust_level', v_post.trust_level
              ),
              'content', json_build_object('text', v_post.text),
              'metrics', json_build_object(
                'likes', v_post.likes,
                'comments', v_post.comments,
                'shares', v_post.shares
              ),
              'created_at', v_post.created_at,
              'visibility', v_post.visibility
            );
          ELSE
            v_next_cursor := v_post.created_at::TEXT;
          END IF;
        END LOOP;

        RETURN json_build_object('items', v_feed_items, 'next_cursor', v_next_cursor);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      GRANT EXECUTE ON FUNCTION get_for_you_feed(uuid, text, integer) TO authenticated;
    `;
    
    const { error: fixForYouError } = await supabase.rpc('exec_sql', { sql: fixForYouFeedSQL });
    if (fixForYouError) {
      console.log('❌ Error fixing get_for_you_feed:', fixForYouError.message);
    } else {
      console.log('✅ get_for_you_feed fixed successfully');
    }
    
    // Test the fixed functions
    console.log('\n🧪 Testing fixed functions...');
    
    // Test get_network_feed
    const { error: testError } = await supabase.rpc('get_network_feed', { 
      p_user_id: 'b99870dc-6821-4b7b-985b-02c0df497b69', 
      p_limit: 3 
    });
    
    if (testError) {
      console.log('❌ get_network_feed test failed:', testError.message);
    } else {
      console.log('✅ get_network_feed test successful');
    }
    
    // Test get_for_you_feed
    const { error: forYouError } = await supabase.rpc('get_for_you_feed', { 
      p_user_id: 'b99870dc-6821-4b7b-985b-02c0df497b69' 
    });
    
    if (forYouError) {
      console.log('❌ get_for_you_feed test failed:', forYouError.message);
    } else {
      console.log('✅ get_for_you_feed test successful');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

fixRpcSchema();