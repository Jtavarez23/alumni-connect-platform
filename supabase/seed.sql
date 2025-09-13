-- ===========================================
-- Alumni Connect - Comprehensive Development Seed Data
-- ===========================================

-- Disable RLS temporarily for seeding
SET session_replication_role = replica;

-- Clear existing data (careful ordering to respect foreign keys)
TRUNCATE TABLE public.messaging_permissions CASCADE;
TRUNCATE TABLE public.friendships CASCADE;
TRUNCATE TABLE public.search_quotas CASCADE;
TRUNCATE TABLE public.user_education CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
TRUNCATE TABLE public.class_years CASCADE;
TRUNCATE TABLE public.schools CASCADE;

-- Insert comprehensive test schools
INSERT INTO public.schools (id, name, slug, type, location, domain, verified, founded_year, mascot, colors) VALUES
('00000000-0000-0000-0000-000000000001', 'Springfield High School', 'springfield-high-school', 'high_school', 
 '{"city": "Springfield", "state": "Illinois", "country": "USA"}', NULL, true, 1920, 'Tigers', '["orange", "black"]'),
('00000000-0000-0000-0000-000000000002', 'Riverside Academy', 'riverside-academy', 'high_school',
 '{"city": "Riverside", "state": "California", "country": "USA"}', NULL, true, 1955, 'Eagles', '["blue", "gold"]'),
('00000000-0000-0000-0000-000000000003', 'Stanford University', 'stanford-university', 'university',
 '{"city": "Stanford", "state": "California", "country": "USA"}', 'stanford.edu', true, 1885, 'Cardinal', '["cardinal", "white"]'),
('00000000-0000-0000-0000-000000000004', 'Harvard University', 'harvard-university', 'university',
 '{"city": "Cambridge", "state": "Massachusetts", "country": "USA"}', 'harvard.edu', true, 1636, 'Crimson', '["crimson", "white"]'),
('00000000-0000-0000-0000-000000000005', 'Lincoln Middle School', 'lincoln-middle-school', 'middle_school',
 '{"city": "Springfield", "state": "Illinois", "country": "USA"}', NULL, true, 1960, 'Lions', '["green", "white"]');

-- Add class years for each school (2000-2030)
DO $$
DECLARE
    school_record RECORD;
    year_val INTEGER;
BEGIN
    FOR school_record IN SELECT id FROM public.schools LOOP
        FOR year_val IN 2000..2030 LOOP
            INSERT INTO public.class_years (school_id, year) 
            VALUES (school_record.id, year_val)
            ON CONFLICT (school_id, year) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- Insert comprehensive test profiles with different subscription tiers
INSERT INTO public.profiles (id, email, first_name, last_name, school_id, graduation_year, is_public, subscription_tier, bio, avatar_url) VALUES
('00000000-0000-0000-0000-000000000001', 'sarah.johnson@example.com', 'Sarah', 'Johnson', 
 (SELECT id FROM schools WHERE slug = 'springfield-high-school'), 2020, true, 'free', 
 'Class president, photography enthusiast, future journalist', 'https://example.com/avatars/sarah.jpg'),

('00000000-0000-0000-0000-000000000002', 'mike.chen@example.com', 'Mike', 'Chen', 
 (SELECT id FROM schools WHERE slug = 'riverside-academy'), 2019, true, 'premium',
 'Basketball captain, software engineer at Google, loves hiking', 'https://example.com/avatars/mike.jpg'),

('00000000-0000-0000-0000-000000000003', 'emma.davis@example.com', 'Emma', 'Davis', 
 (SELECT id FROM schools WHERE slug = 'stanford-university'), 2018, true, 'free',
 'Drama club president, theater major, aspiring actress', 'https://example.com/avatars/emma.jpg'),

