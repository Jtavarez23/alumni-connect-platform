-- Update Supabase TypeScript types to match new schema
-- This patch updates the Database type definitions to reflect the renamed tables

-- Replace yearbook_editions with yearbooks
UPDATE yearbook_editions SET 
  name = 'yearbooks',
  definition = REPLACE(definition, 'yearbook_editions', 'yearbooks')
WHERE name = 'yearbook_editions';

-- Replace yearbook_entries with yearbook_pages  
UPDATE yearbook_entries SET
  name = 'yearbook_pages',
  definition = REPLACE(definition, 'yearbook_entries', 'yearbook_pages')
WHERE name = 'yearbook_entries';

-- Update foreign key references in relationships
UPDATE table_relationships SET
  foreign_key_name = REPLACE(foreign_key_name, 'yearbook_editions', 'yearbooks'),
  referenced_relation = REPLACE(referenced_relation, 'yearbook_editions', 'yearsbooks')
WHERE referenced_relation LIKE '%yearbook_editions%';

UPDATE table_relationships SET
  foreign_key_name = REPLACE(foreign_key_name, 'yearbook_entries', 'yearbook_pages'),
  referenced_relation = REPLACE(referenced_relation, 'yearbook_entries', 'yearbook_pages')
WHERE referenced_relation LIKE '%yearbook_entries%';

-- Add new tables to types definition
INSERT INTO table_definitions (name, definition) VALUES
('yearbook_faces', '{
  "Row": {
    "id": "string",
    "page_id": "string", 
    "bbox": "Json",
    "detected_name": "string | null",
    "claimed_by": "string | null",
    "verified": "boolean",
    "created_at": "string"
  },
  "Insert": {
    "id?": "string",
    "page_id": "string",
    "bbox": "Json", 
    "detected_name?": "string | null",
    "claimed_by?": "string | null",
    "verified?": "boolean",
    "created_at?": "string"
  },
  "Update": {
    "id?": "string",
    "page_id?": "string",
    "bbox?": "Json",
    "detected_name?": "string | null", 
    "claimed_by?": "string | null",
    "verified?": "boolean",
    "created_at?": "string"
  }
}'),

('yearbook_claims', '{
  "Row": {
    "id": "string",
    "face_id": "string",
    "user_id": "string",
    "status": "string", 
    "created_at": "string"
  },
  "Insert": {
    "id?": "string",
    "face_id": "string",
    "user_id": "string",
    "status?": "string",
    "created_at?": "string"
  },
  "Update": {
    "id?": "string",
    "face_id?": "string",
    "user_id?": "string",
    "status?": "string",
    "created_at?": "string"
  }
}'),

('groups', '{
  "Row": {
    "id": "string",
    "type": "string",
    "school_id": "string | null",
    "name": "string",
    "description": "string | null",
    "created_by": "string | null",
    "privacy": "string",
    "created_at": "string"
  },
  "Insert": {
    "id?": "string",
    "type": "string",
    "school_id?": "string | null",
    "name": "string",
    "description?": "string | null",
    "created_by?": "string | null",
    "privacy?": "string",
    "created_at?": "string"
  },
  "Update": {
    "id?": "string",
    "type?": "string",
    "school_id?": "string | null",
    "name?": "string",
    "description?": "string | null",
    "created_by?": "string | null",
    "privacy?": "string",
    "created_at?": "string"
  }
}'),

('group_members', '{
  "Row": {
    "id": "string",
    "group_id": "string",
    "user_id": "string",
    "role": "string",
    "joined_at": "string"
  },
  "Insert": {
    "id?": "string",
    "group_id": "string",
    "user_id": "string",
    "role?": "string",
    "joined_at?": "string"
  },
  "Update": {
    "id?": "string",
    "group_id?": "string",
    "user_id?": "string",
    "role?": "string",
    "joined_at?": "string"
  }
}');

-- Add relationships for new tables
INSERT INTO table_relationships (foreign_key_name, columns, referenced_relation, referenced_columns) VALUES
('yearbook_faces_page_id_fkey', '{"page_id"}', 'yearbook_pages', '{"id"}'),
('yearbook_faces_claimed_by_fkey', '{"claimed_by"}', 'profiles', '{"id"}'),
('yearbook_claims_face_id_fkey', '{"face_id"}', 'yearbook_faces', '{"id"}'),
('yearbook_claims_user_id_fkey', '{"user_id"}', 'profiles', '{"id"}'),
('groups_school_id_fkey', '{"school_id"}', 'schools', '{"id"}'),
('groups_created_by_fkey', '{"created_by"}', 'profiles', '{"id"}'),
('group_members_group_id_fkey', '{"group_id"}', 'groups', '{"id"}'),
('group_members_user_id_fkey', '{"user_id"}', 'profiles', '{"id"}');

-- Update the yearbooks table definition with new columns
UPDATE table_definitions SET definition = '{
  "Row": {
    "id": "string",
    "school_id": "string",
    "year": "number",
    "title": "string | null",
    "cover_image_url": "string | null",
    "page_count": "number | null",
    "status": "string",
    "uploaded_by": "string | null",
    "file_url": "string | null",
    "created_at": "string"
  },
  "Insert": {
    "id?": "string",
    "school_id": "string",
    "year": "number",
    "title?": "string | null",
    "cover_image_url?": "string | null",
    "page_count?": "number | null",
    "status?": "string",
    "uploaded_by?": "string | null",
    "file_url?": "string | null",
    "created_at?": "string"
  },
  "Update": {
    "id?": "string",
    "school_id?": "string",
    "year?": "number",
    "title?": "string | null",
    "cover_image_url?": "string | null",
    "page_count?": "number | null",
    "status?": "string",
    "uploaded_by?": "string | null",
    "file_url?": "string | null",
    "created_at?": "string"
  }
}' WHERE name = 'yearbooks';

-- Update the yearbook_pages table definition with new columns
UPDATE table_definitions SET definition = '{
  "Row": {
    "id": "string",
    "yearbook_id": "string",
    "page_number": "number | null",
    "student_name": "string",
    "photo_url": "string | null",
    "activities": "string[] | null",
    "honors": "string[] | null",
    "quote": "string | null",
    "profile_id": "string | null",
    "ocr_text": "string | null",
    "processed_at": "string | null",
    "image_url": "string | null",
    "created_at": "string"
  },
  "Insert": {
    "id?": "string",
    "yearbook_id": "string",
    "page_number?": "number | null",
    "student_name": "string",
    "photo_url?": "string | null",
    "activities?": "string[] | null",
    "honors?": "string[] | null",
    "quote?": "string | null",
    "profile_id?": "string | null",
    "ocr_text?": "string | null",
    "processed_at?": "string | null",
    "image_url?": "string | null",
    "created_at?": "string"
  },
  "Update": {
    "id?": "string",
    "yearbook_id?": "string",
    "page_number?": "number | null",
    "student_name?": "string",
    "photo_url?": "string | null",
    "activities?": "string[] | null",
    "honors?": "string[] | null",
    "quote?": "string | null",
    "profile_id?": "string | null",
    "ocr_text?": "string | null",
    "processed_at?": "string | null",
    "image_url?": "string | null",
    "created_at?": "string"
  }
}' WHERE name = 'yearbook_pages';