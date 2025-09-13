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

async function fixFeedSchema() {
  console.log('🔧 Fixing feed function schema issues...\n');
  
  try {
    // 1. Check posts table structure
    console.log('📋 Checking posts table structure...');
    const { error: postsError } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'posts' ORDER BY ordinal_position`
    });
    
    if (postsError) {
      console.log('❌ Posts table might not exist or has issues:', postsError.message);
    } else {
      console.log('✅ Posts table exists');
    }
    
    // 2. Check if posts table has author_id or user_id
    const { error: authorCheck } = await supabase.rpc('exec_sql', {
      sql: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'author_id'`
    });
    
    const { error: userCheck } = await supabase.rpc('exec_sql', {
      sql: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'user_id'`
    });
    
    console.log('🔍 Posts table columns check completed');
    
    // 3. Fix the function by recreating it with proper parameters
    console.log('\n🔄 Recreating feed functions with correct schema...');
    
    const fixFunctionsSQL = `
      -- Drop and recreate get_network_feed with proper parameter handling
      DROP FUNCTION IF EXISTS get_network_feed(uuid, text, integer);
      
      CREATE OR REPLACE FUNCTION get_network_feed(
        p_user_id UUID DEFAULT auth.uid(),
        p_cursor TIMESTAMPTZ DEFAULT NULL,
        p_limit INTEGER DEFAULT 20
      ) RETURNS JSON AS $$
      DECLARE
        v_result JSON;
        v_posts RECORD;
        v_feed_items JSON[] := '{}';
        v_next_cursor TEXT := NULL;
      BEGIN
        -- Validate user is authenticated
        IF p_user_id IS NULL THEN
          RETURN json_build_object('error', 'User not authenticated');
        END IF;

        -- Get posts from user's network
        FOR v_posts IN
          SELECT 
            p.id,
            p.user_id as author_id,
            p.content as text,
            p.media_urls,
            p.visibility,
            p.created_at,
            pr.first_name || ' ' || pr.last_name as author_name,
            pr.avatar_url as author_avatar,
            s.name as school_name,
            ue.graduation_year,
            pr.trust_level,
            COALESCE((SELECT COUNT(*) FROM post_likes WHERE post_id = p.id), 0) as likes,
            COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0) as comments,
            0 as shares -- Placeholder for shares
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
          AND (p.visibility IN ('public', 'alumni_only') OR 
               (p.visibility = 'connections_only' AND EXISTS (
                 SELECT 1 FROM connections c2 
                 WHERE ((c2.user_id = p_user_id AND c2.connection_id = p.user_id) OR
                        (c2.user_id = p.user_id AND c2.connection_id = p_user_id))
                   AND c2.status = 'accepted'
               )))
          AND (p_cursor IS NULL OR p.created_at < p_cursor)
          ORDER BY p.created_at DESC
          LIMIT p_limit + 1
        LOOP
          IF array_length(v_feed_items, 1) < p_limit THEN
            v_feed_items := v_feed_items || json_build_object(
              'id', v_posts.id,
              'author', json_build_object(
                'id', v_posts.author_id,
                'name', v_posts.author_name,
                'avatar_url', v_posts.author_avatar,
                'school', v_posts.school_name,
                'graduation_year', v_posts.graduation_year,
                'trust_level', v_posts.trust_level
              ),
              'content', json_build_object(
                'text', v_posts.text,
                'media', v_posts.media_urls
              ),
              'metrics', json_build_object(
                'likes', v_posts.likes,
                'comments', v_posts.comments,
                'shares', v_posts.shares
              ),
              'created_at', v_posts.created_at,
              'visibility', v_posts.visibility
            );
          ELSE
            v_next_cursor := v_posts.created_at::TEXT;
          END IF;
        END LOOP;

        RETURN json_build_object(
          'items', v_feed_items,
          'next_cursor', v_next_cursor
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      GRANT EXECUTE ON FUNCTION get_network_feed(uuid, timestamptz, integer) TO authenticated;
    `;
    
    const { error: fixError } = await supabase.rpc('exec_sql', { sql: fixFunctionsSQL });
    
    if (fixError) {
      console.log('❌ Error fixing feed functions:', fixError.message);
    } else {
      console.log('✅ Feed functions fixed successfully');
    }
    
  } catch (error) {
    console.error('❌ Error in fixFeedSchema:', error.message);
  }
}

fixFeedSchema();