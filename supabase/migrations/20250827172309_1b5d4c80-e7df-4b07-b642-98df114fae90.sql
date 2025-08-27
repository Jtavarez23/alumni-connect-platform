-- Fix Security Issues: Update RLS policies for yearbook tables
-- Remove overly permissive policies and add school-based access control

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Yearbook editions are viewable by authenticated users" ON yearbook_editions;
DROP POLICY IF EXISTS "Yearbook entries are viewable by authenticated users" ON yearbook_entries;

-- Create secure RLS policies for yearbook_editions
-- Users can view editions from their own school or schools they're connected to
CREATE POLICY "Users can view yearbook editions from their school"
ON yearbook_editions FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- User is from the same school
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
    OR
    -- User has friends from this school (social verification)
    school_id IN (
      SELECT DISTINCT p.school_id 
      FROM profiles p
      JOIN friendships f ON (
        (f.requester_id = p.id AND f.addressee_id = auth.uid()) OR
        (f.addressee_id = p.id AND f.requester_id = auth.uid())
      )
      WHERE f.status = 'accepted' AND p.school_id IS NOT NULL
    )
  )
);

-- Create secure RLS policies for yearbook_entries
-- More restrictive - only show entries to school affiliates and friends
CREATE POLICY "Users can view yearbook entries from their school or friends"
ON yearbook_entries FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Entry is from user's own school
    edition_id IN (
      SELECT ye.id FROM yearbook_editions ye
      JOIN profiles p ON p.school_id = ye.school_id
      WHERE p.id = auth.uid()
    )
    OR
    -- Entry belongs to a confirmed friend
    profile_id IN (
      SELECT CASE 
        WHEN f.requester_id = auth.uid() THEN f.addressee_id
        WHEN f.addressee_id = auth.uid() THEN f.requester_id
      END
      FROM friendships f
      WHERE f.status = 'accepted' AND (
        f.requester_id = auth.uid() OR f.addressee_id = auth.uid()
      )
    )
    OR
    -- Entry is from a school where user has verified friends
    edition_id IN (
      SELECT DISTINCT ye.id
      FROM yearbook_editions ye
      JOIN profiles p ON p.school_id = ye.school_id
      JOIN friendships f ON (
        (f.requester_id = p.id AND f.addressee_id = auth.uid()) OR
        (f.addressee_id = p.id AND f.requester_id = auth.uid())
      )
      WHERE f.status = 'accepted'
    )
  )
);

-- Add Sample Schools Data
-- Insert representative schools for testing and user onboarding
INSERT INTO schools (name, slug, type, location, domain, verified) VALUES
-- High Schools
('Lincoln High School', 'lincoln-high-school', 'high_school', 
 '{"city": "Portland", "state": "Oregon", "country": "USA"}', NULL, true),
('Roosevelt High School', 'roosevelt-high-school', 'high_school',
 '{"city": "Chicago", "state": "Illinois", "country": "USA"}', NULL, true),
('Washington High School', 'washington-high-school', 'high_school',
 '{"city": "Phoenix", "state": "Arizona", "country": "USA"}', NULL, false),
('Jefferson High School', 'jefferson-high-school', 'high_school',
 '{"city": "Denver", "state": "Colorado", "country": "USA"}', NULL, true),
('Madison High School', 'madison-high-school', 'high_school',
 '{"city": "Austin", "state": "Texas", "country": "USA"}', NULL, false),

-- Universities
('Stanford University', 'stanford-university', 'university',
 '{"city": "Stanford", "state": "California", "country": "USA"}', 'stanford.edu', true),
('Harvard University', 'harvard-university', 'university',
 '{"city": "Cambridge", "state": "Massachusetts", "country": "USA"}', 'harvard.edu', true),
('University of California Berkeley', 'uc-berkeley', 'university',
 '{"city": "Berkeley", "state": "California", "country": "USA"}', 'berkeley.edu', true),
('University of Texas at Austin', 'ut-austin', 'university',
 '{"city": "Austin", "state": "Texas", "country": "USA"}', 'utexas.edu', true),
('University of Washington', 'uw-seattle', 'university',
 '{"city": "Seattle", "state": "Washington", "country": "USA"}', 'uw.edu', true),

-- Colleges
('Williams College', 'williams-college', 'college',
 '{"city": "Williamstown", "state": "Massachusetts", "country": "USA"}', 'williams.edu', true),
('Swarthmore College', 'swarthmore-college', 'college',
 '{"city": "Swarthmore", "state": "Pennsylvania", "country": "USA"}', 'swarthmore.edu', true),
('Pomona College', 'pomona-college', 'college',
 '{"city": "Claremont", "state": "California", "country": "USA"}', 'pomona.edu', true),
('Carleton College', 'carleton-college', 'college',
 '{"city": "Northfield", "state": "Minnesota", "country": "USA"}', 'carleton.edu', false),
('Middlebury College', 'middlebury-college', 'college',
 '{"city": "Middlebury", "state": "Vermont", "country": "USA"}', 'middlebury.edu', true),

-- Additional Universities for diversity
('Georgia Institute of Technology', 'georgia-tech', 'university',
 '{"city": "Atlanta", "state": "Georgia", "country": "USA"}', 'gatech.edu', true),
('University of Michigan', 'umich', 'university',
 '{"city": "Ann Arbor", "state": "Michigan", "country": "USA"}', 'umich.edu', true),
('University of Florida', 'uf', 'university',
 '{"city": "Gainesville", "state": "Florida", "country": "USA"}', 'ufl.edu', false),
('Arizona State University', 'asu', 'university',
 '{"city": "Tempe", "state": "Arizona", "country": "USA"}', 'asu.edu', false),
('University of Oregon', 'uoregon', 'university',
 '{"city": "Eugene", "state": "Oregon", "country": "USA"}', 'uoregon.edu', true);