('00000000-0000-0000-0000-000000000004', 'alex.rodriguez@example.com', 'Alex', 'Rodriguez', 
 (SELECT id FROM schools WHERE slug = 'harvard-university'), 2021, true, 'enterprise',
 'School administrator, education technology advocate, PhD in Education', 'https://example.com/avatars/alex.jpg'),

('00000000-0000-0000-0000-000000000005', 'jessica.wong@example.com', 'Jessica', 'Wong', 
 (SELECT id FROM schools WHERE slug = 'lincoln-middle-school'), 2017, true, 'premium',
 'Math team captain, data scientist, loves puzzles and AI', 'https://example.com/avatars/jessica.jpg'),

('00000000-0000-0000-0000-000000000006', 'david.kim@example.com', 'David', 'Kim', 
 (SELECT id FROM schools WHERE slug = 'springfield-high-school'), 2020, true, 'free',
 'Robotics club, mechanical engineer, car enthusiast', 'https://example.com/avatars/david.jpg'),

('00000000-0000-0000-0000-000000000007', 'lisa.garcia@example.com', 'Lisa', 'Garcia', 
 (SELECT id FROM schools WHERE slug = 'riverside-academy'), 2019, true, 'free',
 'Cheerleading captain, nursing student, volunteer at children''s hospital', 'https://example.com/avatars/lisa.jpg'),

('00000000-0000-0000-0000-000000000008', 'kevin.patel@example.com', 'Kevin', 'Patel', 
 (SELECT id FROM schools WHERE slug = 'stanford-university'), 2018, true, 'premium',
 'Computer science major, startup founder, angel investor', 'https://example.com/avatars/kevin.jpg'),

('00000000-0000-0000-0000-000000000009', 'amy.campbell@example.com', 'Amy', 'Campbell', 
 (SELECT id FROM schools WHERE slug = 'harvard-university'), 2021, true, 'enterprise',
 'Law school student, human rights activist, published author', 'https://example.com/avatars/amy.jpg'),

('00000000-0000-0000-0000-000000000010', 'ryan.miller@example.com', 'Ryan', 'Miller', 
 (SELECT id FROM schools WHERE slug = 'lincoln-middle-school'), 2017, true, 'free',
 'Science fair winner, medical student, aspiring surgeon', 'https://example.com/avatars/ryan.jpg');

-- Insert user education records (multiple schools for some users)
INSERT INTO public.user_education (user_id, school_id, start_year, end_year, is_primary, role_type) VALUES
-- Sarah Johnson: Springfield High (primary)
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 2016, 2020, true, 'student'),

-- Mike Chen: Riverside Academy (primary) + Stanford University
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 2015, 2019, true, 'student'),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 2019, 2023, false, 'student'),

-- Emma Davis: Lincoln Middle + Stanford University (primary)
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 2014, 2017, false, 'student'),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 2017, 2021, true, 'student'),

-- Alex Rodriguez: Harvard University (primary)
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 2017, 2021, true, 'student'),

-- Jessica Wong: Lincoln Middle (primary) + Harvard University
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 2013, 2017, true, 'student'),
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 2017, 2021, false, 'student'),

