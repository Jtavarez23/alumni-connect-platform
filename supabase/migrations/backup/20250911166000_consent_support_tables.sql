-- ================================================================
-- ALUMNI CONNECT: CONSENT MANAGEMENT SUPPORT TABLES
-- File: 20250911166000_consent_support_tables.sql
-- Purpose: Additional tables to support consent management functionality
-- ================================================================

-- ================================================================
-- 1. PROCESSING QUEUE (for consent-based processing)
-- ================================================================

CREATE TABLE IF NOT EXISTS processing_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type text NOT NULL CHECK (job_type IN (
        'facial_recognition', 'ocr', 'yearbook_analysis', 'data_export',
        'data_deletion', 'consent_processing', 'notification_batch'
    )),
    job_data jsonb NOT NULL DEFAULT '{}',
    status text NOT NULL CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled'
    )) DEFAULT 'pending',
    priority text NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    attempts integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 3,
    error_message text,
    scheduled_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ================================================================
-- 2. PHOTO TAGS (for photo tagging consent)
-- ================================================================

CREATE TABLE IF NOT EXISTS photo_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id uuid NOT NULL, -- References yearbook_faces or other photo tables
    tagged_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tagged_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tag_status text NOT NULL CHECK (tag_status IN (
        'pending', 'confirmed', 'rejected', 'auto_approved'
    )) DEFAULT 'pending',
    tag_coordinates jsonb, -- x, y, width, height coordinates
    confidence_score decimal(5,4), -- 0.0000 to 1.0000
    tag_source text NOT NULL CHECK (tag_source IN (
        'manual', 'ai_suggestion', 'import', 'bulk_tag'
    )) DEFAULT 'manual',
    approved_at timestamptz,
    rejected_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(photo_id, tagged_user_id)
);

-- ================================================================
-- 3. CONSENT HISTORY (detailed consent change tracking)
-- ================================================================

CREATE TABLE IF NOT EXISTS consent_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type text NOT NULL,
    old_consent_given boolean,
    new_consent_given boolean NOT NULL,
    old_consent_version text,
    new_consent_version text NOT NULL,
    change_reason text CHECK (change_reason IN (
        'user_initiated', 'privacy_update', 'policy_change', 
        'account_setup', 'data_migration', 'legal_requirement'
    )),
    change_method text NOT NULL CHECK (change_method IN (
        'web_form', 'mobile_app', 'email_link', 'api_call',
        'bulk_update', 'migration_script', 'support_action'
    )),
    ip_address inet,
    user_agent text,
    additional_context jsonb DEFAULT '{}',
    changed_at timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- 4. PRIVACY POLICY VERSIONS
-- ================================================================

CREATE TABLE IF NOT EXISTS privacy_policy_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version text NOT NULL UNIQUE,
    title text NOT NULL,
    content text NOT NULL,
    summary text,
    major_changes text[],
    effective_date timestamptz NOT NULL,
    created_by uuid REFERENCES auth.users(id),
    is_current boolean NOT NULL DEFAULT false,
    requires_reconsent boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert current privacy policy version
INSERT INTO privacy_policy_versions (
    version,
    title,
    content,
    summary,
    major_changes,
    effective_date,
    is_current,
    requires_reconsent
) VALUES (
    'v2.0-2025',
    'Alumni Connect Privacy Policy v2.0',
    'This is the current privacy policy content...',
    'Updated privacy policy with enhanced GDPR compliance and consent management',
    ARRAY[
        'Enhanced consent granularity for yearbook processing',
        'Improved data deletion procedures',
        'New biometric data handling policies',
        'Strengthened user control over data sharing'
    ],
    '2025-09-11 00:00:00+00',
    true,
    true
) ON CONFLICT (version) DO UPDATE SET
    is_current = EXCLUDED.is_current,
    updated_at = now();

-- ================================================================
-- 5. USER PREFERENCES (enhanced for consent-based features)
-- ================================================================

