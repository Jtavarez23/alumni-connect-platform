import { supabase } from '@/integrations/supabase/client';

export function useSupabase() {
  return { supabase };
}