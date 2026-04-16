// Supabase generated types placeholder.
//
// After running `supabase/schema.sql` against your project you can regenerate
// an accurate version of this file with the Supabase CLI:
//
//   supabase gen types typescript --project-id <your-ref> \
//     --schema public > src/lib/supabase/types.ts
//
// Until then we keep a permissive typing so the app compiles without a
// connected DB.
export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
