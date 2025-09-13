-- Alumni Connect - Cron Jobs Setup
-- AC-ARCH-003 compliant cron scheduling

-- Enable the cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cron jobs as specified in AC-ARCH-003

-- 1. Refresh trending materialized view every 5 minutes
SELECT cron.schedule(
    'refresh-trending-every-5-min',
    '*/5 * * * *',
    $$SELECT net.http_post(
        url := supabase_url || '/functions/v1/cron-refresh-trending',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || service_role_key || '"}'::jsonb
    ) FROM (
        SELECT current_setting('app.settings.supabase_url') AS supabase_url,
               current_setting('app.settings.service_role_key') AS service_role_key
    ) vars$$
);

-- 2. Weekly digest every Wednesday at 10:00 AM
SELECT cron.schedule(
    'weekly-digest-wednesday-10am',
    '0 10 * * 3',
    $$SELECT net.http_post(
        url := supabase_url || '/functions/v1/cron-digest-weekly',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || service_role_key || '"}'::jsonb
    ) FROM (
        SELECT current_setting('app.settings.supabase_url') AS supabase_url,
               current_setting('app.settings.service_role_key') AS service_role_key
    ) vars$$
);

-- 3. Nightly cleanup at 2:00 AM every day
SELECT cron.schedule(
    'nightly-cleanup-2am',
    '0 2 * * *',
    $$SELECT net.http_post(
        url := supabase_url || '/functions/v1/cron-cleanup',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || service_role_key || '"}'::jsonb
    ) FROM (
        SELECT current_setting('app.settings.supabase_url') AS supabase_url,
               current_setting('app.settings.service_role_key') AS service_role_key
    ) vars$$
);

-- 4. Safety scan processing every minute (polls safety_queue)
SELECT cron.schedule(
    'safety-scan-processing',
    '* * * * *',
    $$SELECT net.http_post(
        url := supabase_url || '/functions/v1/worker-safety-scan',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || service_role_key || '"}'::jsonb
    ) FROM (
        SELECT current_setting('app.settings.supabase_url') AS supabase_url,
               current_setting('app.settings.service_role_key') AS service_role_key
    ) vars$$
);

-- 5. OCR processing every 2 minutes
SELECT cron.schedule(
    'ocr-processing',
    '*/2 * * * *',
    $$SELECT net.http_post(
        url := supabase_url || '/functions/v1/worker-ocr',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || service_role_key || '"}'::jsonb
    ) FROM (
        SELECT current_setting('app.settings.supabase_url') AS supabase_url,
               current_setting('app.settings.service_role_key') AS service_role_key
    ) vars$$
);

-- 6. Face detection processing every 3 minutes
SELECT cron.schedule(
    'face-detection-processing',
    '*/3 * * * *',
    $$SELECT net.http_post(
        url := supabase_url || '/functions/v1/worker-face-detection',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || service_role_key || '"}'::jsonb
    ) FROM (
        SELECT current_setting('app.settings.supabase_url') AS supabase_url,
               current_setting('app.settings.service_role_key') AS service_role_key
    ) vars$$
);

-- 7. Tiling processing every 5 minutes
SELECT cron.schedule(
    'tiling-processing',
    '*/5 * * * *',
    $$SELECT net.http_post(
        url := supabase_url || '/functions/v1/worker-tiler',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || service_role_key || '"}'::jsonb
    ) FROM (
        SELECT current_setting('app.settings.supabase_url') AS supabase_url,
               current_setting('app.settings.service_role_key') AS service_role_key
    ) vars$$
);

-- Set the required configuration settings
ALTER SYSTEM SET app.settings.supabase_url TO 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
ALTER SYSTEM SET app.settings.service_role_key TO 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTM5MjUzMCwiZXhwIjoyMDQwOTY4NTMwfQ.0t2U3M1h3Qh9Y4Y4Y4Y4Y4Y4Y4Y4Y4Y4Y4Y4Y4Y4Y';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;