-- Check if user_preferences table exists, if not create it
CREATE TABLE IF NOT EXISTS user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Yearbook processing preferences
    yearbook_processing_enabled boolean DEFAULT false,
    photo_recognition_enabled boolean DEFAULT false,
    photo_tagging_enabled boolean DEFAULT true,
    yearbook_sharing_enabled boolean DEFAULT true,
    auto_approve_tags boolean DEFAULT false,
    
    -- Communication preferences
    marketing_emails boolean DEFAULT false,
    notification_emails boolean DEFAULT true,
    digest_frequency text CHECK (digest_frequency IN ('daily', 'weekly', 'monthly', 'never')) DEFAULT 'weekly',
    
    -- Privacy preferences
    analytics_enabled boolean DEFAULT false,
    data_sharing_enabled boolean DEFAULT false,
    location_services_enabled boolean DEFAULT false,
    
    -- AI and recommendation preferences
    ai_recommendations_enabled boolean DEFAULT false,
    connection_suggestions boolean DEFAULT true,
    event_recommendations boolean DEFAULT true,
    
    -- Display preferences
    profile_visibility text CHECK (profile_visibility IN ('public', 'alumni_only', 'connections_only', 'private')) DEFAULT 'alumni_only',
    show_in_directory boolean DEFAULT true,
    show_graduation_year boolean DEFAULT true,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ================================================================

-- Processing queue indexes
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_processing_queue_job_type ON processing_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_processing_queue_priority ON processing_queue(priority);
CREATE INDEX IF NOT EXISTS idx_processing_queue_scheduled_at ON processing_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_processing_queue_created_at ON processing_queue(created_at);

