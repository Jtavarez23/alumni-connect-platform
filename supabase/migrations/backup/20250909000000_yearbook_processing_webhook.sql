-- Alumni Connect - Yearbook Processing Webhook Integration
-- Adds webhook call to start_yearbook_processing function

-- First, we need to enable the http extension for making web requests
CREATE EXTENSION IF NOT EXISTS http;

-- Update the start_yearbook_processing function to call the webhook
CREATE OR REPLACE FUNCTION start_yearbook_processing(p_yearbook_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  yearbook_record yearbooks%ROWTYPE;
  webhook_url text := 'http://localhost:3001/process-yearbook';
  webhook_response json;
BEGIN
  -- Get yearbook record
  SELECT * INTO yearbook_record FROM yearbooks WHERE id = p_yearbook_id;
  
  IF yearbook_record.id IS NULL THEN
    RETURN json_build_object('error', 'Yearbook not found');
  END IF;
  
  -- Check if user owns the yearbook
  IF yearbook_record.uploaded_by != auth.uid() THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;
  
  -- Insert into safety queue for processing
  INSERT INTO safety_queue (yearbook_id, status)
  VALUES (p_yearbook_id, 'pending')
  ON CONFLICT (yearbook_id) DO UPDATE SET
    status = 'pending',
    updated_at = now();
    
  -- Update yearbook status
  UPDATE yearbooks 
  SET status = 'pending', updated_at = now()
  WHERE id = p_yearbook_id;

  -- Call the processing webhook (async - don't wait for response)
  BEGIN
    -- This is a non-blocking call - we don't wait for the response
    -- The webhook handler will enqueue the processing jobs
    PERFORM http_post(
      webhook_url,
      json_build_object('yearbook_id', p_yearbook_id)::text,
      'application/json'
    );
  EXCEPTION WHEN OTHERS THEN
    -- If the webhook call fails, we still return success to the user
    -- The processing will be triggered manually or via retry mechanism
    RAISE NOTICE 'Webhook call failed: %', SQLERRM;
  END;

  RETURN json_build_object('success', true, 'message', 'Processing started');
END;
$$;

-- Add a function to manually retry failed webhook calls
CREATE OR REPLACE FUNCTION retry_yearbook_processing(p_yearbook_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url text := 'http://localhost:3001/process-yearbook';
BEGIN
  -- Verify yearbook exists and is in pending state
  IF NOT EXISTS (
    SELECT 1 FROM yearbooks 
    WHERE id = p_yearbook_id AND status = 'pending'
  ) THEN
    RETURN json_build_object('error', 'Yearbook not found or not in pending state');
  END IF;

  -- Call the webhook
  BEGIN
    PERFORM http_post(
      webhook_url,
      json_build_object('yearbook_id', p_yearbook_id)::text,
      'application/json'
    );
    
    RETURN json_build_object('success', true, 'message', 'Retry initiated');
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', 'Webhook call failed: ' || SQLERRM);
  END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION retry_yearbook_processing(uuid) TO authenticated;