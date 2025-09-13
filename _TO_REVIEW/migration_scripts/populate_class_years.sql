-- Alumni Connect - Populate Class Years
-- Add graduation years for common schools (we'll use a generic approach first)

-- First, let's see what schools exist
-- We'll add years from 1950 to 2030 for all existing schools

DO $$
DECLARE
    school_record RECORD;
    year_val INTEGER;
BEGIN
    -- Loop through all schools
    FOR school_record IN SELECT id FROM public.schools LOOP
        -- Add years from 1950 to 2030 for each school
        FOR year_val IN 1950..2030 LOOP
            INSERT INTO public.class_years (school_id, year) 
            VALUES (school_record.id, year_val)
            ON CONFLICT (school_id, year) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- If no schools exist yet, let's create a sample school and add years
INSERT INTO public.schools (id, name, slug, type, city, state, country)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Sample High School', 'sample-high-school', 'high_school', 'Anytown', 'CA', 'US')
ON CONFLICT (id) DO NOTHING;

-- Add class years for the sample school
DO $$
DECLARE
    sample_school_id UUID := '11111111-1111-1111-1111-111111111111';
    year_val INTEGER;
BEGIN
    FOR year_val IN 1950..2030 LOOP
        INSERT INTO public.class_years (school_id, year) 
        VALUES (sample_school_id, year_val)
        ON CONFLICT (school_id, year) DO NOTHING;
    END LOOP;
END $$;