-- Photo tags indexes
CREATE INDEX IF NOT EXISTS idx_photo_tags_photo_id ON photo_tags(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tagged_user ON photo_tags(tagged_user_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tagged_by ON photo_tags(tagged_by_user_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_status ON photo_tags(tag_status);
CREATE INDEX IF NOT EXISTS idx_photo_tags_source ON photo_tags(tag_source);

-- Consent history indexes
CREATE INDEX IF NOT EXISTS idx_consent_history_user_id ON consent_history(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_consent_type ON consent_history(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_history_changed_at ON consent_history(changed_at);

-- Privacy policy versions indexes
CREATE INDEX IF NOT EXISTS idx_privacy_policy_versions_version ON privacy_policy_versions(version);
CREATE INDEX IF NOT EXISTS idx_privacy_policy_versions_effective ON privacy_policy_versions(effective_date);
CREATE INDEX IF NOT EXISTS idx_privacy_policy_versions_current ON privacy_policy_versions(is_current) WHERE is_current = true;

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ================================================================
-- 7. TRIGGERS AND FUNCTIONS
-- ================================================================

-- Updated at triggers
CREATE TRIGGER processing_queue_updated_at
    BEFORE UPDATE ON processing_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER photo_tags_updated_at
    BEFORE UPDATE ON photo_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER privacy_policy_versions_updated_at
    BEFORE UPDATE ON privacy_policy_versions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to log consent changes in history
CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if this is a new consent or consent status changed
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.consent_given IS DISTINCT FROM NEW.consent_given) THEN
        INSERT INTO consent_history (
            user_id,
            consent_type,
            old_consent_given,
            new_consent_given,
            old_consent_version,
            new_consent_version,
            change_reason,
            change_method,
            ip_address,
            user_agent,
            additional_context
        ) VALUES (
            NEW.user_id,
            NEW.consent_type,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.consent_given END,
            NEW.consent_given,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.consent_version END,
            NEW.consent_version,
            COALESCE((NEW.consent_details->>'change_reason')::text, 'user_initiated'),
            NEW.consent_method,
            NEW.ip_address,
            NEW.user_agent,
            NEW.consent_details
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply consent change trigger
CREATE TRIGGER gdpr_consents_history_trigger
    AFTER INSERT OR UPDATE ON gdpr_consents
    FOR EACH ROW EXECUTE FUNCTION log_consent_change();

-- Function to ensure only one current privacy policy
CREATE OR REPLACE FUNCTION ensure_single_current_policy()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = true THEN
        -- Set all other policies to not current
        UPDATE privacy_policy_versions
        SET is_current = false,
            updated_at = now()
        WHERE id != NEW.id
          AND is_current = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply single current policy trigger
CREATE TRIGGER privacy_policy_single_current_trigger
    AFTER INSERT OR UPDATE ON privacy_policy_versions
    FOR EACH ROW
    WHEN (NEW.is_current = true)
    EXECUTE FUNCTION ensure_single_current_policy();

-- ================================================================
-- 8. CONSENT MANAGEMENT FUNCTIONS
-- ================================================================

-- Function to get user's effective consent status
CREATE OR REPLACE FUNCTION get_effective_consent_status(
    user_uuid uuid,
    consent_type_val text
) RETURNS TABLE(
    has_consent boolean,
    consent_version text,
    given_at timestamptz,
    requires_update boolean
) AS $$
DECLARE
    current_policy_version text;
    user_consent_record RECORD;
BEGIN
    -- Get current privacy policy version
    SELECT version INTO current_policy_version
    FROM privacy_policy_versions
    WHERE is_current = true;
    
    -- Get user's latest consent for this type
    SELECT c.consent_given, c.consent_version, c.given_at, c.withdrawn_at
    INTO user_consent_record
    FROM gdpr_consents c
    WHERE c.user_id = user_uuid
      AND c.consent_type = consent_type_val
      AND c.withdrawn_at IS NULL
    ORDER BY c.given_at DESC
    LIMIT 1;
    
    -- Determine if consent is valid and current
    IF user_consent_record IS NULL THEN
        -- No consent recorded
        RETURN QUERY SELECT false, NULL::text, NULL::timestamptz, true;
    ELSIF user_consent_record.consent_given = false THEN
        -- Consent explicitly withdrawn
        RETURN QUERY SELECT false, user_consent_record.consent_version, user_consent_record.given_at, false;
    ELSIF user_consent_record.consent_version != current_policy_version THEN
        -- Consent exists but for old policy version
        RETURN QUERY SELECT true, user_consent_record.consent_version, user_consent_record.given_at, true;
    ELSE
        -- Valid current consent
        RETURN QUERY SELECT true, user_consent_record.consent_version, user_consent_record.given_at, false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can perform consent-requiring actions
CREATE OR REPLACE FUNCTION can_perform_action(
    user_uuid uuid,
    action_type text
) RETURNS boolean AS $$
DECLARE
    required_consents text[];
    consent_status RECORD;
    consent_type text;
BEGIN
    -- Define required consents for different actions
    CASE action_type
        WHEN 'yearbook_processing' THEN
            required_consents := ARRAY['data_processing', 'yearbook_processing'];
        WHEN 'photo_recognition' THEN
            required_consents := ARRAY['data_processing', 'yearbook_processing', 'photo_recognition'];
        WHEN 'photo_tagging' THEN
            required_consents := ARRAY['data_processing', 'photo_tagging'];
        WHEN 'marketing_communication' THEN
            required_consents := ARRAY['marketing'];
        WHEN 'analytics_tracking' THEN
            required_consents := ARRAY['analytics'];
        WHEN 'data_sharing' THEN
            required_consents := ARRAY['data_sharing'];
        ELSE
            required_consents := ARRAY['data_processing']; -- Default
    END CASE;
    
    -- Check each required consent
    FOREACH consent_type IN ARRAY required_consents
    LOOP
        SELECT * INTO consent_status
        FROM get_effective_consent_status(user_uuid, consent_type);
        
        -- If any required consent is missing or withdrawn, return false
        IF NOT consent_status.has_consent THEN
            RETURN false;
        END IF;
    END LOOP;
    
    -- All required consents are present
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's consent dashboard data
CREATE OR REPLACE FUNCTION get_consent_dashboard(user_uuid uuid)
RETURNS TABLE(
    consent_type text,
    consent_given boolean,
    consent_version text,
    given_at timestamptz,
    requires_update boolean,
    consent_name text,
    consent_description text,
    is_required boolean
) AS $$
BEGIN
    RETURN QUERY
    WITH consent_types AS (
        SELECT unnest(ARRAY[
            'data_processing', 'marketing', 'analytics', 'yearbook_processing',
            'photo_recognition', 'photo_tagging', 'yearbook_sharing',
            'data_sharing', 'third_party_integrations', 'ai_recommendations',
            'location_services'
        ]) AS consent_type_name
    ),
    consent_metadata AS (
        SELECT 
            'data_processing' as type, 'Data Processing' as name, 'Allow processing of personal data for core platform functionality' as description, true as required
        UNION ALL SELECT 'marketing', 'Marketing Communications', 'Receive marketing emails and promotional content', false
        UNION ALL SELECT 'analytics', 'Analytics', 'Allow collection of usage analytics', false
        UNION ALL SELECT 'yearbook_processing', 'Yearbook Processing', 'Allow processing of yearbook content', false
        UNION ALL SELECT 'photo_recognition', 'Photo Recognition', 'Use AI to identify faces in photos', false
        UNION ALL SELECT 'photo_tagging', 'Photo Tagging', 'Allow others to tag you in photos', false
        UNION ALL SELECT 'yearbook_sharing', 'Yearbook Sharing', 'Share yearbook content with alumni', false
        UNION ALL SELECT 'data_sharing', 'Data Sharing', 'Share data with educational institutions', false
        UNION ALL SELECT 'third_party_integrations', 'Third-party Services', 'Connect with external services', false
        UNION ALL SELECT 'ai_recommendations', 'AI Recommendations', 'Use AI for personalized suggestions', false
        UNION ALL SELECT 'location_services', 'Location Services', 'Use location data for events', false
    )
    SELECT 
        ct.consent_type_name,
        COALESCE(ecs.has_consent, false),
        ecs.consent_version,
        ecs.given_at,
        COALESCE(ecs.requires_update, true),
        cm.name,
        cm.description,
        cm.required
    FROM consent_types ct
    LEFT JOIN consent_metadata cm ON cm.type = ct.consent_type_name
    LEFT JOIN LATERAL get_effective_consent_status(user_uuid, ct.consent_type_name) ecs ON true
    ORDER BY cm.required DESC, ct.consent_type_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 9. ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS on new tables
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Processing queue policies
CREATE POLICY "Service role can manage processing queue" ON processing_queue
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Users can see jobs related to them" ON processing_queue
    FOR SELECT USING (
        (job_data->>'user_id')::uuid = auth.uid() OR
        current_setting('role') = 'service_role'
    );

-- Photo tags policies
CREATE POLICY "Users can see tags involving them" ON photo_tags
    FOR SELECT USING (
        tagged_user_id = auth.uid() OR
        tagged_by_user_id = auth.uid() OR
        current_setting('role') = 'service_role'
    );

CREATE POLICY "Users can create photo tags" ON photo_tags
    FOR INSERT WITH CHECK (
        tagged_by_user_id = auth.uid()
    );

CREATE POLICY "Tagged users can update their tags" ON photo_tags
    FOR UPDATE USING (
        tagged_user_id = auth.uid() OR
        current_setting('role') = 'service_role'
    );

-- Consent history policies
CREATE POLICY "Users can see their own consent history" ON consent_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage consent history" ON consent_history
    FOR ALL USING (current_setting('role') = 'service_role');

-- Privacy policy versions (read-only for users)
CREATE POLICY "Anyone can read privacy policies" ON privacy_policy_versions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage privacy policies" ON privacy_policy_versions
    FOR ALL USING (current_setting('role') = 'service_role');

-- User preferences policies
CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all preferences" ON user_preferences
    FOR ALL USING (current_setting('role') = 'service_role');

-- ================================================================
-- 10. VALIDATION
-- ================================================================

-- Test consent management functions
DO $$
DECLARE
    test_user_id uuid;
    consent_dashboard_result RECORD;
BEGIN
    -- Test consent functions if there are any users
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test consent dashboard
        FOR consent_dashboard_result IN 
            SELECT * FROM get_consent_dashboard(test_user_id) LIMIT 3
        LOOP
            RAISE NOTICE 'Consent: % - Given: % - Required: %', 
                consent_dashboard_result.consent_name,
                consent_dashboard_result.consent_given,
                consent_dashboard_result.is_required;
        END LOOP;
        
        -- Test action permission
        IF can_perform_action(test_user_id, 'yearbook_processing') THEN
            RAISE NOTICE 'User can perform yearbook processing';
        ELSE
            RAISE NOTICE 'User cannot perform yearbook processing';
        END IF;
    END IF;
    
    RAISE NOTICE 'Consent Support Tables Migration: COMPLETED SUCCESSFULLY';
END $$;