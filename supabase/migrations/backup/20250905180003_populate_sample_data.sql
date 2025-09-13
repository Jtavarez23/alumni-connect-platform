-- Alumni Connect - Sample Data Population
-- Add sample schools and class years for testing

-- Insert sample schools
INSERT INTO public.schools (name, slug, type, city, state, country, founded_year)
VALUES 
    ('Lincoln High School', 'lincoln-high-school', 'high_school', 'Springfield', 'IL', 'US', 1920),
    ('Washington University', 'washington-university', 'university', 'Seattle', 'WA', 'US', 1861),
    ('Roosevelt Middle School', 'roosevelt-middle-school', 'middle_school', 'Portland', 'OR', 'US', 1935)
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