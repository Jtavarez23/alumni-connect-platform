-- Check existing schools and populate class years
SELECT 'Current schools:' as info;
SELECT id, name FROM public.schools LIMIT 5;

-- Insert sample school if none exist
INSERT INTO public.schools (name, slug, type, city, state, country)
VALUES ('Sample High School', 'sample-high-school', 'high_school', 'Anytown', 'CA', 'US')
ON CONFLICT (slug) DO NOTHING;

-- Get the school ID we'll use
SELECT id FROM public.schools WHERE slug = 'sample-high-school' LIMIT 1;