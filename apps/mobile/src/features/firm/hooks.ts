import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/** Read path (CLAUDE.md): plain reads go straight through supabase-js + RLS. */
export function useMyFirm() {
  return useQuery({
    queryKey: ['firm', 'mine'],
    queryFn: async () => {
      const { data, error } = await supabase.from('firms').select('id, name, plan').maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