-- David Kim: Springfield High (primary)
('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 2016, 2020, true, 'student'),

-- Lisa Garcia: Riverside Academy (primary)
('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 2015, 2019, true, 'student'),

-- Kevin Patel: Stanford University (primary)
('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000003', 2014, 2018, true, 'student'),

-- Amy Campbell: Harvard University (primary)
('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000004', 2017, 2021, true, 'student'),

-- Ryan Miller: Lincoln Middle (primary) + Stanford University
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000005', 2013, 2017, true, 'student'),
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000003', 2017, 2021, false, 'student');

-- Initialize search quotas for all users
INSERT INTO public.search_quotas (user_id, date, searches_used, search_limit, earned_searches) VALUES
-- Free tier users (3 searches per day)
('00000000-0000-0000-0000-000000000001', CURRENT_DATE, 1, 3, 0),
('00000000-0000-0000-0000-000000000003', CURRENT_DATE, 0, 3, 0),
('00000000-0000-0000-0000-000000000006', CURRENT_DATE, 2, 3, 0),
('00000000-0000-0000-0000-000000000007', CURRENT_DATE, 3, 3, 0),
('00000000-0000-0000-0000-000000000010', CURRENT_DATE, 1, 3, 0),

-- Premium tier users (unlimited searches)
('00000000-0000-0000-0000-000000000002', CURRENT_DATE, 15, 999999, 0),
('00000000-0000-0000-0000-000000000005', CURRENT_DATE, 8, 999999, 0),
('00000000-0000-0000-0000-000000000008', CURRENT_DATE, 22, 999999, 0),

-- Enterprise tier users (unlimited searches + admin features)
('00000000-0000-0000-0000-000000000004', CURRENT_DATE, 5, 999999, 0),
('00000000-0000-0000-0000-000000000009', CURRENT_DATE, 12, 999999, 0);

-- Create friendships between users
INSERT INTO public.friendships (requester_id, addressee_id, status, created_at) VALUES
-- Sarah is friends with Mike, Emma, and David
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'accepted', NOW() - INTERVAL '30 days'),
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'accepted', NOW() - INTERVAL '45 days'),
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'accepted', NOW() - INTERVAL '60 days'),

-- Mike is friends with Sarah, Kevin, and Lisa
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'accepted', NOW() - INTERVAL '30 days'),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008', 'accepted', NOW() - INTERVAL '25 days'),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007', 'accepted', NOW() - INTERVAL '40 days'),

-- Emma is friends with Sarah and Ryan
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'accepted', NOW() - INTERVAL '45 days'),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'accepted', NOW() - INTERVAL '35 days'),

-- Alex (admin) is connected to everyone
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'accepted', NOW() - INTERVAL '20 days'),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'accepted', NOW() - INTERVAL '18 days'),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'accepted', NOW() - INTERVAL '15 days'),

-- Jessica is friends with Kevin and Amy
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000008', 'accepted', NOW() - INTERVAL '28 days'),
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000009', 'accepted', NOW() - INTERVAL '22 days');

-- Create messaging permissions based on friendships
INSERT INTO public.messaging_permissions (sender_id, recipient_id, can_message, reason) 
SELECT requester_id, addressee_id, true, 'mutual_connection'
FROM public.friendships 
WHERE status = 'accepted'

UNION ALL

SELECT addressee_id, requester_id, true, 'mutual_connection'
FROM public.friendships 
WHERE status = 'accepted'
ON CONFLICT (sender_id, recipient_id) DO NOTHING;

-- Insert sample posts for social feed testing
INSERT INTO public.posts (id, user_id, content, visibility, school_id, created_at) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 
 'Just got accepted into journalism school! So excited to continue my passion for storytelling. #ClassOf2020 #FutureJournalist', 
 'school', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 hours'),

('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 
 'Launched my first startup today! Building tools to help students connect with alumni mentors. #Entrepreneurship #TechForGood', 
 'public', NULL, NOW() - INTERVAL '5 hours'),

('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 
 'Opening night of our school play was a huge success! So proud of the entire cast and crew. #TheaterLife #DramaClub', 
 'school', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day'),

('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 
 'Excited to announce our new alumni mentorship program! Connecting current students with successful graduates. #Education #Mentorship', 
 'public', NULL, NOW() - INTERVAL '3 days'),

('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 
 'Just published my research on machine learning applications in healthcare. So grateful for the support from my professors! #AI #Research', 
 'school', '00000000-0000-0000-0000-000000000004', NOW() - INTERVAL '6 hours');

-- Insert sample comments on posts
INSERT INTO public.comments (id, post_id, user_id, content, created_at) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 
 'Congratulations Sarah! Your writing talent was always obvious in our school newspaper.', NOW() - INTERVAL '1 hour'),

