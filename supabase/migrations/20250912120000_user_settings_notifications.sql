-- Migration: User Settings and Push Notifications Support
-- Create user_settings table for storing user preferences and push tokens

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    expo_push_token TEXT,
    notification_preferences JSONB DEFAULT '{"posts": true, "events": true, "messages": true, "connections": true}'::jsonb,
    email_preferences JSONB DEFAULT '{"marketing": false, "newsletter": false}'::jsonb,
    privacy_settings JSONB DEFAULT '{"profile_visibility": "public", "search_visibility": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own settings
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Create index for push token lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_expo_push_token ON user_settings(expo_push_token) WHERE expo_push_token IS NOT NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE OR REPLACE TRIGGER user_settings_updated_at_trigger
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- Create function to get user's push token
CREATE OR REPLACE FUNCTION get_user_push_token(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT expo_push_token FROM user_settings WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to save user's push token
CREATE OR REPLACE FUNCTION save_user_push_token(user_uuid UUID, push_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_settings (user_id, expo_push_token, updated_at)
    VALUES (user_uuid, push_token, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET 
        expo_push_token = EXCLUDED.expo_push_token,
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to remove user's push token
CREATE OR REPLACE FUNCTION remove_user_push_token(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_settings 
    SET expo_push_token = NULL, updated_at = NOW()
    WHERE user_id = user_uuid;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get users with push tokens for notifications
CREATE OR REPLACE FUNCTION get_users_with_push_tokens()
RETURNS TABLE(user_id UUID, expo_push_token TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT us.user_id, us.expo_push_token
    FROM user_settings us
    WHERE us.expo_push_token IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user allows specific notification type
CREATE OR REPLACE FUNCTION user_allows_notification(user_uuid UUID, notification_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT (notification_preferences->>notification_type)::BOOLEAN
        FROM user_settings
        WHERE user_id = user_uuid
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN TRUE; -- Default to true if error occurs
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default settings for existing users
INSERT INTO user_settings (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Comment on table and columns
COMMENT ON TABLE user_settings IS 'Stores user preferences, settings, and push notification tokens';
COMMENT ON COLUMN user_settings.expo_push_token IS 'Expo push token for mobile push notifications';
COMMENT ON COLUMN user_settings.notification_preferences IS 'JSON object storing notification preferences';
COMMENT ON COLUMN user_settings.email_preferences IS 'JSON object storing email preferences';
COMMENT ON COLUMN user_settings.privacy_settings IS 'JSON object storing privacy settings';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_settings TO authenticated_user;
GRANT EXECUTE ON FUNCTION get_user_push_token TO authenticated_user;
GRANT EXECUTE ON FUNCTION save_user_push_token TO authenticated_user;
GRANT EXECUTE ON FUNCTION remove_user_push_token TO authenticated_user;
GRANT EXECUTE ON FUNCTION user_allows_notification TO authenticated_user;