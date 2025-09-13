-- Alumni Connect - Basic RPC Functions
-- Essential functions for yearbook processing and claims

-- Function to submit a claim for a face or name
CREATE OR REPLACE FUNCTION submit_claim(
  p_page_face_id uuid DEFAULT NULL,
  p_page_name_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claim_id uuid;
  user_school_id uuid;
  yearbook_school_id uuid;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate at least one target is provided
  IF p_page_face_id IS NULL AND p_page_name_id IS NULL THEN
    RAISE EXCEPTION 'Must provide either page_face_id or page_name_id';
  END IF;

  -- Get the school associated with the yearbook
  IF p_page_face_id IS NOT NULL THEN
    SELECT y.school_id INTO yearbook_school_id
    FROM yearbook_pages yp
    JOIN yearbooks y ON y.id = yp.yearbook_id
    JOIN page_faces pf ON pf.page_id = yp.id
    WHERE pf.id = p_page_face_id;
  ELSE
    SELECT y.school_id INTO yearbook_school_id
    FROM yearbook_pages yp
    JOIN yearbooks y ON y.id = yp.yearbook_id
    JOIN page_names_ocr pn ON pn.page_id = yp.id
    WHERE pn.id = p_page_name_id;
  END IF;

  -- Validate user has education history at this school
  SELECT ue.school_id INTO user_school_id
  FROM user_education ue
  WHERE ue.user_id = auth.uid()
    AND ue.school_id = yearbook_school_id
  LIMIT 1;

  IF user_school_id IS NULL THEN
    RAISE EXCEPTION 'User must have education history at this school to claim';
  END IF;

  -- Create the claim
  INSERT INTO claims (user_id, page_face_id, page_name_id, status)
  VALUES (auth.uid(), p_page_face_id, p_page_name_id, 'pending')
  RETURNING id INTO claim_id;

  RETURN claim_id;
END;
$$;

-- Function to approve/reject claims (moderators only)
CREATE OR REPLACE FUNCTION moderate_claim(
  p_claim_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_trust_level trust_level;
  claim_face_id uuid;
BEGIN
  -- Check if user is moderator
  SELECT trust_level INTO user_trust_level
  FROM profiles
  WHERE id = auth.uid();

  IF user_trust_level NOT IN ('school_admin', 'moderator', 'staff') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Validate status
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Status must be approved or rejected';
  END IF;

  -- Update claim
  UPDATE claims
  SET 
    status = p_status,
    verified_by = auth.uid(),
    verified_at = now()
  WHERE id = p_claim_id;

  -- If approved and it's a face claim, mark the face as claimed
  IF p_status = 'approved' THEN
    SELECT page_face_id INTO claim_face_id
    FROM claims
    WHERE id = p_claim_id;

    IF claim_face_id IS NOT NULL THEN
      UPDATE page_faces
      SET claimed_by = (SELECT user_id FROM claims WHERE id = p_claim_id)
      WHERE id = claim_face_id;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Function to get yearbook processing status
CREATE OR REPLACE FUNCTION get_yearbook_status(p_yearbook_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', y.id,
    'title', y.title,
    'school_name', s.name,
    'year', y.year,
    'status', y.status,
    'page_count', y.page_count,
    'ocr_done', y.ocr_done,
    'face_done', y.face_done,
    'total_faces', (
      SELECT COUNT(*) 
      FROM page_faces pf
      JOIN yearbook_pages yp ON yp.id = pf.page_id
      WHERE yp.yearbook_id = y.id
    ),
    'claimed_faces', (
      SELECT COUNT(*) 
      FROM page_faces pf
      JOIN yearbook_pages yp ON yp.id = pf.page_id
      WHERE yp.yearbook_id = y.id AND pf.claimed_by IS NOT NULL
    ),
    'pending_claims', (
      SELECT COUNT(*)
      FROM claims c
      LEFT JOIN page_faces pf ON pf.id = c.page_face_id
      LEFT JOIN page_names_ocr pn ON pn.id = c.page_name_id
      LEFT JOIN yearbook_pages yp ON yp.id = COALESCE(pf.page_id, pn.page_id)
      WHERE yp.yearbook_id = y.id AND c.status = 'pending'
    )
  ) INTO result
  FROM yearbooks y
  JOIN schools s ON s.id = y.school_id
  WHERE y.id = p_yearbook_id;

  RETURN result;
END;
$$;

-- Function to search within yearbook OCR text
CREATE OR REPLACE FUNCTION search_yearbook_text(
  p_yearbook_id uuid,
  p_query text
)
RETURNS TABLE(
  page_id uuid,
  page_number integer,
  text_snippet text,
  bbox integer[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    yp.id as page_id,
    yp.page_number,
    pn.text as text_snippet,
    pn.bbox
  FROM yearbook_pages yp
  JOIN page_names_ocr pn ON pn.page_id = yp.id
  WHERE yp.yearbook_id = p_yearbook_id
    AND to_tsvector('simple', pn.text) @@ plainto_tsquery('simple', p_query)
  ORDER BY yp.page_number;
END;
$$;

-- Function to get user's claims
CREATE OR REPLACE FUNCTION get_user_claims()
RETURNS TABLE(
  claim_id uuid,
  status text,
  created_at timestamptz,
  yearbook_title text,
  school_name text,
  page_number integer,
  claim_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as claim_id,
    c.status,
    c.created_at,
    y.title as yearbook_title,
    s.name as school_name,
    yp.page_number,
    CASE 
      WHEN c.page_face_id IS NOT NULL THEN 'face'
      WHEN c.page_name_id IS NOT NULL THEN 'name'
      ELSE 'unknown'
    END as claim_type
  FROM claims c
  LEFT JOIN page_faces pf ON pf.id = c.page_face_id
  LEFT JOIN page_names_ocr pn ON pn.id = c.page_name_id
  LEFT JOIN yearbook_pages yp ON yp.id = COALESCE(pf.page_id, pn.page_id)
  LEFT JOIN yearbooks y ON y.id = yp.yearbook_id
  LEFT JOIN schools s ON s.id = y.school_id
  WHERE c.user_id = auth.uid()
  ORDER BY c.created_at DESC;
END;
$$;