('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 
 'This is amazing Mike! Would love to learn more about your startup.', NOW() - INTERVAL '4 hours'),

('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 
 'Break a leg, Emma! The arts are so important for education.', NOW() - INTERVAL '23 hours'),

('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', 
 'This mentorship program is exactly what I needed as a student! Thank you for organizing this.', NOW() - INTERVAL '2 days'),

('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000008', 
 'Incredible work Jessica! Your research is pushing boundaries in AI healthcare applications.', NOW() - INTERVAL '5 hours');

-- Insert sample reactions on posts
INSERT INTO public.reactions (post_id, user_id, reaction_type, created_at) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'like', NOW() - INTERVAL '2 hours'),
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'love', NOW() - INTERVAL '1 hour'),
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'like', NOW() - INTERVAL '30 minutes'),

('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'wow', NOW() - INTERVAL '5 hours'),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'like', NOW() - INTERVAL '4 hours'),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008', 'like', NOW() - INTERVAL '3 hours'),

('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'like', NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'love', NOW() - INTERVAL '23 hours'),

('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'like', NOW() - INTERVAL '3 days'),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', 'wow', NOW() - INTERVAL '2 days'),

('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'like', NOW() - INTERVAL '6 hours'),
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000009', 'wow', NOW() - INTERVAL '5 hours');

-- Insert sample notifications
INSERT INTO public.notifications (id, user_id, type, title, message, related_id, related_type, is_read, created_at) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'friend_request', 'New Connection', 
 'Mike Chen wants to connect with you', '00000000-0000-0000-0000-000000000002', 'profile', false, NOW() - INTERVAL '30 minutes'),

('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'post_comment', 'New Comment', 
 'Sarah Johnson commented on your post', '00000000-0000-0000-0000-000000000002', 'post', true, NOW() - INTERVAL '4 hours'),

('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'reaction', 'New Reaction', 
 'Alex Rodriguez liked your post', '00000000-0000-0000-0000-000000000003', 'post', false, NOW() - INTERVAL '1 hour'),

('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'system', 'Welcome to Alumni Connect', 
 'Your account has been successfully created with enterprise features', NULL, NULL, true, NOW() - INTERVAL '1 day'),

('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'search_quota', 'Search Limit Reached', 
 'You have used all your free searches for today. Upgrade to premium for unlimited searches.', NULL, NULL, false, NOW() - INTERVAL '2 hours');

-- Insert sample analytics events
INSERT INTO public.analytics_events (user_id, event_type, event_data, school_id, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'search_performed', '{"query": "journalism programs", "results_count": 12}', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 hours'),

('00000000-0000-0000-0000-000000000002', 'profile_viewed', '{"viewed_profile_id": "00000000-0000-0000-0000-000000000001"}', NULL, NOW() - INTERVAL '2 hours'),

('00000000-0000-0000-0000-000000000003', 'post_created', '{"post_id": "00000000-0000-0000-0000-000000000003", "visibility": "school"}', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day'),

('00000000-0000-0000-0000-000000000004', 'friend_request_sent', '{"recipient_id": "00000000-0000-0000-0000-000000000001"}', NULL, NOW() - INTERVAL '30 minutes'),

('00000000-0000-0000-0000-000000000005', 'premium_feature_used', '{"feature": "advanced_search", "usage_count": 8}', '00000000-0000-0000-0000-000000000004', NOW() - INTERVAL '6 hours');

-- Re-enable RLS
SET session_replication_role = DEFAULT;

-- ===========================================
-- Seed Data Summary
-- ===========================================
-- • 5 schools with comprehensive metadata
-- • 10 user profiles with different subscription tiers
-- • 15 education records spanning multiple schools  
-- • 10 search quota records with realistic usage patterns
-- • 15 friendship connections with messaging permissions
-- • 5 sample posts with comments and reactions
-- • 5 notifications for different event types
-- • 5 analytics events tracking user behavior
-- ===========================================