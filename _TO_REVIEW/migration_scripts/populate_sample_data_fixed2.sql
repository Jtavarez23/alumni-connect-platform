-- Alumni Connect - Sample Data Population (Fixed for location constraint)
-- Add sample schools and class years for testing

-- Insert sample schools with location as JSON
INSERT INTO public.schools (name, slug, type, city, state, country, location)
VALUES 
    ('Lincoln High School', 'lincoln-high-school', 'high_school', 'Springfield', 'IL', 'US', '{"city": "Springfield", "state": "IL", "country": "US"}'::jsonb),
    ('Washington University', 'washington-university', 'university', 'Seattle', 'WA', 'US', '{"city": "Seattle", "state": "WA", "country": "US"}'::jsonb),
    ('Roosevelt Middle School', 'roosevelt-middle-school', 'middle_school', 'Portland', 'OR', 'US', '{"city": "Portland", "state": "OR", "country": "US"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Add class years for each school (1950-2030)
DO $$
DECLARE
    school_record RECORD;
    year_val INTEGER;
BEGIN
    -- For each school, add years 1950-2030
    FOR school_record IN SELECT id FROM public.schools LOOP
        FOR year_val IN 1950..2030 LOOP
            INSERT INTO public.class_years (school_id, year) 
            VALUES (school_record.id, year_val)
            ON CONFLICT (school_id, year) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;