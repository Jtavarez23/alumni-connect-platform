# CLAUDE.md Enhanced with RLS Security

## Key Additions to Prevent RLS Infinite Recursion:

### FORBIDDEN PATTERNS (NEVER DO):
- EXISTS (SELECT FROM table_name WHERE ...) when policy is defined ON table_name  
- Direct self-referencing queries in RLS policies
- Granting SELECT permissions to 'anon' or 'public' roles on sensitive tables

### REQUIRED PATTERNS (ALWAYS DO):
1. Use SECURITY DEFINER functions for cross-table logic
2. Test with anonymous client immediately after policy creation  
3. Use FORCE ROW LEVEL SECURITY on sensitive tables
4. Revoke unnecessary permissions from anon/public roles

### SAFE EXAMPLE:
```sql
-- ✅ SAFE: Security definer function breaks recursion
CREATE FUNCTION check_connection(user1 UUID, user2 UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
AS $$ BEGIN
  RETURN EXISTS (SELECT 1 FROM connections 
    WHERE user_id = user1 AND connection_id = user2 AND status = 'accepted');
END; $$;

CREATE POLICY "safe_policy" ON profiles
  FOR SELECT USING (id = auth.uid() OR check_connection(auth.uid(), id));
```

### DANGEROUS EXAMPLE:
```sql  
-- ❌ DANGEROUS: Infinite recursion
CREATE POLICY "bad_policy" ON profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = profiles.user_id));
```

### MANDATORY TEST:
```javascript
const anonClient = createClient(url, anonKey);
const { error } = await anonClient.from('table').select('*').limit(1);
if (!error?.message?.includes('permission denied')) {
  throw new Error('SECURITY FAILURE: Anonymous access not restricted');
}
```
